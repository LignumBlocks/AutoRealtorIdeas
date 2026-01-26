# Auto Realtor Ideas - One-Click Launcher
# Run this to start the app. Do not close the new Black Window that appears!

Write-Host "🚀 Initializing Auto Realtor Ideas System..." -ForegroundColor Cyan

# 1. Kill Port 3000 (Robust Cleanup)
$port = 3000
Try {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    Write-Host "⚠️  Port $port in use. Terminating old process..." -ForegroundColor Yellow
    foreach ($proc in $tcp) {
        Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} Catch {
    Write-Host "✅ Port $port is free." -ForegroundColor Green
}

# 2. Check for node_modules (Fast Fail)
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies first (this happens once)..." -ForegroundColor Magenta
    npm install
}

# 3. Start Next.js in a NEW, PERSISTENT window
# /k keeps the window open so the user sees errors if it crashes.
Write-Host "🔌 Launching Server in new window..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k title Auto Realtor Server (DO NOT CLOSE) & npm run dev" -WindowStyle Normal

# 4. Wait for Server (Smart Wait)
Write-Host "⏳ Waiting for server API..." -NoNewline
$retries = 0
$maxRetries = 20
$url = "http://localhost:3000/api/status" # Or just root

while ($retries -lt $maxRetries) {
    Try {
        $req = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -ErrorAction Stop
        if ($req.StatusCode -eq 200) {
            Write-Host " OK!" -ForegroundColor Green
            break
        }
    } Catch {
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
        $retries++
    }
}

if ($retries -ge $maxRetries) {
    Write-Host "`n❌ Server taking too long. Opening anyway, but check the Black Window for errors." -ForegroundColor Red
}

# 5. Open Browser
Write-Host "🌐 Opening Library..." -ForegroundColor Cyan
Start-Process "http://localhost:3000/library"

Write-Host "`n✅ SYSTEM RUNNING." -ForegroundColor Green
Write-Host "👉 KEEP 'Auto Realtor Server' WINDOW OPEN." -ForegroundColor Yellow
Write-Host "👉 Press Enter to exit this launcher (Server will stay running)..."
Read-Host
