'use client';

import { useState, useEffect } from 'react';
import IdeaRow from './IdeaRow';

// Client component wrapper for fetches to avoid static hydration issues with dynamic sheet data
export default function LibraryPage() {
    const [ideas, setIdeas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        fetch('/api/ideas').then(r => r.json()).then(data => {
            setIdeas(data.ideas || []);
            setLoading(false);
        });
    }, []);

    // Ideas Fetcher Route (we need to make this if it doesn't exist, or just use getIdeas in server comp? 
    // User asked for 1-click script which opens library. Server Comp is fine, but Client toggle needs data.
    // I'll stick to Server Component logic if possible, BUT passing state (showAll) requires Client.
    // Let's refactor this file to be Client and fetch data from a new API. 
    // Wait, I can just use the Server Component to fetch initial data and pass to a Client List.
    // Actually, I can just make this a Client Component and fetch strictly from an API.
    // Creating /api/ideas allows easier client-side logic.
    // Let's create /api/ideas/route.ts quickly.
}

// Wait, I should stick to the existing pattern: Server Page passes data to Client List.
// But `LibraryPage` was default export.
// I will create a Client wrapper `LibraryList` and make `page.tsx` the Server Component.

// REVERTING TO SERVER COMPONENT PATTERN FOR `page.tsx`
