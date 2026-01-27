# DECISION LOG: GitHub as Source of Truth (SoT)

Este documento registra la decisión de Nelson sobre cómo blindar el repositorio de GitHub como la única fuente de verdad.

| Decisión SoT | Owner | Fecha | Riesgos | Evidencia |
| :--- | :--- | :--- | :--- | :--- |
| **A) Nuevo Repo** (Limpieza total) | Nelson | | Reconfigurar remotos | |
| **B) Cambio Default Branch** | Nelson | | Historial 'sucio' | |
| **C) Mantener actual** | Nelson | | Confusión de ramas | |

## Instrucciones para Nelson

1. Revisa el estado actual ejecutando `.\scripts\github_make_sot.ps1`.
2. Marca con una `[x]` la opción elegida arriba.
3. Asegúrate de que la rama `chore/rei-handover-docs` esté integrada o sea la base.
