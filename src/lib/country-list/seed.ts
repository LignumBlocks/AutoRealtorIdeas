export interface Country {
    country_code: string;
    iso3: string;
    name: string;
    region: string;
    tier: number;
    priority_score: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

const EUROPE_FIRST_LIST: Country[] = [
    // Tier 1 Europe
    { country_code: 'GB', iso3: 'GBR', name: 'United Kingdom', region: 'Europe', tier: 1, priority_score: 100, status: 'pending' },
    { country_code: 'DE', iso3: 'DEU', name: 'Germany', region: 'Europe', tier: 1, priority_score: 95, status: 'pending' },
    { country_code: 'FR', iso3: 'FRA', name: 'France', region: 'Europe', tier: 1, priority_score: 95, status: 'pending' },
    { country_code: 'ES', iso3: 'ESP', name: 'Spain', region: 'Europe', tier: 1, priority_score: 90, status: 'pending' },
    { country_code: 'IT', iso3: 'ITA', name: 'Italy', region: 'Europe', tier: 1, priority_score: 90, status: 'pending' },
    { country_code: 'NL', iso3: 'NLD', name: 'Netherlands', region: 'Europe', tier: 1, priority_score: 85, status: 'pending' },
    { country_code: 'SE', iso3: 'SWE', name: 'Sweden', region: 'Europe', tier: 1, priority_score: 85, status: 'pending' },
    { country_code: 'CH', iso3: 'CHE', name: 'Switzerland', region: 'Europe', tier: 1, priority_score: 85, status: 'pending' },

    // Tier 1 Americas/Oceania (Fast Follow)
    { country_code: 'US', iso3: 'USA', name: 'United States', region: 'Americas', tier: 1, priority_score: 99, status: 'pending' },
    { country_code: 'CA', iso3: 'CAN', name: 'Canada', region: 'Americas', tier: 1, priority_score: 80, status: 'pending' },
    { country_code: 'AU', iso3: 'AUS', name: 'Australia', region: 'Oceania', tier: 1, priority_score: 80, status: 'pending' },

    // Add more as needed based on "Top 100" or dynamic fetching
    // ...
];

export function getSeedCountries(): Country[] {
    return EUROPE_FIRST_LIST;
}
