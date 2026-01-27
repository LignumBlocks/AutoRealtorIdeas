<#
.SYNOPSIS
    Fixes Production Issues with robust verification (v3).
    
.DESCRIPTION
    1. Dynamic CSS Check: Finds CSS URL from homepage and checks file on disk.
    2. Caddy Hardening: Enforces 404 for /_next/static/* (Safe Patch + Fmt).
    3. Backend Fix: Restarts API.
    4. Auto-Verification: JSON POST Smoke Test (200/401/403=PASS).

.USAGE
    .\scripts\fix_production_issues.ps1
#>

$Server = "root@rei.orquix.com"
$CaddyFile = "/etc/caddy/Caddyfile"
$CaddyBackup = "/etc/caddy/Caddyfile.bak-fix-404-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Helper for explicit bash execution
function Remote-Bash {
    param($Description, $ScriptBlock)
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    
    # Escape single quotes for bash -lc '...' wrapper
    $EscapedScript = $ScriptBlock -replace "'", "'\''"
    $RemoteCmd = "bash -lc '$EscapedScript'"
    
    ssh $Server $RemoteCmd
}

Write-Host "=== PRODUCTION FIXER V3 (Safe) ===" -ForegroundColor Yellow

# 1. Dynamic Asset Check (Server-Side)
Write-Host "`n[1] Diagnostic: Checking Real CSS on Server..."
$AssetCheckScript = @'
    # Extract CSS path from homepage
    CSS=$(curl -s https://rei.orquix.com/ | grep -oE "/_next/static/[^\"]+\.css" | head -n 1)
    
    if [ -z "$CSS" ]; then
        echo "WARNING: No CSS file found in homepage HTML."
    else
        echo "Found Referenced CSS: $CSS"
        FILEPath="/var/www/rei/current$CSS"
        if [ -f "$FILEPath" ]; then
            echo "DISK CHECK: FOUND (OK)"
        else
            echo "DISK CHECK: MISSING (Fix Required: Re-deploy)"
        fi
    fi
'@
Remote-Bash "Verifying Asset on Disk" $AssetCheckScript

# 2. Fix Caddy Configuration (Specific Static Handle)
Write-Host "`n[2] Fixing Caddy Configuration..."

# Backup
Remote-Bash "Backing up Caddyfile" "cp $CaddyFile $CaddyBackup"

# Logic: Validate EXACTLY 1 match before patching
$CaddyPatchScript = @'
    MATCH_COUNT=$(grep -c "handle /_next/\* {" /etc/caddy/Caddyfile)
    STATIC_CHECK=$(grep -c "handle /_next/static/\* {" /etc/caddy/Caddyfile)

    if [ "$STATIC_CHECK" -gt 0 ]; then
        echo "Safety Check: Block /_next/static/* already exists. Skipping patch."
    elif [ "$MATCH_COUNT" -ne 1 ]; then
        echo "ABORT: Found $MATCH_COUNT matches for 'handle /_next/* {'. Expected exactly 1."
        echo "--- Context ---"
        grep -n "handle /_next" /etc/caddy/Caddyfile | head -n 20
        exit 1
    else
        echo "Safety Check: PASSED (1 Match). Injecting handler..."
        # Insert before 'handle /_next/*'
        sed -i '/handle \/_next\/\* {/i \  handle /_next/static/* {\n    root * /var/www/rei/current\n    try_files {path} =404\n    file_server\n  }\n' /etc/caddy/Caddyfile
        
        echo "Formatting Caddyfile..."
        caddy fmt --overwrite /etc/caddy/Caddyfile
    fi
'@
Remote-Bash "Patching Caddyfile" $CaddyPatchScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "Patch/Validation Logic Failed. Aborting." -ForegroundColor Red
    exit 1
}

# Validate & Reload
Remote-Bash "Validating Config" "caddy validate --config $CaddyFile"
if ($LASTEXITCODE -eq 0) {
    Remote-Bash "Reloading Caddy" "systemctl reload caddy"
    Write-Host "Caddy Reloaded." -ForegroundColor Green
    Remote-Bash "Verifying Config Block" "grep -A 5 'handle /_next/static' $CaddyFile"
}
else {
    Write-Host "Validation Failed! Rolling back..." -ForegroundColor Red
    Remote-Bash "Reverting" "cp $CaddyBackup $CaddyFile && systemctl reload caddy"
    exit 1
}

# 3. Fix Backend
Write-Host "`n[3] Restarting Backend API..."
Remote-Bash "Restarting rei-api" "systemctl restart rei-api"

# 4. SMOKE TESTS (Local)
Write-Host "`n[4] Running Automated Verification..." -ForegroundColor Yellow
$Pass = $true

# A) Hard 404
Write-Host "Test A: Hard 404 on Missing JS..." -NoNewline
try {
    $R404 = Invoke-WebRequest -Uri "https://rei.orquix.com/_next/static/chunks/THIS_SHOULD_404.js" -Method Head -SkipHttpErrorCheck
    if ($R404.StatusCode -eq 404) {
        Write-Host " PASS (404 Not Found)" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL (Got $($R404.StatusCode))" -ForegroundColor Red
        $Pass = $false
    }
}
catch {
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::NotFound) {
        Write-Host " PASS (404 Not Found)" -ForegroundColor Green
    }
    else {
        Write-Host " ERROR: $_" -ForegroundColor Red; $Pass = $false
    }
}

# B) Real CSS (Dynamic FIND)
$CssUrlRemote = ssh $Server 'curl -s https://rei.orquix.com/ | grep -oE "/_next/static/[^\"]+\.css" | head -n 1'
if ($CssUrlRemote) {
    Write-Host "Test B: Real CSS ($CssUrlRemote)..." -NoNewline
    try {
        $RCss = Invoke-WebRequest -Uri "https://rei.orquix.com$CssUrlRemote" -Method Head
        $CT = $RCss.Headers["Content-Type"]
        if ($RCss.StatusCode -eq 200 -and $CT -match "text/css") {
            Write-Host " PASS ($CT)" -ForegroundColor Green
        }
        else {
            Write-Host " FAIL ($CT)" -ForegroundColor Red
            $Pass = $false
        }
    }
    catch { Write-Host " ERROR: $_" -ForegroundColor Red; $Pass = $false }
}
else {
    Write-Host "Test B: SKIPPED (No CSS found)" -ForegroundColor Yellow
}

# C) API Health
Write-Host "Test C: API Health..." -NoNewline
try {
    $RApi = Invoke-WebRequest -Uri "https://rei.orquix.com/api/healthz" -Method Head
    if ($RApi.StatusCode -eq 200) {
        Write-Host " PASS (200 OK)" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL ($($RApi.StatusCode))" -ForegroundColor Red; $Pass = $false
    }
}
catch { Write-Host " ERROR: $_" -ForegroundColor Red; $Pass = $false }

# D) API Chat (Real Smoke Test)
Write-Host "Test D: API Chat (POST JSON)..." -NoNewline
try {
    # Tiny valid JSON body
    $Body = '{"messages": [{"role":"user","content":"ping"}]}'
    $RChat = Invoke-WebRequest -Uri "https://rei.orquix.com/api/gemini/chat" -Method Post -Body $Body -ContentType "application/json" -SkipHttpErrorCheck
    
    if ($RChat.StatusCode -eq 502) {
        Write-Host " FAIL (502 Bad Gateway)" -ForegroundColor Red
        $Pass = $false
        # Dump logs
        Write-Host "`n[DIAGNOSTICS] Backend Logs:" -ForegroundColor Magenta
        Remote-Bash "Service Status" "systemctl status rei-api --no-pager"
        Remote-Bash "Recent Logs" "journalctl -u rei-api -n 20 --no-pager"
    }
    elseif ($RChat.StatusCode -eq 401 -or $RChat.StatusCode -eq 403 -or $RChat.StatusCode -eq 200) {
        Write-Host " PASS (Got expected code $($RChat.StatusCode))" -ForegroundColor Green
    }
    else {
        Write-Host " WARNING (Got $($RChat.StatusCode))" -ForegroundColor Yellow
    }
}
catch { Write-Host " ERROR: $_" -ForegroundColor Red; $Pass = $false }

Write-Host "`nStart Verification Complete."
