# Runbook Mínimo de Operación (Orquix REI)

Este documento detalla los comandos esenciales para operar, verificar y recuperar el servicio `rei.orquix.com`.

## 1. Smoke Tests (Verificación Rápida)

Confirmar que el servicio responde OK (HTTP 200).

```bash
# Verificar home (debe dar 200 OK)
curl -I https://rei.orquix.com/

# Verificar Health Check del API (debe dar 200 OK y JSON)
curl -i https://rei.orquix.com/api/healthz
```

## 2. Estado de Servicios

Verificar si los procesos están corriendo.

```bash
# Caddy (Web Server / Proxy)
systemctl status caddy

# Backend API
systemctl status rei-api
```

## 3. Logs Recientes

Revisar actividad reciente o errores en los últimos minutos.

```bash
# Logs de acceso y errores de Caddy
journalctl -u caddy --since "1 hour ago" -n 200 --no-pager

# Logs del Backend API (Node.js)
journalctl -u rei-api --since "1 hour ago" -n 300 --no-pager
```

## 4. Confirmar Despliegue (Vite / dist)

Validar que la versión en producción (`current`) apunta al release correcto (basado en `dist/`).

```bash
# Listar directorio de despliegue
ls -la /var/www/rei

# Verificar destino exacto del symlink 'current'
# Debe apuntar a .../releases/<TIMESTAMP>/dist
readlink -f /var/www/rei/current
```

## 5. Validar Conectividad Proxy -> Backend

Confirmar que el backend escucha localmente y responde, evitando problemas de firewall o Caddy.

```bash
# Check local directo al puerto 8094
curl -i http://127.0.0.1:8094/api/healthz
```

## 6. Procedimiento de Rollback

Pasos para volver a una versión anterior si el despliegue actual falla.

1. Identificar release anterior en `/var/www/rei/releases/`.
2. Cambiar el symlink `current` apuntando al release anterior.
3. Reiniciar Caddy (opcional, pero recomendado para limpiar caches si los hay).

```bash
# Ejemplo (ajustar timestamp)
ln -sfn /var/www/rei/releases/<TIMESTAMP_ANTERIOR> /var/www/rei/current
systemctl reload caddy
```

## 7. Panic Button (Kill Switch)

Cómo mitigar abuso masivo o costos descontrolados.

**Opción A: Detener el API** (Corte total de funcionalidad dinámica)

```bash
systemctl stop rei-api
```

*(El frontend seguirá cargando, pero chats y búsquedas fallarán).*

**Opción B: Bloqueo en Caddy** (Rechazar tráfico en borde)
Editar `/etc/caddy/Caddyfile` y comentar el bloque `handle /api/*`, luego `systemctl reload caddy`.
