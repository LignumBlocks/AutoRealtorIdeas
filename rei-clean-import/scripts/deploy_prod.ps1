<#
.SYNOPSIS
    Compila y despliega la aplicación Next.js a producción (rei.orquix.com).
    
.DESCRIPTION
    1. Ejecuta build local (npm run build).
    2. Sube el contenido de out/ (o dist/) a /var/www/rei/releases/<timestamp>.
    3. Asegura permisos www-data:www-data.
    4. Actualiza el symlink /var/www/rei/current.
    5. Recarga Caddy y verifica health endpoints + assets estáticos.

.EXAMPLE
    .\scripts\deploy_prod.ps1 -ServerUser "root" -ServerIP "rei.orquix.com"
#>

param(
  [string]$ServerUser = "root",
  [string]$ServerIP = "rei.orquix.com",
  [string]$IdentityFile = "" # Optional: Path to private key
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "`n[DEPLOY] $Message" -ForegroundColor Cyan
}

function Write-Success {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-ErrorExit {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

# 1. Validation & Build
Write-Step "1. Iniciando Build Local..."

# Check npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-ErrorExit "npm no encontrado."
}

# Clean Install & Build
Write-Host "Ejecutando npm ci..."
npm ci
if ($LASTEXITCODE -ne 0) { Write-ErrorExit "npm ci falló." }

Write-Host "Ejecutando npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-ErrorExit "npm run build falló." }

# Verify Output
if (Test-Path "out\index.html") {
  $OutputFolder = "out"
  Write-Success "Build correcto. Output en out/ (Prioridad 1: Static Export)"
}
elseif (Test-Path "dist\index.html") {
  $OutputFolder = "dist"
  Write-Warning "Build correcto pero en dist/ (Legacy/Fallback)"
}
else {
  Write-ErrorExit "No se encontró out\index.html ni dist\index.html después del build."
}

# 2. Prepare Remote Release
Write-Step "2. Preparando Release Remoto..."
$Timestamp = Get-Date -Format "yyyyMMddHHmmss"
$ReleasePath = "/var/www/rei/releases/$Timestamp"
$CurrentLink = "/var/www/rei/current"

$SshArgs = @("$ServerUser@$ServerIP")
if (![string]::IsNullOrEmpty($IdentityFile)) {
  $SshArgs = @("-i", $IdentityFile) + $SshArgs
}

# Create directory
Write-Host "Creando directorio: $ReleasePath"
ssh @SshArgs "mkdir -p $ReleasePath"
if ($LASTEXITCODE -ne 0) { Write-ErrorExit "Fallo al crear directorio remoto." }

# 3. Upload
Write-Step "3. Subiendo Archivos desde $OutputFolder..."
if (![string]::IsNullOrEmpty($IdentityFile)) {
  scp -r -i $IdentityFile "$OutputFolder/." "$ServerUser@$ServerIP`:$ReleasePath"
}
else {
  scp -r "$OutputFolder/." "$ServerUser@$ServerIP`:$ReleasePath"
}

if ($LASTEXITCODE -ne 0) { Write-ErrorExit "Fallo en SCP." }
Write-Success "Archivos subidos."

# 3.5 Permissions (Legacy Fix: Ensure Caddy/www-data can read)
Write-Step "3.5. Ajustando Permisos (www-data)..."
# Set owner to www-data, dirs to 755, files to 644
$PermCmd = "chown -R www-data:www-data $ReleasePath && find $ReleasePath -type d -exec chmod 755 {} + && find $ReleasePath -type f -exec chmod 644 {} +"
ssh @SshArgs $PermCmd
if ($LASTEXITCODE -ne 0) { Write-ErrorExit "Fallo al ajustar permisos remotos." }
Write-Success "Permisos corregidos."

# 4. Activate Release
Write-Step "4. Activando Release (Symlink)..."
$Commands = "ln -sfn $ReleasePath $CurrentLink && systemctl reload caddy"
ssh @SshArgs $Commands
if ($LASTEXITCODE -ne 0) { Write-ErrorExit "Fallo al actualizar symlink o recargar Caddy." }
Write-Success "Release activado."

# 5. Verification
Write-Step "5. Verificando Despliegue (Smoke Tests)..."
Start-Sleep -Seconds 2

# Check Frontend Home
try {
  $Resp = Invoke-WebRequest -Uri "https://rei.orquix.com/" -Method Head
  if ($Resp.StatusCode -eq 200) {
    Write-Success "Frontend (/) -> 200 OK"
  }
  else {
    Write-Warning "Frontend devolvió: $($Resp.StatusCode)"
  }
}
catch {
  Write-Warning "Fallo al conectar con Frontend: $_"
}

# Check Static Asset (to ensure no HTML fallback/403)
# Reference a known asset from the build or just a general check if we knew one.
# Since names change with build, we'll try a generic known one or just skip specific asset check if unknown.
# But user requested woff2 check. We'll use the one we know:
$KnownAsset = "_next/static/media/797e433ab948586e-s.p.dbea232f.woff2"
try {
  $Ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $AssetUrl = "https://rei.orquix.com/$KnownAsset?t=$Ts"
  $RespAsset = Invoke-WebRequest -Uri $AssetUrl -Method Head -SkipHttpErrorCheck
  $CT = $RespAsset.Headers["Content-Type"]
    
  if ($RespAsset.StatusCode -eq 200 -and $CT -notmatch "text/html") {
    Write-Success "Asset Check ($KnownAsset) -> 200 OK & Type: $CT"
  }
  else {
    Write-Warning "Asset Check FAILURE: Status $($RespAsset.StatusCode) | Type: $CT"
  }
}
catch {
  Write-Warning "No se pudo verificar Asset específico: $_"
}

# Check Backend Health
try {
  $RespApi = Invoke-WebRequest -Uri "https://rei.orquix.com/api/healthz" -Method Get
  if ($RespApi.StatusCode -eq 200) {
    Write-Success "API (/api/healthz) -> 200 OK"
  }
  else {
    Write-Warning "API devolvió: $($RespApi.StatusCode)"
  }
}
catch {
  Write-Warning "Fallo al conectar con API: $_"
}

Write-Host "`n[DEPLOY COMPLETO] Versión $Timestamp desplegada." -ForegroundColor Green
Write-Host "Para Rollback, revisa docs/RUNBOOK_MINIMO.md" -ForegroundColor Gray
