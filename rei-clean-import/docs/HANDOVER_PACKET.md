# Orquix REI - Handover Packet

**Fecha:** 26-Ene-2026
**Estado del Proyecto:** ONLINE (Producción)
**URL:** [https://rei.orquix.com](https://rei.orquix.com)

## Contexto
Este paquete tiene como objetivo recolectar la información crítica para que el nuevo equipo de SRE/DevOps pueda operar, mantener y evolucionar la plataforma "Orquix REI" de manera segura y sin interrupciones.

Actualmente sabemos que el stack es:
*   **Frontend:** Next.js export estático servido por Caddy.
*   **Backend:** Node.js (API) corriendo en puerto 8094 local, gestionado por systemd `rei-api`.
*   **Infra:** VPS Linux single-node.

> **NOTA IMPORTANTE SOBRE ENDPOINTS:**
> Confirmamos que los endpoints `/api/where`, `/api/state`, y `/api/runNow` **NO existen** actualmente (404 es el comportamiento esperado). Solo `/api/healthz`, `/api/tavily/search` y `/api/gemini/chat` están activos.

---

## ⚠️ Lista P0: Bloqueantes para Operación Segura
Los siguientes puntos son críticos. Sin esta información, **no podemos aceptar la operación del servicio** debido al riesgo operacional y de costos.

1.  **Secretos y Costos:** Necesitamos saber EXACTAMENTE dónde están las API Keys de Tavily y Gemini para poder rotarlas en caso de emergencia y quién es el responsable de la facturación.
2.  **Código Fuente:** Necesitamos la URL del repositorio *real* que mapea al despliegue actual.
3.  **Procedimiento de Rollback:** Pasos exactos probados para volver a una versión anterior fiable.
4.  **Ownership de Infra:** Acceso a DNS y al servidor VPS (SSH).

**🔒 AVISO DE SEGURIDAD:**
**No compartir valores de secretos (keys, passwords, tokens) por Slack, Email o adjuntos en este paquete.** Solo indiquen nombres, rutas de archivo o variables de entorno. Los valores reales deben transmitirse únicamente por canal seguro (1Password, Vault, o llamada).

---

## Instrucciones para el Equipo Saliente

Por favor, revisen los documentos adjuntos y completen la información solicitada.

1.  **Responder por Sección:** Utilicen `HANDOVER_QUESTIONS.md` como guía principal.
2.  **Evidencia Requerida:** Para cada respuesta, no solo digan "sí/no".
    *   **Peguen el output del comando** que lo prueba (ej. `ls -la`, `curl`, `git rev-parse`).
    *   Peguen el path absoluto del archivo de configuración.
    *   Peguen links a PRs o repositorios.
3.  **Manejo de Incertidumbre:**
    *   Si NO saben una respuesta, escriban explícitamente **"UNKNOWN"**.
    *   Si algo no aplica, escriban **"N/A"** y una breve razón.
    *   NO adivinen. Preferimos un "No sé" honesto a una ruta incorrecta que cause una caída en producción.

---

## Documentación Adjunta (Anexos)

Este paquete incluye 3 documentos técnicos que deben ser validados:

*   **[Anexo A: Cuestionario de Handover](HANDOVER_QUESTIONS.md)**
    *   *Qué es:* Preguntas detalladas sobre ownership, build, infra, y configs.
    *   *Acción:* Responder todas las preguntas, especialmente las marcadas como Seguridad/Costos.
*   **[Anexo B: Runbook Mínimo](RUNBOOK_MINIMO.md)**
    *   *Qué es:* Comandos estándar que creemos que se usan para operar.
    *   *Acción:* Validar que estos comandos funcionan y SON los correctos. Corregir si hay alguno erróneo.
*   **[Anexo C: Matriz de Secretos](SECRETS_MATRIX.md)**
    *   *Qué es:* Plantilla para inventariar credenciales.
    *   *Acción:* Llenar con la ubicación de cada secreto (NO poner el valor del secreto, solo la ruta/env var).

---

## Checklist de Finalización (Definition of Done)

El handover se considerará **COMPLETO** cuando:

- [ ] Se haya entregado la URL de los repositorios de Frontend y Backend.
- [ ] Se hayan ubicado todas las credenciales externas (Tavily, Gemini, DNS, VPS) y confirmado con evidencia (ubicación real).
- [ ] Se haya confirmado el path absoluto y contenido del **Caddyfile** real con evidencia.
- [ ] Se haya confirmado el archivo unit **rei-api.service** real (`systemctl cat`) con evidencia.
- [ ] Se haya confirmado un "Smoke Test" exitoso por parte del nuevo equipo siguiendo el Runbook.
- [ ] Se haya validado un despliegue (o al menos el mecanismo de build) en un entorno de staging o local.

---

**Contacto operativo:** Nelson (Owner/Operaciones). Canal seguro para secretos: 1Password/Vault o llamada.
