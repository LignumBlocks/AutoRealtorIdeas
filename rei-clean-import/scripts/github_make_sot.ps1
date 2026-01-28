# GitHub SoT Helper - AutoRealtorIdeas
# Proposito: Facilitar a Nelson la transicion a GitHub como Source of Truth REAL.

$REPO_NAME = "AutoRealtorIdeas"
$ORG_OR_USER = "LignumBlocks" # Basado en git remote -v
$MAIN_BRANCH = "main"

Write-Host "--- ESTADO ACTUAL ---" -ForegroundColor Cyan
git remote -v
git branch --show-current
git log -1 --oneline

Write-Host "`n--- OPCIONES PARA SOURCE OF TRUTH (SoT) ---" -ForegroundColor Yellow

# URL para crear un repo nuevo si se desea empezar limpio
$CREATE_REPO_URL = "https://github.com/new"
# URL para cambiar la rama por defecto en el repo actual
$SETTINGS_BRANCHES_URL = "https://github.com/$ORG_OR_USER/$REPO_NAME/settings/branches"

Write-Host "Opción A: Crear repo nuevo desde cero."
Write-Host "URL: $CREATE_REPO_URL"
Write-Host "Opción B: Cambiar rama default en repo existente."
Write-Host "URL: $SETTINGS_BRANCHES_URL"

# Abrir URLs automáticamente
Start-Process $CREATE_REPO_URL
Start-Process $SETTINGS_BRANCHES_URL

if ($env:GITHUB_TOKEN) {
    Write-Host "`n[DETECTADO] GITHUB_TOKEN presente. Se podria automatizar via API si se desea." -ForegroundColor Green
    # Nota: No imprimimos el token por seguridad.
} else {
    Write-Host "`n[INFO] GITHUB_TOKEN no detectado. Usa las URLs anteriores para ajustes manuales." -ForegroundColor Gray
}

Write-Host "`n--- NEXT ACTIONS ---" -ForegroundColor Magenta
Write-Host "1. Elige tu estrategia en /docs/DECISION_LOG.md"
Write-Host "2. Asegúrate de que la rama 'chore/rei-handover-docs' sea el nuevo SoT."
Write-Host "3. Listo!"
