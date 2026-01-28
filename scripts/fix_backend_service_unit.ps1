<#
.SYNOPSIS
    Fixes the rei-api systemd service unit to ensure EnvironmentFile is loaded.
    
.DESCRIPTION
    1. Checks /etc/systemd/system/rei-api.service for EnvironmentFile directive.
    2. If missing, inserts it under [Service].
    3. Reloads daemon and restarts service.
    4. Verifies Environment variable visibility.
    5. Runs curl smoke test against API.

.USAGE
    .\scripts\fix_backend_service_unit.ps1
#>

$Server = "root@rei.orquix.com"
$UnitFile = "/etc/systemd/system/rei-api.service"
$EnvFile = "/etc/rei/rei.env"
$Backup = "/etc/systemd/system/rei-api.service.bak-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Helper for explicit bash execution
function Invoke-RemoteBash {
    param($Description, $ScriptBlock)
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    $EscapedScript = $ScriptBlock -replace "'", "'\''"
    ssh $Server "bash -lc '$EscapedScript'"
}

Write-Host "=== FIX BACKEND SERVICE UNIT ===" -ForegroundColor Yellow

# 1. Inspect and Backup
Invoke-RemoteBash "Backing up Service Unit" "cp $UnitFile $Backup"

# 2. Patch Logic
$PatchScript = @"
    if grep -q "EnvironmentFile=$EnvFile" $UnitFile; then
        echo "Check: EnvironmentFile directive already present."
    else
        echo "Patching: Inserting EnvironmentFile directive..."
        # Insert after [Service]
        sed -i '/\[Service\]/a EnvironmentFile=$EnvFile' $UnitFile
        echo "Patch Applied."
    fi
    
    echo "--- Current File Content ---"
    cat $UnitFile
"@
Invoke-RemoteBash "checking/Patching Unit File" $PatchScript

# 3. Reload and Restart
Invoke-RemoteBash "Reloading Daemon & Restarting Service" "systemctl daemon-reload && systemctl restart rei-api"

# 4. Evidence: Systemctl Environment
Write-Host "`n[Evidence 1] Checking Systemd Environment..." -ForegroundColor Yellow
Invoke-RemoteBash "Show Environment" "systemctl show rei-api --property=Environment | grep GEMINI || echo 'GEMINI VAR NOT FOUND IN SYSTEMCTL'"

# 5. Evidence: API Curl
Write-Host "`n[Evidence 2] Checking API Response..." -ForegroundColor Yellow
$CurlScript = '
    curl -s https://rei.orquix.com/api/gemini/chat \
     -H "Content-Type: application/json" \
     -d "{\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}"
'
Invoke-RemoteBash "API Request" $CurlScript

Write-Host "`nDone."
