export const searchTavily = async (query: string) => {
    // SECURITY: Proxy to backend to avoid exposing API Key in frontend
    const res = await fetch('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) {
        throw new Error('Tavily Search Failed');
    }
    return res.json();
};
