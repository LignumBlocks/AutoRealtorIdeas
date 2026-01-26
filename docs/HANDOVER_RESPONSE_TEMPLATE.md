# Handover Response - Orquix REI

**Respondido por:** [Nombre]
**Fecha:** [YYYY-MM-DD]
**Entorno de referencia:** [Producción / Staging]

> **Instrucciones:**
> *   Rellene cada sección abajo.
> *   Para cada respuesta positiva, pegue la **EVIDENCIA** (output de terminal, contenido de archivo conf, o link a repo).
> *   Si desconoce algo, marque como `UNKNOWN` explique brevemente.
> *   **SEGURIDAD:** NO pegue valores de API Keys o contraseñas aquí. Solo indique la ruta del archivo o nombre de variable de entorno.

---

## 1. Ownership / Producto
**Owners:**
[Respuesta]

**Feature Flags / Compliance:**
[Respuesta]

**Definition of Done:**
[Respuesta]

## 2. Código Fuente (CRÍTICO)
**Repo Frontend (URL):**
[Respuesta]

**Repo Backend (URL):**
[Respuesta]

**Commit Hash en Producción:**
[Respuesta]
**Evidencia (git rev-parse / build-info):**
```bash
[Pegar output aquí]
```

**Comandos de Build / Versiones Node:**
[Respuesta]

## 3. Infraestructura
**Acceso DNS:**
[Respuesta]

**Config TLS/CDN:**
[Respuesta]
**Evidencia (dig / caddy config):**
```bash
[Pegar output aquí]
```

## 4. Caddy
**Ubicación Caddyfile:**
[Respuesta]

**Configuración Rate Limit:**
[Respuesta]

**Bloque de Configuración Real (Snippet redactado):**
```caddy
[Pegar contenido de bloque rei.orquix.com aquí]
```

## 5. Backend (rei-api)
**Contenido Unit File (systemctl cat):**
```ini
[Pegar output systemctl cat rei-api aquí]
```

**Mecanismo de Update:**
[Respuesta]

**Variables de Entorno (Solo nombres):**
[Respuesta]

## 6. Contratos API
**Datos Healthz:**
[Respuesta]

**Detalles Tavily (Provider/Quota):**
[Respuesta]

**Detalles Gemini (Model/Config):**
[Respuesta]

## 7. Seguridad
**Política Auth:**
[Respuesta]

**Protección Abuso:**
[Respuesta]

## 8. Costos & Secretos (P0)
**Ubicación Key Tavily:**
[Respuesta]

**Ubicación Key Gemini:**
[Respuesta]

**Billing Owner:**
[Respuesta]

**Procedimiento Kill Switch:**
[Respuesta]

## 9. Observabilidad
**Ubicación Logs:**
[Respuesta]

**Alertas:**
[Respuesta]

## 10. Deploy & Rollback
**Script Deploy Actual:**
[Respuesta]

**Procedimiento Rollback (P0):**
[Respuesta explícita paso a paso]

**Evidencia (ls releases / markers):**
```bash
[Pegar output ls -la /var/www/rei]
```

## 11. Backups
**Política y Ubicación:**
[Respuesta]

## 12. Deuda Técnica
**Issues conocidos:**
[Respuesta]
