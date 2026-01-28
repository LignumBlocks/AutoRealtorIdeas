# ORQUIX REI: CONTRATO / HANDOVER / BITÁCORA

> **ESTADO DEL PROYECTO: ONLINE (Producción)**  
> **FECHA:** 27 de Enero de 2026  
> **URL:** [rei.orquix.com](https://rei.orquix.com)

---

## 1. Portada y Contacto

* **Proyecto:** Orquix REI (Real Estate Intelligence)
* **Owner Operativo:** Nelson (Confirmado)
* **Canales de comunicación:** Slack / Teams (Evitar "intentos a ciegas", siempre solicitar outputs de comandos antes de actuar).
* **Regla de Oro:** GitHub es la meta para Source of Truth, pero el estado actual de Producción es el "Suelo de Verdad".

---

## 2. Arquitectura en Producción (Baseline Confirmado)

* **VPS:** `148.230.125.225` (Hostinger)
* **OS:** Ubuntu 24.04 LTS (User: `root`)
* **Web Server:** Caddy (Reverse Proxy + Static Files)
* **Frontend:** Next.js (Static Export)
  * **Ruta:** `/var/www/rei/current` (Symlink a `/var/www/rei/releases/<timestamp>`)
* **Backend:** Node.js Express API
  * **Servicio:** `rei-api.service` (Systemd)
  * **Binding:** `127.0.0.1:8094`
  * **Entrypoint:** `/opt/rei-api/server.mjs`
* **Proxy Logic (Caddyfile esperado):**

    ```caddy
    rei.orquix.com {
        handle /api/* {
            reverse_proxy 127.0.0.1:8094
        }
        handle {
            root * /var/www/rei/current
            file_server
            try_files {path} /index.html
        }
    }
    ```

---

## 3. Contrato de API (Estado de lo Existente)

Base URL: `https://rei.orquix.com`

| Endpoint | Método | Estado | Notas |
| :--- | :--- | :--- | :--- |
| `/api/healthz` | GET | **OK** | Retorna estado del servicio y conectividad básica. |
| `/api/tavily/search` | POST | **OK** | Ejecuta búsquedas mediante Tavily API. |
| `/api/gemini/chat` | POST | **OK** | Interacción con modelo Gemini (Vertex/AI Studio). |
| `/api/where` | GET | **404** | No implementado o ruta incorrecta. |
| `/api/state` | GET | **404** | Persistencia no expuesta por esta ruta. |
| `/api/runNow` | POST | **404** | Disparador manual no encontrado. |

* **Timeouts:** Se han observado timeouts en búsquedas largas (>30s).
* **Auth:** Actualmente depende de Access Code en la UI (Security through obscurity/minimal auth).

---

## 4. Operación (Runbook Consolidado)

### Diagnóstico Rápido

```powershell
# Verificar si el backend escucha
ssh root@148.230.125.225 "ss -lntp | grep 8094"

# Ver logs en tiempo real
ssh root@148.230.125.225 "journalctl -u rei-api -f"

# Estado de Caddy
ssh root@148.230.125.225 "systemctl status caddy"
```

---

## 5. Modelo de Deploy + Rollback

* **Script de Deploy:** `scripts/deploy_prod.ps1` (CONFIRMADO localmente en `chore/handover-kit`, UNKNOWN en GitHub `main`).
* **Mecánica:**
    1. Build local (`npm run build`).
    2. Zip de `out/` y envío a `/var/www/rei/tmp`.
    3. Unzip en `/var/www/rei/releases/<timestamp>`.
    4. Actualización de symlink `current`.
* **Rollback:**
    `ln -sfn /var/www/rei/releases/<PREVIOUS_TIMESTAMP> /var/www/rei/current && systemctl reload caddy`

---

## 6. Seguridad y Costos (Security Gate)

* **Secretos (Inventory):**
  * `TAVILY_API_KEY` (En backend)
  * `GEMINI_API_KEY` / `GOOGLE_API_KEY` (En backend)
  * `NEXT_PUBLIC_ACCESS_CODE` (En frontend/build)
* **Ubicación:** `UNKNOWN`. Probablemente en `/etc/default/rei-api` o `.env` en `/opt/rei-api`.
* **Pánico (Panic Button):**
  * `systemctl stop rei-api` (Cesa toda actividad de IA).
  * Comentar bloque `handle /api/*` en Caddyfile para bloquear tráfico externo a la API.

---

## 7. P0 / P1 / P2 (Pendientes Críticos)

* **P0 (Bloqueantes):**
  * Confirmar ubicación exacta de SECRETOS para rotación.
  * Sincronizar GitHub `main` con la realidad del código en producción.
  * Confirmar Owner de facturación de Hostinger y Google Cloud.
* **P1 (Mejoras):**
  * Implementar Rate Limiting real en Caddy.
  * Dashboard de observabilidad mínimo (UptimeKuma o similar).
* **P2 (Hardening):**
  * SSH con llaves (deshabilitar password root).
  * WAF (Cloudflare o similar).

---

## 8. Evidencia Requerida para DoD

- [ ] Output de `git log -1` de la rama mergeada.
* [ ] Screenshot de `https://rei.orquix.com/api/healthz` (200 OK).
* [ ] Confirmación de Nelson sobre acceso a 1Password/Vault.
