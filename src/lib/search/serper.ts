import { SearchProvider, SearchResult } from '../run-engine/search';

export class SerperProvider implements SearchProvider {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.SERPER_API_KEY || '';
    }

    async search(query: string, countryCode: string, limit: number = 20): Promise<SearchResult[]> {
        if (!this.apiKey) {
            throw new Error('Missing SERPER_API_KEY');
        }

        try {
            console.log(`[Serper] "${query}" (gl=${countryCode}, limit=${limit})`);

            const res = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'X-API-KEY': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: query,
                    gl: countryCode.toLowerCase(),
                    hl: countryCode.toLowerCase() === 'us' || countryCode.toLowerCase() === 'gb' ? 'en' : undefined, // optional language hint
                    num: limit
                })
            });

            if (!res.ok) {
                // If 429, ideally we verify caller handles backoff, but here we just throw
                throw new Error(`Serper API Failed: ${res.statusText} (${res.status})`);
            }

            const data = await res.json();
            const organic = data.organic || [];

            return organic.map((item: any) => ({
                url: item.link,
                title: item.title,
                snippet: item.snippet,
                source: 'Serper (Google)'
            }));

        } catch (error: any) {
            console.error(`[Serper] Search Error for "${query}":`, error.message);
            return [];
        }
    }
}
