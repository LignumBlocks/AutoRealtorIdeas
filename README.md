# Auto Realtor Ideas

A local web application for generating and managing realtor marketing ideas, utilizing Google Drive as the source of truth.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in the required values (credentials setup instructions to follow).
    ```bash
    cp .env.example .env.local
    ```

3.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

- `src/app`: Next.js App Router (pages and layouts).
- `docs/`: Project documentation.
- `SAFETY.md`: Important safety rules for AI agents and developers.

## Features (Planned)

- **Setup**: Link to Google Drive.
- **New Run**: Generate new ideas.
- **Library**: View past runs from Google Sheets.
