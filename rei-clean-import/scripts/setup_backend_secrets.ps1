<#
.SYNOPSIS
    Interactively sets up backend secrets on rei.orquix.com.
    
.DESCRIPTION
    1. Prompts user for Service Account JSON path.
    2. Prompts for Environment Variables (Admin Email, API Keys).
    3. Uploads Service Account to /opt/rei-api/service-account.json.
    4. Creates and uploads /etc/rei/rei.env.
    5. Restarts rei-api service.

.USAGE
    .\scripts\setup_backend_secrets.ps1
#>

$Server = "root@rei.orquix.com"
$RemoteAppDir = "/opt/rei-api"
$RemoteEnvFile = "/etc/rei/rei.env"

Write-Host "=== SETUP BACKEND SECRETS ===" -ForegroundColor Cyan
Write-Host "This script will upload your secrets to $Server."
Write-Host "Press Ctrl+C to cancel at any time.`n"

# 1. Service Account
$ServiceAccountPath = Read-Host "Path to local service-account.json (Enter to skip if already on server)"
$UploadSA = $false

if (![string]::IsNullOrWhiteSpace($ServiceAccountPath)) {
    if (Test-Path $ServiceAccountPath) {
        $UploadSA = $true
    }
    else {
        Write-Host "Error: File not found: $ServiceAccountPath" -ForegroundColor Red
        exit 1
    }
}

# 2. Environment Variables
Write-Host "`nEnter Environment Variables (Leave empty to keep existing/skip):"

$AdminEmail = Read-Host "ADMIN_EMAIL"
$GeminiKey = Read-Host "GEMINI_API_KEY"
$TavilyKey = Read-Host "TAVILY_API_KEY"
$GoogleKey = Read-Host "GOOGLE_API_KEY"
# Google App Creds usually points to the file we upload
$GoogleAppCreds = "/opt/rei-api/service-account.json" 

# 3. Confirmation
Write-Host "`nReady to upload to $Server..."
Write-Host "Service Account: $(if($UploadSA){"Update from $ServiceAccountPath"}else{"Skip"})"
Write-Host "Keys to Update: $(if($AdminEmail){"ADMIN_EMAIL "})$(if($GeminiKey){"GEMINI_KEY "})$(if($TavilyKey){"TAVILY_KEY "})"

Pause

# 4. Upload Service Account
if ($UploadSA) {
    Write-Host "`n[1/3] Uploading Service Account..."
    scp $ServiceAccountPath "${Server}:$RemoteAppDir/service-account.json"
    ssh $Server "chmod 600 $RemoteAppDir/service-account.json && chown rei-api:rei-api $RemoteAppDir/service-account.json"
}

# 5. Update .env file
Write-Host "`n[2/3] Updating Environment File..."

# We read existing file first to not wipe it if we are partial check?
# Or we just append/overwrite? Systemd Env files are simple Key=Val.
# Let's verify if file exists first.

$CheckEnv = ssh $Server "cat $RemoteEnvFile" 2>$null

# Helper to Update or Append
function Update-EnvVar ($Block, $Key, $Val) {
    if ([string]::IsNullOrWhiteSpace($Val)) { return $Block }
    
    # Simple regex replace if key exists, else append
    if ($Block -match "(?m)^$Key=.*") {
        return $Block -replace "(?m)^$Key=.*", "$Key=$Val"
    }
    else {
        return "$Block`n$Key=$Val"
    }
}

$NewEnv = $CheckEnv
if ($null -eq $NewEnv) { $NewEnv = "" }

$NewEnv = Update-EnvVar $NewEnv "ADMIN_EMAIL" $AdminEmail
$NewEnv = Update-EnvVar $NewEnv "GEMINI_API_KEY" $GeminiKey
$NewEnv = Update-EnvVar $NewEnv "TAVILY_API_KEY" $TavilyKey
$NewEnv = Update-EnvVar $NewEnv "GOOGLE_API_KEY" $GoogleKey
$NewEnv = Update-EnvVar $NewEnv "GOOGLE_APPLICATION_CREDENTIALS" $GoogleAppCreds
$NewEnv = Update-EnvVar $NewEnv "PORT" "8094" # Ensure port is set

# Write to temp file locally then upload
$TempEnv = [System.IO.Path]::GetTempFileName()
Set-Content -Path $TempEnv -Value $NewEnv -NoNewline

scp $TempEnv "${Server}:$RemoteEnvFile"
ssh $Server "chmod 600 $RemoteEnvFile"

Remove-Item $TempEnv

# 6. Restart Service
Write-Host "`n[3/3] Restarting Service..."
ssh $Server "systemctl restart rei-api && systemctl status rei-api --no-pager"

Write-Host "`nDone."
