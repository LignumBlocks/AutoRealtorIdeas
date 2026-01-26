// Top100 = Fixed set of 100 countries for comparative runs; regional mix; excludes duplicates; stable order.
// Optimized for verified real estate markets with digital presence.

export const TOP100_COUNTRIES: CountryDef[] = [
    // --- EUROPE (Priority) ---
    { code: 'GB', name_es: 'Reino Unido', name_en: 'United Kingdom', region: 'EU' },
    // ... [Content Preserved] ...

    { code: 'DE', name_es: 'Alemania', name_en: 'Germany', region: 'EU' },
    { code: 'FR', name_es: 'Francia', name_en: 'France', region: 'EU' },
    { code: 'ES', name_es: 'España', name_en: 'Spain', region: 'EU' },
    { code: 'IT', name_es: 'Italia', name_en: 'Italy', region: 'EU' },
    { code: 'NL', name_es: 'Países Bajos', name_en: 'Netherlands', region: 'EU' },
    { code: 'SE', name_es: 'Suecia', name_en: 'Sweden', region: 'EU' },
    { code: 'PL', name_es: 'Polonia', name_en: 'Poland', region: 'EU' },
    { code: 'BE', name_es: 'Bélgica', name_en: 'Belgium', region: 'EU' },
    { code: 'CH', name_es: 'Suiza', name_en: 'Switzerland', region: 'EU' },
    { code: 'AT', name_es: 'Austria', name_en: 'Austria', region: 'EU' },
    { code: 'NO', name_es: 'Noruega', name_en: 'Norway', region: 'EU' },
    { code: 'IE', name_es: 'Irlanda', name_en: 'Ireland', region: 'EU' },
    { code: 'DK', name_es: 'Dinamarca', name_en: 'Denmark', region: 'EU' },
    { code: 'FI', name_es: 'Finlandia', name_en: 'Finland', region: 'EU' },
    { code: 'PT', name_es: 'Portugal', name_en: 'Portugal', region: 'EU' },
    { code: 'GR', name_es: 'Grecia', name_en: 'Greece', region: 'EU' },
    { code: 'CZ', name_es: 'República Checa', name_en: 'Czech Republic', region: 'EU' },
    { code: 'RO', name_es: 'Rumania', name_en: 'Romania', region: 'EU' },
    { code: 'HU', name_es: 'Hungría', name_en: 'Hungary', region: 'EU' },
    // Extended Europe
    { code: 'UA', name_es: 'Ucrania', name_en: 'Ukraine', region: 'EU' },
    { code: 'HR', name_es: 'Croacia', name_en: 'Croatia', region: 'EU' },
    { code: 'SK', name_es: 'Eslovaquia', name_en: 'Slovakia', region: 'EU' },
    { code: 'BG', name_es: 'Bulgaria', name_en: 'Bulgaria', region: 'EU' },
    { code: 'RS', name_es: 'Serbia', name_en: 'Serbia', region: 'EU' },
    { code: 'SI', name_es: 'Eslovenia', name_en: 'Slovenia', region: 'EU' },
    { code: 'LT', name_es: 'Lituania', name_en: 'Lithuania', region: 'EU' },
    { code: 'LV', name_es: 'Letonia', name_en: 'Latvia', region: 'EU' },
    { code: 'EE', name_es: 'Estonia', name_en: 'Estonia', region: 'EU' },
    { code: 'LU', name_es: 'Luxemburgo', name_en: 'Luxembourg', region: 'EU' },
    { code: 'IS', name_es: 'Islandia', name_en: 'Iceland', region: 'EU' },
    { code: 'MT', name_es: 'Malta', name_en: 'Malta', region: 'EU' },
    { code: 'CY', name_es: 'Chipre', name_en: 'Cyprus', region: 'EU' },

    // --- AMERICAS ---
    { code: 'US', name_es: 'Estados Unidos', name_en: 'United States', region: 'AM' },
    { code: 'CA', name_es: 'Canadá', name_en: 'Canada', region: 'AM' },
    { code: 'BR', name_es: 'Brasil', name_en: 'Brazil', region: 'AM' },
    { code: 'MX', name_es: 'México', name_en: 'Mexico', region: 'AM' },
    { code: 'AR', name_es: 'Argentina', name_en: 'Argentina', region: 'AM' },
    { code: 'CO', name_es: 'Colombia', name_en: 'Colombia', region: 'AM' },
    { code: 'CL', name_es: 'Chile', name_en: 'Chile', region: 'AM' },
    { code: 'PE', name_es: 'Perú', name_en: 'Peru', region: 'AM' },
    { code: 'EC', name_es: 'Ecuador', name_en: 'Ecuador', region: 'AM' },
    { code: 'DO', name_es: 'República Dominicana', name_en: 'Dominican Republic', region: 'AM' },
    { code: 'GT', name_es: 'Guatemala', name_en: 'Guatemala', region: 'AM' },
    { code: 'CR', name_es: 'Costa Rica', name_en: 'Costa Rica', region: 'AM' },
    { code: 'PA', name_es: 'Panamá', name_en: 'Panama', region: 'AM' },
    { code: 'UY', name_es: 'Uruguay', name_en: 'Uruguay', region: 'AM' },
    { code: 'PY', name_es: 'Paraguay', name_en: 'Paraguay', region: 'AM' },
    { code: 'BO', name_es: 'Bolivia', name_en: 'Bolivia', region: 'AM' },

    // --- ASIA / PACIFIC ---
    { code: 'CN', name_es: 'China', name_en: 'China', region: 'AS' },
    { code: 'JP', name_es: 'Japón', name_en: 'Japan', region: 'AS' },
    { code: 'IN', name_es: 'India', name_en: 'India', region: 'AS' },
    { code: 'KR', name_es: 'Corea del Sur', name_en: 'South Korea', region: 'AS' },
    { code: 'AU', name_es: 'Australia', name_en: 'Australia', region: 'OC' },
    { code: 'ID', name_es: 'Indonesia', name_en: 'Indonesia', region: 'AS' },
    { code: 'SG', name_es: 'Singapur', name_en: 'Singapore', region: 'AS' },
    { code: 'MY', name_es: 'Malasia', name_en: 'Malaysia', region: 'AS' },
    { code: 'TH', name_es: 'Tailandia', name_en: 'Thailand', region: 'AS' },
    { code: 'VN', name_es: 'Vietnam', name_en: 'Vietnam', region: 'AS' },
    { code: 'PH', name_es: 'Filipinas', name_en: 'Philippines', region: 'AS' },
    { code: 'NZ', name_es: 'Nueva Zelanda', name_en: 'New Zealand', region: 'OC' },
    { code: 'HK', name_es: 'Hong Kong', name_en: 'Hong Kong', region: 'AS' },
    { code: 'TW', name_es: 'Taiwán', name_en: 'Taiwan', region: 'AS' },
    { code: 'PK', name_es: 'Pakistán', name_en: 'Pakistan', region: 'AS' },
    { code: 'BD', name_es: 'Bangladesh', name_en: 'Bangladesh', region: 'AS' },
    { code: 'LK', name_es: 'Sri Lanka', name_en: 'Sri Lanka', region: 'AS' },
    { code: 'KZ', name_es: 'Kazajistán', name_en: 'Kazakhstan', region: 'AS' },

    // --- MIDDLE EAST ---
    { code: 'TR', name_es: 'Turquía', name_en: 'Turkey', region: 'ME' },
    { code: 'SA', name_es: 'Arabia Saudita', name_en: 'Saudi Arabia', region: 'ME' },
    { code: 'AE', name_es: 'Emiratos Árabes Unidos', name_en: 'United Arab Emirates', region: 'ME' },
    { code: 'IL', name_es: 'Israel', name_en: 'Israel', region: 'ME' },
    { code: 'EG', name_es: 'Egipto', name_en: 'Egypt', region: 'ME' },
    { code: 'QA', name_es: 'Catar', name_en: 'Qatar', region: 'ME' },
    { code: 'KW', name_es: 'Kuwait', name_en: 'Kuwait', region: 'ME' },
    { code: 'OM', name_es: 'Omán', name_en: 'Oman', region: 'ME' },
    { code: 'BH', name_es: 'Baréin', name_en: 'Bahrain', region: 'ME' },

    // --- AFRICA ---
    { code: 'ZA', name_es: 'Sudáfrica', name_en: 'South Africa', region: 'AF' },
    { code: 'NG', name_es: 'Nigeria', name_en: 'Nigeria', region: 'AF' },
    { code: 'KE', name_es: 'Kenia', name_en: 'Kenya', region: 'AF' },
    { code: 'MA', name_es: 'Marruecos', name_en: 'Morocco', region: 'AF' },
    { code: 'DZ', name_es: 'Argelia', name_en: 'Algeria', region: 'AF' },
    { code: 'TN', name_es: 'Túnez', name_en: 'Tunisia', region: 'AF' },
    { code: 'GH', name_es: 'Ghana', name_en: 'Ghana', region: 'AF' },
    { code: 'ET', name_es: 'Etiopía', name_en: 'Ethiopia', region: 'AF' },
    { code: 'TZ', name_es: 'Tanzania', name_en: 'Tanzania', region: 'AF' },

    // --- OTHERS / FILLERS to reach 100 ---
    { code: 'GE', name_es: 'Georgia', name_en: 'Georgia', region: 'EU' },
    { code: 'AM', name_es: 'Armenia', name_en: 'Armenia', region: 'EU' },
    { code: 'AZ', name_es: 'Azerbaiyán', name_en: 'Azerbaijan', region: 'AS' },
    { code: 'BY', name_es: 'Bielorrusia', name_en: 'Belarus', region: 'EU' },
    { code: 'MD', name_es: 'Moldavia', name_en: 'Moldova', region: 'EU' },
    { code: 'BA', name_es: 'Bosnia y Herzegovina', name_en: 'Bosnia', region: 'EU' },
    { code: 'AL', name_es: 'Albania', name_en: 'Albania', region: 'EU' },
    { code: 'MK', name_es: 'Macedonia del Norte', name_en: 'North Macedonia', region: 'EU' },
    { code: 'NP', name_es: 'Nepal', name_en: 'Nepal', region: 'AS' }, // Restored unique
    { code: 'JM', name_es: 'Jamaica', name_en: 'Jamaica', region: 'AM' },
    { code: 'TT', name_es: 'Trinidad y Tobago', name_en: 'Trinidad and Tobago', region: 'AM' },
    { code: 'BS', name_es: 'Bahamas', name_en: 'Bahamas', region: 'AM' },
    { code: 'MU', name_es: 'Mauricio', name_en: 'Mauritius', region: 'AF' },
    { code: 'JO', name_es: 'Jordania', name_en: 'Jordan', region: 'ME' },
    { code: 'LB', name_es: 'Líbano', name_en: 'Lebanon', region: 'ME' }
];

const uniqueCodes = new Set(TOP100_COUNTRIES.map(c => c.code));
if (TOP100_COUNTRIES.length !== 100) {
    throw new Error(`CRITICAL: Top 100 list must have exactly 100 countries. Current: ${TOP100_COUNTRIES.length}`);
}
if (uniqueCodes.size !== 100) {
    throw new Error(`CRITICAL: Top 100 list must be unique. Unique count: ${uniqueCodes.size}`);
}

// Note: This list targets verified real estate markets with digital presence.
