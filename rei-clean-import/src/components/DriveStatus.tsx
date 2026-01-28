'use client';

import { useEffect, useState } from 'react';

export default function DriveStatus() {
    const [status, setStatus] = useState({
        serviceAccount: false,
        adminEmail: false,
        searchProvider: false,
        geminiKey: false,
        loading: true,
    });

    useEffect(() => {
        fetch('/api/status')
            .then(res => res.json())
            .then(data => {
                setStatus({
                    serviceAccount: Boolean(data.drive?.serviceAccountFile ?? data.drive?.serviceAccount),
                    adminEmail: Boolean(data.env?.ADMIN_EMAIL),
                    searchProvider: Boolean(data.env?.TAVILY_API_KEY),
                    geminiKey: Boolean(data.env?.GEMINI_API_KEY),
                    loading: false,
                });
            })
            .catch(() => {
                setStatus(s => ({ ...s, loading: false }));
            });
    }, []);

    if (status.loading) {
        return <p>Loading status...</p>;
    }

    return (
        <ul>
            <li>Service Account: {status.serviceAccount ? 'OK' : 'Missing'}</li>
            <li>Admin Email: {status.adminEmail ? 'OK' : 'Missing'}</li>
            <li>Search Provider: {status.searchProvider ? 'OK' : 'Missing'}</li>
            <li>Gemini Key: {status.geminiKey ? 'OK' : 'Missing'}</li>
        </ul>
    );
}
