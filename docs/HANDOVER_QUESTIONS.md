# Handover Questions & Evidence Checklist

## 1. Ownership / Producto
- [ ] ¿Quién es el owner técnico y quién es el owner de producto? (nombre/rol/contacto)
- [ ] ¿Qué “feature flags” o comportamientos críticos existen (aunque estén hardcodeados)?
- [ ] ¿Hay usuarios/tenants? ¿Algún requerimiento de compliance (Fair Housing/PII/retención)?
- [ ] ¿Cuál es el “definition of done” para este replacement? (qué confirma 100% que la herramienta vieja murió)

**Evidencia requerida:**
- Link a ticket/nota de decisión, o breve ADR (Architecture Decision Record) si existe.

## 2. Código fuente y versionado (lo MÁS importante para evitar “no sé qué está corriendo”)
- [ ] ¿Dónde está el repo del frontend? (URL + branch principal)
- [ ] ¿Dónde está el repo del backend (rei-api)? (URL + branch principal)
- [ ] ¿Cuál es el commit hash exacto desplegado hoy en prod? (frontend y backend)
- [ ] ¿Cómo se genera el build del frontend (comandos exactos) y qué versión de Node/PNPM/NPM se usa?
- [ ] ¿Cómo se deploya el backend (si es que se deploya) o solo se actualiza frontend?

**Evidencia requerida:**
- `git rev-parse HEAD` (en el workspace de build) o tag de release.
- En VPS: archivo “marker”/build id dentro de /var/www/rei/current (si existe) o `ls -la` mostrando symlink a release.
- Captura/pegado de `node -v` usado en build y en VPS.

## 3. Infra/DNS/TLS
- [ ] ¿Quién maneja DNS de rei.orquix.com? (proveedor, cuenta, 2FA)
- [ ] ¿TLS lo gestiona Caddy con ACME automático? ¿Hay alguna excepción/override?
- [ ] ¿Existe CDN o WAF delante? (Cloudflare u otro) ¿con qué reglas?

**Evidencia requerida:**
- Registro DNS relevante (CNAME/A) y si hay proxy/CDN ON.
- Extracto del Caddyfile real en VPS.

