<#
.SYNOPSIS
    Diagnoses the Backend API (rei-api) configuration and secrets.

.DESCRIPTION
    1. Inspects systemd service to find WorkingDirectory.
    2. Checks for existence of .env and service-account.json.
    3. Greps for expected Environment Variables in the .env file (safe check, no values).

.USAGE
    .\scripts\diagnose_backend.ps1
#>

$Server = "root@rei.orquix.com"

function Remote-Exec {
    param($Description, $Cmd)
    Write-Host "`n[$Description]" -ForegroundColor Cyan
    ssh $Server $Cmd
}

Write-Host "=== REI API DIAGNOSTICS ===" -ForegroundColor Yellow

# 1. Get Service Details
Remote-Exec "Service Definition" "systemctl cat rei-api | grep -E 'WorkingDirectory|Environment|ExecStart'"

# 2. Extract Working Directory and Check Files
# We rely on the user visually parsing the above, or we try to extract it remotely.
# Let's perform a smart remote check assuming a common path or just finding the env.
# But better to just ask systemd via 'show'.

Write-Host "`n[Resolving Paths]..."
$Script = '
    WD=$(systemctl show -p WorkingDirectory rei-api | cut -d= -f2)
    echo "Working Directory: $WD"
    
    if [ -z "$WD" ]; then
        echo "ERROR: Could not find WorkingDirectory."
        exit 1
    fi

    echo "Listing Secret Files in $WD:"
    ls -la "$WD/.env" "$WD/google-service-account.json" "$WD/service-account.json" 2>/dev/null || echo "Files not found or partial matches."
    
    if [ -f "$WD/.env" ]; then
        echo ""
        echo "Checking variables in .env:"
        grep -E "^(ADMIN_EMAIL|GOOGLE_|GEMINI_|TAVILY_)" "$WD/.env" | cut -d= -f1
    else
        echo "MISSING: .env file does not exist."
    fi
'

Remote-Exec "Checking Secrets on Server" $Script

Write-Host "`nDone."
