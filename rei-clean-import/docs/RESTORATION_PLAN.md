# Restoration Plan: Import Real Code

The current repository is a secure skeleton. To reach parity with production, we must import the real Next.js source code from the legacy repository (`AutoRealtorIdeas`).

## Source of Truth (Legacy)

- **Path**: `../` (Parent directory `AutoRealtorIdeas`)
- **Branch**: `master` (Verified to contain `src/app`, `src/lib`, etc.)

## Execution Steps

### 1. Cleanup Mocks

- Remove mocked `src/api` and `components/`.
- Remove Vite-specific config (`vite.config.ts`, `index.html`).

### 2. Import Next.js Source

- Copy `src/` from legacy `master` to root.
- Copy `public/` (if exists).
- Copy `next.config.js`, `tsconfig.json`, `tailwind.config.js`.

### 3. Restore Dependencies

- Update `package.json` to include Next.js dependencies (`next`, `react`, `react-dom`, etc.) matching the legacy `package.json`.

### 4. Apply Security Fixes (Re-apply)

- **CRITICAL**: The legacy code has the **Hardcoded Tavily Key**.
- **Action**: Immediately apply the `src/api/client.ts` proxy pattern to the *real* code before committing.
- **Action**: Ensure `constants.ts` does NOT contain the key.

### 5. Verify Build

- Run `npm run build` (Next.js build).
- Verify `out/` (Static Export) or `.next/` depending on deploy target.
- *Note: Production uses "static export" logic (unzip -> static), so we might need `output: 'export'` in next.config.js.*

## Success Criteria

- [ ] Repo contains Next.js structure.
- [ ] `npm run build` passes.
- [ ] Secret Scan is CLEAN (Tavily key removed).
- [ ] Parity with Production is 100% (Logic + UI).
