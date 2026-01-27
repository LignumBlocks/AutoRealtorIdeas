# Checklist de Verificación de Handover (P0 Audit)

Este documento es para auditores (SRE/Nelson) para verificar rápidamente (15-20 mins) que la información recibida es correcta y completa.

## 1. Verificación de Código y Builds
- [ ] **Validar Repo:** Clonar el repo entregado y verificar que compila localmente.
- [ ] **Validar Hash:**
  ```bash
  # En servidor
  cat /var/www/rei/current/index.html | grep BUILD_ID
  # O
  git -C /ruta/al/repo rev-parse HEAD
  ```
  *Debe coincidir con la respuesta.*

## 2. Verificación de Infra y Caddy
- [ ] **Validar Caddyfile:**
  ```bash
  # Verificar ubicación real
  ps aux | grep caddy
  # Ver config cargada vs config en disco
  caddy adapt --config /etc/caddy/Caddyfile # (o ruta indicada)
  ```
- [ ] **Validar Rate Limits:**
  Revisar si existen directivas `rate_limit` o `limits` en el Caddyfile entregado.

## 3. Verificación de Backend y Secretos (CRÍTICO)
- [ ] **Validar Service Unit:**
  ```bash
  systemctl cat rei-api.service
  ```
  *Revisar `ExecStart`, `User`, `WorkingDirectory`.*
- [ ] **Ubicación de Secretos:**
  *   Si dicen "Environment en systemd": Verificar `Environment="TAVILY_KEY=..."` en el output anterior.
  *   Si dicen ".env file": `ls -la /ruta/indicada/.env` y verificar ownership/permisos (600/root).
  *   **NO imprimir valores.** Solo confirmar existencia.

## 4. Verificación de Procedimientos
- [ ] **Simulacro de Rollback (Mental o Staging):**
  Leer los pasos de rollback entregados. ¿Tienen sentido?
  *   Ej: "¿Cambiar symlink apunta a directorio existente?" -> `ls -la /var/www/rei/releases/`
- [ ] **Kill Switch:**
  Confirmar que se tiene acceso sudo para ejecutar `systemctl stop rei-api` o editar Caddyfile si fuera necesario.

## 5. Ownership
- [ ] **Login DNS:** Confirmar que se tiene usuario/password probados para el panel de DNS.
- [ ] **Login VPS:** Confirmar acceso SSH root o sudoer al servidor de producción.
