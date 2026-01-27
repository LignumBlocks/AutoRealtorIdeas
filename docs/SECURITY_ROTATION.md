# Security Rotation Checklist: Tavily API Key

The Tavily API key was previously hardcoded in `constants.ts`. It has been migrated to environment variables. Although the repository is private, rotation is recommended.

## Steps to Rotate

1. **Generate New Key**:
   - Log in to your Tavily dashboard.
   - Revoke the old key (`tvly-dev-arFl...`).
   - Generate a new Production key.

2. **Update Environment Variables**:
   - **Local**: Update your `.env` or `.env.local` with `VITE_TAVILY_API_KEY=new_key`.
   - **VPS (Production)**: Update the environment file on the server (usually `/opt/rei-orquix/shared/rei.env` or similar).

3. **Re-deploy (or Restart)**:
   - If the key is injected at build time (standard Vite behavior), you **MUST** run a new build and deploy:

     ```bash
     npm run build
     # Follow deployment steps to move dist/ to the server
     ```

4. **Verify**:
   - Visit `https://rei.orquix.com`.
   - Perform a search/analysis to confirm Tavily is responding without auth errors.
