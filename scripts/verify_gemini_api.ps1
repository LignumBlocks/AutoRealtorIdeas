<#
.SYNOPSIS
    Verifies that the Gemini API is configured correctly.
    
.DESCRIPTION
    Runs a curl command to POST a ping message to /api/gemini/chat.
    Check for 200, 401, or 403.
    If 502, it failed.

.USAGE
    .\scripts\verify_gemini_api.ps1
#>

Write-Host "Running Gemini API Verification..." -ForegroundColor Cyan

$Cmd = 'curl -i https://rei.orquix.com/api/gemini/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}"'

Write-Host "Command: $Cmd`n" -ForegroundColor Gray

Invoke-Expression $Cmd
