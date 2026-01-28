# Mock Inventory (QA)

The following files were created as "skeletons" or "mocks" to allow the build to pass in `www.rei.orquix.com` (repo `rei-clean-import`). They **DO NOT** contain real business logic/UI.

| File | Purpose | Logic Status |
| :--- | :--- | :--- |
| `src/api/client.ts` | Satisfies `import { api }` in `App.tsx`. Proxies Tavily to backend, but other methods (`runNow`) are dummy. | **PARTIAL** (Tavily secure, rest is mock) |
| `services/dbService.ts` | Satisfies `dbService` usage. | **MOCK** (No-op) |
| `components/Sidebar.tsx` | Main navigation UI. | **MOCK** (Visual Placeholder) |
| `components/ResultsPanel.tsx` | Main content area. | **MOCK** (Visual Placeholder) |
| `components/ChatPanel.tsx` | Chat interface. | **MOCK** (Visual Placeholder) |
| `components/ExperimentPackPanel.tsx` | Right drawer for deliverables. | **MOCK** (Visual Placeholder) |

## Impact

- **Functionality**: The app loads but does nothing. Authentication is bypassed or mocked.
- **Security**: The Tavily proxy implementation in `client.ts` IS secure and production-ready, but the rest of the app is empty.
