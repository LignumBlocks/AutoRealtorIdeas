# Matriz de Secretos (Secrets Matrix)

Este documento registra los secretos críticos, su ubicación y propietario responsable. **NO INCLUIR VALORES REALES AQUÍ.**

| Secreto (Nombre) | Dónde Vive (Ubicación Exacta) | Owner (Rol) | Rotación (Frecuencia) | Impacto de Rotación | Cómo Validar (Comando/Acción) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **API Key Tavily** | `/etc/systemd/system/rei-api.service` (env var) | Tech Lead | Semestral / Ante incidente | Búsquedas fallan inmediatamente (500/403) | `curl -X POST .../api/tavily/search` o logs de `rei-api` |
| **API Key Gemini** | `/etc/systemd/system/rei-api.service` (env var) | Tech Lead | Semestral / Ante incidente | Chats fallan inmediatamente (500/403) | `curl -X POST .../api/gemini/chat` ver response |
| **Credenciales VPS (SSH Key)** | Local computers / 1Password (Team) | DevOps / SRE | Solo ante compromiso | Acceso al servidor denegado | Intentar login SSH |
| **Cuenta Cloudflare/DNS** | Panel de Proveedor (ej. Namecheap/CF) | Product Owner / Tech Lead | N/A (MFA activo) | Pérdida de control de dominio | Login al panel con MFA |
| **Certificados SSL (ACME)** | `/var/lib/caddy/.local/share/caddy` (Auto-gestión) | Caddy Service (Automático) | Automática (90 días) | Error de certificado en navegador | Navegar a `https://rei.orquix.com` y ver candado |

## Procedimiento de Rotación Genérico
1. Generar nueva key en el proveedor (Tavily/Google AI Studio).
2. Editar archivo de servicio: `sudo systemctl edit --full rei-api.service`.
3. Actualizar variable `Environment=...`.
4. Recargar systemd y reiniciar servicio:
   ```bash
   systemctl daemon-reload
   systemctl restart rei-api
   ```
5. Validar logs y smoke test inmediatamente.
