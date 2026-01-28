---
description: Prohíbe el commit de archivos .env o secretos en el repositorio.
---

# Seguridad: No Comitear .env o Secretos

Para mantener la integridad del proyecto y proteger las credenciales:

1. **NO** permitas que se añadan archivos `.env`, `.env.local`, `.env.production` o similares al índice de git.
2. **NO** commitees archivos de claves privadas (`*.pem`, `*.key`).
3. Antes de cada commit, verifica que no existan patrones de secretos (ej. `API_KEY=`, `sk-`, `SECRET=`) con valores reales.
4. Si detectas un secreto, aborta la operación y notifica al usuario para su rotación.
