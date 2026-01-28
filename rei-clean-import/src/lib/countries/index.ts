import { TOP100_COUNTRIES, CountryDef } from './top100';

export function searchCountries(query: string): CountryDef[] {
    if (!query) return [];
    const lower = query.toLowerCase();

    return TOP100_COUNTRIES.filter(c =>
        c.name_es.toLowerCase().includes(lower) ||
        c.code.toLowerCase().includes(lower)
    ).slice(0, 10);
}

export function findCountryByCode(code: string): CountryDef | undefined {
    return TOP100_COUNTRIES.find(c => c.code.toLowerCase() === code.toLowerCase());
}

export function findByName(text: string): CountryDef | undefined {
    const lower = text.toLowerCase();
    return TOP100_COUNTRIES.find(c =>
        c.name_es.toLowerCase() === lower ||
        c.name_en.toLowerCase() === lower
    );
}

export function normalizeIdeaTitle(title: string): string {
    return title.toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]/g, ' ') // keep spanish chars
        .trim()
        .replace(/\s+/g, ' ');
}
