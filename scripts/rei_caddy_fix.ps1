<#
.SYNOPSIS
    Diagnoses and fixes rei.orquix.com Caddy configuration or permissions.
    
.DESCRIPTION
    1. Diagnostics: Checks file ownership, permissions, and Caddy process user.
    2. Fix A: Resets permissions if read access fails.
    3. Fix B: Injects correct /_next/* handling in Caddyfile if routing is the issue.
    4. Verification: Performs smoke tests on static assets.

.usage
    .\scripts\rei_caddy_fix.ps1
#>

$Server = "root@rei.orquix.com"
$CaddyFile = "/etc/caddy/Caddyfile"
$LogFile = "caddy_fix.log"

function Remote-Exec {
    param($Cmd, $Description)
    Write-Host "`n[REMOTE] $Description" -ForegroundColor Cyan
    ssh $Server $Cmd
}

# ==========================================
# 1. DIAGNOSTICS
# ==========================================
Write-Host "=== STEP 1: DIAGNOSTICS ===" -ForegroundColor Yellow

# A. File Stats
Remote-Exec -Description "Checking File Stats..." -Cmd 'stat -c "%A %U:%G %n" /var/www/rei/current/_next/static/media/797e433ab948586e-s.p.dbea232f.woff2'

# B. Process User
Remote-Exec -Description "Identifying Caddy User..." -Cmd 'ps -o user=,group=,pid=,cmd= -C caddy'

# C. Read Test
Write-Host "`n[TEST] Checking Read Access..."
$ReadCheck = ssh $Server 'sudo -u www-data head -c 4 /var/www/rei/current/_next/static/media/797e433ab948586e-s.p.dbea232f.woff2 >/dev/null 2>&1 && echo "OK" || echo "FAIL"'
if ($ReadCheck -match "OK") {
    Write-Host "Read Access: OK (as www-data)" -ForegroundColor Green
    $PermsIssue = $false
}
else {
    Write-Host "Read Access: FAIL (as www-data)" -ForegroundColor Red
    $PermsIssue = $true
}

# D. Show Config Block
Remote-Exec -Description "Current Caddy Block (First 5 lines of rei.orquix.com)..." -Cmd "sed -n '/rei.orquix.com/,/}/p' $CaddyFile | head -n 10"

# ==========================================
# 2. DECISION & FIX
# ==========================================
Write-Host "`n=== STEP 2: FIX APPLICATION ===" -ForegroundColor Yellow

if ($PermsIssue) {
    # --- FIX A: PERMISSIONS ---
    Write-Host "DETECTED: Permission Issue. Applying Fix A..." -ForegroundColor Magenta
    $CmdFixA = 'chown -R www-data:www-data /var/www/rei/current; find /var/www/rei/current -type d -exec chmod 755 {} \;; find /var/www/rei/current -type f -exec chmod 644 {} \;'
    Remote-Exec -Description "Fixing Ownership & Permissions..." -Cmd $CmdFixA
    Remote-Exec -Description "Reloading Caddy..." -Cmd 'systemctl reload caddy'
}
else {
    # --- FIX B: ROUTING ---
    Write-Host "DETECTED: Routing Issue (Read OK but falling back to HTML). Applying Fix B..." -ForegroundColor Magenta
    
    # 1. Backup
    $BackupCmd = "cp $CaddyFile $CaddyFile.bak-rei-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Remote-Exec -Description "Backing up Caddyfile..." -Cmd $BackupCmd
    
    # 2. Inject Configuration (Insert 'handle /_next/*' after 'rei.orquix.com {')
    # sed logic: /rei.orquix.com {/ a \ <block>
    # We use a temp file approach for safety usually, but asking sed to insert text is okay if careful.
    # The block below is escaped for PowerShell string and sed.
    
    $InjectBlock = '
  handle /_next/* {
    root * /var/www/rei/current
    file_server
  }
'
    # Use perl for easier multiline searching/replacing if sed is too complex, 
    # OR simple sed insertion after the server block definition.
    # We assume standard formatting "rei.orquix.com {"
    
    $SedCmd = "sed -i '/rei.orquix.com {/a \ $InjectBlock' $CaddyFile"
    
    Remote-Exec -Description "Injecting /_next/* handle block..." -Cmd $SedCmd
    
    # 3. Validation
    Remote-Exec -Description "Validating Config..." -Cmd 'caddy validate --config /etc/caddy/Caddyfile'
    
    if ($LASTEXITCODE -eq 0) {
        Remote-Exec -Description "Reloading Caddy..." -Cmd 'systemctl reload caddy'
    }
    else {
        Write-Host "Config Validation FAILED! Rolling back..." -ForegroundColor Red
        Remote-Exec -Description "Restoring Backup..." -Cmd "cp $CaddyFile.bak-rei-* $CaddyFile && systemctl reload caddy"
        exit 1
    }
}

# ==========================================
# 3. SMOKE TEST
# ==========================================
Write-Host "`n=== STEP 3: SMOKE TEST ===" -ForegroundColor Yellow
Start-Sleep -Seconds 2
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$AssetUrl = "https://rei.orquix.com/_next/static/media/797e433ab948586e-s.p.dbea232f.woff2?t=$ts"

Write-Host "Checking Asset: $AssetUrl"
try {
    $resp = Invoke-WebRequest $AssetUrl -Method Head -UseBasicParsing -SkipHttpErrorCheck
    $ct = $resp.Headers["Content-Type"]
    $len = $resp.Headers["Content-Length"]
    
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Type:   $ct"
    Write-Host "Size:   $len"
    
    if ($resp.StatusCode -eq 200 -and $ct -notmatch "text/html" -and [int]$len -gt 10000) {
        Write-Host "PASS: Asset served correctly." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Asset is HTML, 404, or too small." -ForegroundColor Red
    }
}
catch {
    Write-Host "Error during request: $_" -ForegroundColor Red
}

Write-Host "`nDone."
