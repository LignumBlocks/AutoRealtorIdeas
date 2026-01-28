# GITHUB SOT PLAN: NORMALIZACIÓN DE SOURCE OF TRUTH

El objetivo es que al entrar a `github.com/LignumBlocks/AutoRealtorIdeas`, la rama por defecto (`main`) sea el código exacto que vive en producción.

---

## Opción A (Recomendada): Repositorio Nuevo "Orquix-REI"

Esta opción es la más limpia y evita el "ruido" de historiales previos contaminados.

1. **Acción en UI:** Crear repositorio nuevo en GitHub (ej: `Orquix-REI`).
2. **Comandos Git:**

    ```powershell
    # Agregar el nuevo origin
    git remote add production-sot https://github.com/LignumBlocks/Orquix-REI
    
    # Push de la rama actual como el nuevo main
    git push production-sot chore/handover-kit:main
    ```

3. **Pros:** Historial limpio, nombre descriptivo.
4. **Cons:** Hay que actualizar la URL en el script de deploy.

---

## Opción B (Rápida): Cambio de Rama Default

1. **Acción en UI:**
    - `Settings` > `Branches` > Icono de flechas en `Default branch`.
    - Seleccionar `chore/handover-kit`.
    - (Opcional) Renombrar `chore/handover-kit` a `handover-base` o similar.
2. **Pros:** Acción inmediata de un solo clic.
3. **Cons:** No resuelve el hecho de tener una rama `main` "muerta" y confusa.

---

## Opción C (Peligrosa/Directa): Force Push a Main

**ADVERTENCIA:** Esto sobreescribe `main` de forma irreversible.

1. **Checklist de Seguridad:**
    - [ ] Exportar ZIP de `main` actual como backup.
    - [ ] Asegurarse de que nadie está trabajando sobre `main`.
2. **Comandos:**

    ```powershell
    git checkout chore/handover-kit
    git push origin chore/handover-kit:main --force-with-lease
    ```

3. **Pros:** Mantiene la URL del repositorio actual. `main` se vuelve la realidad.
4. **Cons:** Destructivo. Puede romper forks o clones locales de otros miembros (Nelson).

---

## Decisión P0

Se requiere confirmación del Owner antes de ejecutar la **Opción C**. Mientras tanto, **Opción A** es la vía de menor resistencia técnica.
