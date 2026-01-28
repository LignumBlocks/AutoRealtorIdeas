# Architecture

## Core Philosophy
**Google Drive as Source of Truth**.
We do not store state in a local database (SQLite/Postgres). Instead, we use a specific Google Drive folder and a Master Google Sheet to track "Runs".

## Data Model

### Master Sheet
Acts as the index of all generated ideas.
- Columns: `RunID`, `Date`, `Status`, `Topic`, `DriveLink`

### Drive Structure
```text
AutoRealtorIdeas/
├── MasterSheet
├── Run_2023-10-27_TopicA/
│   ├── content.md
│   └── images/
└── Run_2023-10-28_TopicB/
```

## Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS.
- **Backend**: Next.js API Routes (Server Actions).
- **Integration**: `googleapis` (Drive & Sheets).
