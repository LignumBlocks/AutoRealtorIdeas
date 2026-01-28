<#
.SYNOPSIS
    Forces injection of the Caddy static 404 block.
    
.DESCRIPTION
    1. Backs up Caddyfile.
    2. Inserts 'handle /_next/static/* { ... }' immediately after 'rei.orquix.com {'.
    3. Validates and Reloads.
    4. Verifies 404 behavior.

.USAGE
    .\scripts\force_caddy_static_404.ps1
#>

$Server = "root@rei.orquix.com"
$CaddyFile = "/etc/caddy/Caddyfile"
$CaddyBackup = "/etc/caddy/Caddyfile.bak-force-404-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Helper for explicit bash execution
function Remote-Bash {
    param($Description, $ScriptBlock)
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    $EscapedScript = $ScriptBlock -replace "'", "'\''"
    ssh $Server "bash -lc '$EscapedScript'"
}

Write-Host "=== FORCE CADDY STATIC 404 ===" -ForegroundColor Yellow

# 1. Backup
Remote-Bash "Backing up Caddyfile" "cp $CaddyFile $CaddyBackup"

# 2. Patch
# We insert after "rei.orquix.com {"
# We use sed to append (a) after the line matching "rei.orquix.com {".
Write-Host "`n[Patching Caddyfile]..."
$Block = '
  handle /_next/static/* {
    root * /var/www/rei/current
    try_files {path} =404
    file_server
  }
'
# Escape newlines for sed
$SedBlock = $Block -replace "`r`n", "\`n" -replace "`n", "\`n"

# Verify match exists first
Remote-Bash "Checking Site Block Existence" "grep 'rei.orquix.com {' $CaddyFile"

$PatchScript = @"
    if grep -q "handle /_next/static/\*" $CaddyFile; then
        echo "Safety: Block already seems to be present. Skipping injection."
    else
        echo "Injecting block after site definition..."
        # Use sed to append the block after the line containing 'rei.orquix.com {'
        # We assume standard formatting.
        sed -i '/rei.orquix.com {/a \ $SedBlock' $CaddyFile
        
        echo "Formatting..."
        caddy fmt --overwrite $CaddyFile
    fi
"@
Remote-Bash "Applying Patch" $PatchScript

# 3. Reload
Remote-Bash "Validating" "caddy validate --config $CaddyFile"
if ($LASTEXITCODE -eq 0) {
    Remote-Bash "Reloading" "systemctl reload caddy"
    Write-Host "Caddy Reloaded." -ForegroundColor Green
    Remote-Bash "Verifying Block" "grep -A 5 'handle /_next/static' $CaddyFile"
}
else {
    Write-Host "Validation Failed! Reverting..." -ForegroundColor Red
    Remote-Bash "Reverting" "cp $CaddyBackup $CaddyFile && systemctl reload caddy"
    exit 1
}

# 4. Verification Check
Write-Host "`n[Verification] Hard 404 Check..." -ForegroundColor Yellow
try {
    $R404 = Invoke-WebRequest -Uri "https://rei.orquix.com/_next/static/chunks/THIS_SHOULD_404.js" -Method Head -SkipHttpErrorCheck
    if ($R404.StatusCode -eq 404) {
        Write-Host "SUCCESS: Got 404 Not Found." -ForegroundColor Green
    }
    else {
        Write-Host "FAILURE: Got $($R404.StatusCode) (Expected 404)" -ForegroundColor Red
    }
}
catch {
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::NotFound) {
        Write-Host "SUCCESS: Got 404 Not Found." -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}