## 4. Caddy (contrato real en producción)
- [ ] ¿Dónde vive el Caddyfile (path exacto)? ¿Se gestiona con git o manual?
- [ ] Confirmar bloque exacto del sitio rei.orquix.com (handle /api/* y handle estático).
- [ ] ¿Hay headers/cors/limits configurados en Caddy?
- [ ] ¿Hay rate limit en Caddy? (si no, confirmar explícitamente “NO existe”)

**Evidencia requerida:**
- `caddy version`
- `caddy fmt --overwrite <Caddyfile>` (solo si aplica) + pegado del bloque final.
- `systemctl status caddy` + `journalctl -u caddy --since "24 hours ago" | tail -n 200`

## 5. Backend rei-api (systemd, runtime, salud)
- [ ] Confirmar el archivo unit: `systemctl cat rei-api.service` (pegado completo).
- [ ] ¿Cómo se actualiza /opt/rei-api/server.mjs? ¿Hay repo en VPS o se sube artefacto?
- [ ] ¿Qué variables de entorno usa rei-api? (lista completa, sin valores si es sensible)
- [ ] ¿Node corre como root o usuario dedicado? ¿Por qué?
- [ ] ¿Time-out y límites de payload? (para endpoints chat/search)

**Evidencia requerida:**
- `systemctl status rei-api`
- `journalctl -u rei-api --since "24 hours ago" | tail -n 300`
- `ss -lntp | grep 8094` (confirmar bind a 127.0.0.1)

## 6. Contrato de API (schemas reales)

### GET /api/healthz
- [ ] ¿Qué retorna exactamente (JSON)? ¿Qué campos son estables?
- [ ] ¿Qué chequea realmente? (solo “up” o también dependencias)

**Evidencia requerida:**
- Ejemplo real de response.

### POST /api/tavily/search
- [ ] Request schema exacto (campos, tipos, máximos).
- [ ] Response schema exacto.
- [ ] ¿Qué proveedor real usa “tavily”? ¿Qué key/quota? ¿Hay caching?
- [ ] ¿Qué pasa ante errores del proveedor? (reintentos, backoff, status codes)

**Evidencia requerida:**
- Ejemplo request/response (redactando datos sensibles).

### POST /api/gemini/chat
- [ ] Request schema exacto (incluye system prompt/ctx?).
- [ ] ¿Qué modelo Gemini? ¿Cómo se configura? (env var, default)
- [ ] ¿Hay guardrails (moderation), límites de tokens, rate limits, caching?
- [ ] ¿Qué pasa ante timeouts? ¿Se corta o stream?

**Evidencia requerida:**
- Ejemplo request/response (redactado).

## 7. Seguridad mínima (hoy vs requerido)
- [ ] ¿Hay autenticación? Si NO: ¿es intencional? ¿Cuál es el riesgo aceptado?
- [ ] ¿Hay protección contra abuso (rate limit, API key, captcha, IP allowlist, WAF)?
- [ ] ¿CORS permite cualquier origen? ¿Qué orígenes deben permitirse?
- [ ] ¿Hay logging de PII? ¿Se redactan prompts/respuestas?

**Evidencia requerida:**
- Config actual de CORS/rate limit (en Caddy o en backend).
- Decisión explícita: “abierto al público” vs “requiere auth”.

## 8. Costos y cuotas (Security Gate)
- [ ] ¿Dónde están los secrets de Tavily y Gemini? (ubicación exacta: env/systemd file/secret manager)
- [ ] ¿Quién paga y dónde se ve el consumo? (cuenta/owner)
- [ ] ¿Qué límites existen hoy para evitar loops de costo? (request caps, retries)
- [ ] ¿Cuál es el “kill switch” operativo si hay abuso? (bloquear endpoint en Caddy, apagar service, etc.)

**Evidencia requerida:**
- Lista de env vars sensibles (solo nombres).
- Procedimiento “panic button” documentado.

## 9. Observabilidad / Incidentes
- [ ] ¿Dónde se ven logs “útiles” (no solo stacktrace)? ¿Formato JSON o texto?
- [ ] ¿Existe rotación/retención de logs? ¿journald está persistente?
- [ ] ¿Hay alertas (uptime, errores 5xx, consumo API)?
- [ ] ¿Hay dashboards? (Grafana/Prometheus/Sentry/etc.)

**Evidencia requerida:**
- Si existe: URL/herramienta + quién tiene acceso.
- Si NO existe: confirmación explícita.

## 10. Deploy del frontend (release model real)
- [ ] Confirmar script real usado: scripts/deploy_prod.ps1 (ubicación y versión).
- [ ] ¿Quién lo ejecuta? ¿Desde qué máquina? ¿Qué permisos necesita?
- [ ] ¿Cómo se valida que /var/www/rei/current apunta al release nuevo? (marker)
- [ ] ¿Cómo se hace rollback? (comandos exactos)

**Evidencia requerida:**
- Ejemplo de un deploy real (output redactado).
- `ls -la /var/www/rei` mostrando current -> releases/<timestamp>
- Procedimiento de rollback: “cambiar symlink y reload caddy” (o lo que aplique).

## 11. Backups / DR
- [ ] ¿Qué hay que respaldar realmente? (releases, backend code, configs)
- [ ] ¿Se respalda Caddyfile y unit files? ¿Frecuencia?
- [ ] ¿RTO/RPO esperado?

**Evidencia requerida:**
- Ubicación del backup y última fecha.

## 12. Deuda técnica y roadmap inmediato
- [ ] Lista de “known issues” abiertos (aunque sean pequeños).
- [ ] Próximo paso recomendado por el equipo anterior y por qué.
- [ ] Cualquier trampa conocida (cache, rutas, permisos, edge cases).

**Evidencia requerida:**
- Lista priorizada (P0/P1/P2) con owner.
