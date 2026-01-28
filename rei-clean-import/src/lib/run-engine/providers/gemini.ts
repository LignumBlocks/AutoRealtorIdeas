import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Rich Pearl Schema
const PearlSchema = z.object({
    title_es: z.string().describe("Short Spanish title, catchy"),
    idea_summary: z.string().describe("2-4 lines explaining the idea in ES"),
    why_pearl: z.string().describe("Bullets: Why is this a 'gem'?"),
    pearl_score: z.number().min(0).max(100),

    // Execution Helpers
    execution_steps: z.array(z.string()).describe("3-5 step-by-step actionable points (ES)"),
    faceless_script: z.object({
        hook: z.string(),
        body: z.string(),
        cta: z.string()
    }).describe("Short 30-45s script structure (ES)"),

    // Business Helper
    monetization_options: z.array(z.string()).describe("2 clean ways to make money (ES)"),
    friction_notes: z.string().describe("Context on why friction is Low/Med/High (ES)"),
    cost_notes: z.string().describe("Est time/money context (ES)"),

    cost_level: z.enum(['LOW', 'MED', 'HIGH']),
    effort_level: z.enum(['LOW', 'MED', 'HIGH']),
    faceless_fit: z.number().min(0).max(10),
    tags: z.array(z.string()),
    sources: z.array(z.string()).describe("List of EXACT URLs from input that support this"),
    verified: z.boolean().describe("TRUE only if sources.length >= 2 distinct domains. else FALSE"),
    evidence_summary: z.string().optional()
});

// Explicit interface to avoid type inference issues with intersections
export interface GeminiIdea extends z.infer<typeof PearlSchema> {
    name: string;
    description: string;
    b2_model: string;
    faceless_format: string;
    why_viral: string;
    monetization: string;
    selling_friction: number;
    cost_score: number;
    miami_fit: number;
    overall_score: number;
    is_top_pick: boolean;
    evidence_count: number;
}

export class GeminiProvider {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('Missing GEMINI_API_KEY');
        this.genAI = new GoogleGenerativeAI(key);
    }

    async synthesizeIdeas(countryName: string, searchResults: any[]): Promise<GeminiIdea[]> {
        const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const context = searchResults.map(r =>
            `- [${r.title}](${r.url}): ${r.snippet}`
        ).join('\n');

        const prompt = `
        You are an Elite Real Estate Strategist for the market in ${countryName}.
        Your goal is to find "Pearls" (Perlas): Unique, high-leverage marketing/business ideas hidden in the search results.

        CRITICAL RULES:
        1. **NO HALLUCINATIONS**: Every idea must be backed by the provided text.
        2. **VERIFICATION**: Set "verified": true ONLY if sources.length >= 2 (DISTINCT domains).
        3. **LANGUAGE**: Output fields in Spanish (ES) as requested in schema.
        4. **OUTPUT FORMAT**: Return ONLY a valid JSON Array of "Pearl" objects. DO NOT include markdown backticks or any explanation.
        
        Detailed Fields:
        - execution_steps: Real, non-generic steps.
        - faceless_script: Specific hook and value beats.
        - monetization: How to bank this specific idea.

        Input Context:
        ${context}

        Output PURE JSON:
        `;

        try {
            const result = await model.generateContent(prompt);
            let text = result.response.text();

            // Robust Parse
            let raw: any;
            try {
                // 1. Clean code fences
                if (text.includes('```')) {
                    text = text.split('```')[1];
                    if (text.startsWith('json')) text = text.slice(4);
                    if (text.endsWith('```')) text = text.slice(0, -3);
                }
                raw = JSON.parse(text.trim());
            } catch (innerError) {
                // 2. Fallback to extracting block
                const firstBrace = text.indexOf('[');
                const lastBrace = text.lastIndexOf(']');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    try {
                        raw = JSON.parse(text.substring(firstBrace, lastBrace + 1));
                    } catch (e2) {
                        throw new Error(`GEMINI_PARSE_ERROR: Failed to parse JSON even after cleaning. Preview: ${text.substring(0, 200)}`);
                    }
                } else {
                    throw new Error(`GEMINI_PARSE_ERROR: No JSON array found. Preview: ${text.substring(0, 200)}`);
                }
            }
            const results: GeminiIdea[] = [];

            if (Array.isArray(raw)) {
                for (const item of raw) {
                    const parsed = PearlSchema.safeParse(item);
                    if (parsed.success) {
                        const pearl = parsed.data;
                        results.push({
                            ...pearl,
                            name: pearl.title_es,
                            description: pearl.idea_summary,
                            b2_model: 'B2C',
                            faceless_format: pearl.faceless_fit > 7 ? 'High' : 'Low',
                            why_viral: pearl.why_pearl,
                            monetization: pearl.monetization_options.join(', '),
                            selling_friction: pearl.effort_level === 'LOW' ? 1 : pearl.effort_level === 'MED' ? 3 : 5,
                            cost_score: pearl.cost_level === 'LOW' ? 1 : pearl.cost_level === 'MED' ? 3 : 5,
                            miami_fit: 5,
                            overall_score: pearl.pearl_score,
                            is_top_pick: pearl.pearl_score >= 80,
                            evidence_count: pearl.sources.length,
                            evidence_summary: pearl.evidence_summary || 'Extracted from search'
                        });
                    }
                }
            }
            return results;
        } catch (e) {
            console.error('Gemini Synthesis Failed:', e);
            return [];
        }
    }

    async generateIdeaChat(title: string, summary: string, sources: string[]): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        ACT AS: Friendly, Elite Real Estate Mentor (Nelson's AI Assistant).
        GOAL: Explain this idea to Nelson in a detailed, conversational "Chat" style (SPANISH).
        
        INPUT IDEA:
        - Title: ${title}
        - Summary: ${summary}
        - Sources: ${sources.join(', ')}

        OUTPUT INSTRUCTION:
        Write a response as if you are chatting directly to him. DO NOT use generic AI introductions. Start directly.
        Use a warm, expert tone ("Mira Nelson, esta idea es brutal porque...").
        Allow for 1-2 paragraphs of explanation per section where needed, not just dry bullets.

        STRUCTURE (Markdown):

        # ${title}

        ## ¿De qué trata? 💡
        (Explain the concept clearly in 1-2 paragraphs. Be conversational. "Se trata de...")

        ## ¿Por qué es una Perla? 💎
        (Explain the hidden value. "Es una oportunidad única porque...")

        ## Paso a Paso 🚀
        (Explain how to execute it logically. Use bullets but explain each step well.)

        ## Guion para Redes (30-60s) 🎬
        (Give him a ready-to-use script structure)
        **Hook**: ...
        **Cuerpo**: ...
        **CTA**: ...

        ## Dinero y Fricción 💰
        (Discuss monetization and effort honestly. "Puedes cobrar por esto así... pero ten cuidado con...")

        ## Ángulo Miami 🌴
        (Specific advice for South Florida. "En Miami esto funcionaría increíble sí te enfocas en...")

        ## Fuentes 🔗
        (List the sources provided)

        TONE: Conversational, Detailed, Mentor-like.
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.error('Gemini Chat Gen Failed:', e);
            return "Error generating chat report. Please try again.";
        }
    }
}
