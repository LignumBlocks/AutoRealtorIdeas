# Security Rotation Checklist: Tavily API Key

The Tavily API key is handled securely by the backend (`rei-api.service`). It is NOT exposed in the frontend.

## Steps to Rotate

1. **Generate New Key**:
   - Log in to your Tavily dashboard.
   - Revoke the old key.
   - Generate a new Production key.

2. **Update Backend Environment**:
   - Access the VPS via SSH.
   - Edit the environment file (e.g. `/opt/rei-orquix/shared/rei.env`).
   - Update `TAVILY_API_KEY=new_key`.

3. **Restart Backend**:
   - `systemctl restart rei-api`

4. **Verify**:
   - Visit `https://rei.orquix.com`.
   - Perform a search/analysis. The frontend will call `/api/tavily/search`, which uses the new key on the backend.
   - Ensure specific features (e.g. proof verification) work correctly.
