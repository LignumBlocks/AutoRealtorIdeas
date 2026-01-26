# Safety Rules

1.  **NO Destructive Commands**: Never run `rm -rf` or equivalent deletion commands on folders outside the project workspace.
2.  **Ask Before Deleting**: If a file deletion is necessary (other than temp artifacts), ask the user for confirmation.
3.  **Review Commands**: Always review complex terminal commands before execution.
4.  **No Secrets**: Do NOT commit API keys or secrets to git. Use `.env` files and add them to `.gitignore`.
5.  **Scope**: All work should be contained within `AutoRealtorIdeas` and its subdirectories.
