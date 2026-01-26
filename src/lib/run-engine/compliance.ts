export const COMPLIANCE_DISCLAIMER = `AVISO LEGAL: Esta información es de carácter general y no constituye asesoría legal, financiera ni inmobiliaria personalizada. Resultados no garantizados. Sujeto a condiciones de mercado. Para decisiones específicas, consulta con profesionales licenciados en tu jurisdicción. Cumplimos con Fair Housing Act - No discriminamos.`;

// Truly neutral replacements - no implied promises
const PROHIBITED_REPLACEMENTS: Record<string, string> = {
    // Promise claims -> Neutral possibility
    "garantizado": "diseñado para mejorar",
    "garantizada": "diseñada para mejorar",
    "garantizamos": "buscamos",
    "garantiza": "busca",
    "en 72h": "con estrategias optimizadas",
    "en 3 días": "con estrategias optimizadas",
    "seguro que": "puede que",
    "te aseguro": "exploramos opciones para",
    "te aseguramos": "exploramos opciones para",
    "al mejor precio": "a precio competitivo",
    "mejor precio": "precio competitivo",
    "venta rápida": "proceso optimizado",
    "rápidamente": "de manera eficiente",
    // Legal/Tax claims -> Disclaimer redirect
    "evita asesorías legales": "(consulta con profesional)",
    "evita abogados": "(consulta con profesional)",
    "bajar impuestos": "estrategias fiscales (consulta profesional)",
    "ahorra impuestos": "estrategias fiscales (consulta profesional)",
    "asesoría": "información general",
};

export function sanitizeText(text: string): { sanitized: string; modifications: string[] } {
    let result = text;
    const mods: string[] = [];

    for (const [prohibited, replacement] of Object.entries(PROHIBITED_REPLACEMENTS)) {
        const regex = new RegExp(prohibited, 'gi');
        if (regex.test(result)) {
            result = result.replace(regex, replacement);
            mods.push(`Replaced "${prohibited}" with "${replacement}"`);
        }
    }

    return { sanitized: result, modifications: mods };
}

export function enforceCompliance(pack: any): { pack: any; logicProof: string[] } {
    const allMods: string[] = [];

    const process = (obj: any): any => {
        if (typeof obj === 'string') {
            const { sanitized, modifications } = sanitizeText(obj);
            if (modifications.length > 0) allMods.push(...modifications);
            return sanitized;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => process(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                newObj[key] = process(obj[key]);
            }
            return newObj;
        }
        return obj;
    };

    const sanitizedPack = process(pack);

    // Force literal compliance block
    sanitizedPack.compliance_block = COMPLIANCE_DISCLAIMER;

    return { pack: sanitizedPack, logicProof: allMods };
}
