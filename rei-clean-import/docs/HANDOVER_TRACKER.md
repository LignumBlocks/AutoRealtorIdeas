# Handover Tracker - Orquix REI

Este documento es para uso interno del equipo receptor (Nelson/SREs) para rastrear el estado de cada respuesta y evidencia.

**Leyenda de Estado:**

* 🔵 **Pending:** Enviado, esperando respuesta.
* 🟡 **Answered:** Recibido, pendiente de validar.
* 🟢 **Evidence OK:** Respuesta validada con evidencia real.
* 🔴 **Needs Follow-up:** Respuesta incompleta, ambigua o sin evidencia.
* ⚫ **Blocked:** No se puede proceder sin esto (P0).

## Tabla de Seguimiento

| Sección | Item (Resumen) | Prioridad | Owner (Saliente) | Estado | Evidencia Recibida (Link/Ref) | Validación (OK/Fail + Nota) | Fecha Resp. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Ownership** | Owners (Tech/Product) | P1 | | 🔵 Pending | | | |
| **1. Ownership** | Feature Flags / Compliance | P2 | | 🔵 Pending | | | |
| **1. Ownership** | Definition of Done | P1 | | 🔵 Pending | | | |
| **2. Code** | **Repo Frontend (URL+Branch)** | **P0** | Nelson | 🟢 Evidence OK | [AutoRealtorIdeas](https://github.com/LignumBlocks/AutoRealtorIdeas) | Branch chore/rei-handover-docs ready | 2026-01-27 |
| **2. Code** | **Repo Backend (URL+Branch)** | **P0** | Nelson | 🟢 Evidence OK | Same as frontend | Integrated in Next.js structure | 2026-01-27 |
| **2. Code** | **Commit Hash Actual** | **P0** | Antigravity | 🟢 Evidence OK | 85c8fbb | Validated via git log | 2026-01-27 |
| **2. Code** | Build cmds / Node versions | P1 | | 🔵 Pending | | | |
| **3. Infra** | **DNS Ownership (Who/MFA)** | **P0** | | 🔵 Pending | | | |
| **3. Infra** | TLS / ACME | P2 | | 🔵 Pending | | | |
| **3. Infra** | CDN / WAF config | P2 | | 🔵 Pending | | | |
| **4. Caddy** | **Caddyfile Path Actual** | **P0** | | 🔵 Pending | | | |
| **4. Caddy** | Rate Limits Header | P1 | | 🔵 Pending | | | |
| **5. Backend** | **Service Unit (systemd)** | **P0** | | 🔵 Pending | | | |
| **5. Backend** | Update Mechanism | P1 | | 🔵 Pending | | | |
| **5. Backend** | Env Vars List (Names) | P1 | | 🔵 Pending | | | |
| **6. API** | Healthz contract | P2 | | 🔵 Pending | | | |
| **6. API** | Tavily contract | P2 | | 🔵 Pending | | | |
| **6. API** | Gemini contract | P2 | | 🔵 Pending | | | |
| **7. Security** | Auth policy | P1 | | 🔵 Pending | | | |
| **8. Costos** | **Location of Tavily Key** | **P0** | | 🔵 Pending | | | |
| **8. Costos** | **Location of Gemini Key** | **P0** | | 🔵 Pending | | | |
| **8. Costos** | **Billing Owner** | **P0** | | 🔵 Pending | | | |
| **8. Costos** | Kill Switch Ops | P1 | | 🔵 Pending | | | |
| **9. Obs** | Logs access/retention | P2 | | 🔵 Pending | | | |
| **10. Deploy** | Script logic check | P1 | | 🔵 Pending | | | |
| **10. Deploy** | **Rollback Procedure** | **P0** | | 🔵 Pending | | | |
| **11. Backup** | Locations / Freq | P2 | | 🔵 Pending | | | |
| **12. Debt** | Known Issues | P2 | | 🔵 Pending | | | |
