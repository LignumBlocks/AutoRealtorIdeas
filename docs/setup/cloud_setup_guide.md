# Google Cloud Setup Guide for Auto Realtor Ideas

Follow these steps to configure your Google Cloud environment for the Service Account integration.

## 1. Create a Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown in the top bar.
3.  Click **"New Project"**.
4.  Name it `auto-realtor-ideas` (or similar).
5.  Click **Create**.

## 2. Enable APIs
1.  Select your new project.
2.  Go to **Create & Enable APIs** (or search "APIs & Services").
3.  Click **"+ Enable APIs and Services"**.
4.  Search for **"Google Drive API"** and click **Enable**.
5.  Go back (or search again) for **"Google Sheets API"** and click **Enable**.

## 3. Create Service Account
1.  Go to **IAM & Admin** > **Service Accounts**.
2.  Click **"+ Create Service Account"**.
3.  **Name**: `auto-realtor-ideas-bot` (or similar).
4.  **Description**: "Bot for managing Auto Realtor Ideas Drive DB".
5.  Click **Create and Continue**.
6.  **Grant Access**: You can skip this (Roles) for now *OR* give it "Editor" on the Project (optional, not strictly needed as we use folder-specific sharing).
    - *Better security*: Leave roles empty. We will share the specific folder with this email later (or let it create one).
7.  Click **Done**.

## 4. Generate JSON Key
1.  In the Service Accounts list, click the email of the account you just created (e.g., `auto-realtor-ideas-bot@...`).
2.  Go to the **Keys** tab.
3.  Click **Add Key** > **Create new key**.
4.  Select **JSON**.
5.  Click **Create**. A file will automatically download.

## 5. Local Setup
1.  Create a folder named `.secrets` in your project root: `c:\Users\pared\AutoRealtorIdeas\.secrets`.
2.  Rename the downloaded JSON file to `service-account.json`.
3.  Move it into the `.secrets` folder.
    - Path should be: `c:\Users\pared\AutoRealtorIdeas\.secrets\service-account.json`.

## 6. Environment Variables
1.  Create `.env.local` in your project root if it doesn't exist.
2.  Add the following:
    ```env
    GOOGLE_SA_KEY_PATH=.secrets/service-account.json
    GOOGLE_ADMIN_EMAIL=your-email@example.com
    # Optional: If you want to use an existing folder instead of creating a new one
    # DRIVE_ROOT_FOLDER_ID=...
    ```
