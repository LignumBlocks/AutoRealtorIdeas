export interface SearchResult {
    url: string;
    title: string;
    snippet: string;
    source?: string;
}

export interface SearchProvider {
    search(query: string, countryCode: string, limit?: number): Promise<SearchResult[]>;
}

export class MockSearchProvider implements SearchProvider {
    async search(query: string, countryCode: string, limit: number = 5): Promise<SearchResult[]> {
        console.log(`[MockSearch] Query: "${query}" in ${countryCode}`);
        return [
            {
                url: 'https://example.com/proptech-startup',
                title: 'Innovative PropTech Startup in ' + countryCode,
                snippet: 'This tool automates real estate valuations using AI...',
                source: 'Mock'
            },
            {
                url: 'https://news.example.com/real-estate-trends',
                title: 'Top Real Estate Marketing Trends 2025',
                snippet: 'Agents are using faceless video content to generate leads...',
                source: 'Mock'
            }
        ];
    }
}

// Factory to get provider
export function getSearchProvider(): SearchProvider {
    // Logic to switch to Real provider if keys exist
    return new MockSearchProvider();
}
