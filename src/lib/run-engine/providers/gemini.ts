import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import crypto from 'crypto';

// Evidence Item Schema (MVP Requirement)
const EvidenceItemSchema = z.object({
    url: z.string(),
    title: z.string(),
    domain: z.string(),
    type: z.string().default('Web'),
    snippet: z.string().optional()
});

// Rich Pearl Schema (Updated for ProofPack)
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

    // ProofPack Structure (MVP)
    proof_pack: z.object({
        evidence_items: z.array(EvidenceItemSchema).default([]),
        confidence_score: z.number().min(0).max(100).default(0),
        gaps: z.array(z.string()).default([])
    }).optional(),

    verified: z.boolean().describe("TRUE only if sources.length >= 2 distinct domains. else FALSE"),
    evidence_summary: z.string().optional()
});

export type GeminiIdea = z.infer<typeof PearlSchema> & {
    // Compat fields
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
    miami_saturation?: {
        who_does_it: { platforms: string[]; competitors: string[] };
        saturation_score: number;
        already_common: 'YES' | 'NO' | 'UNKNOWN';
    };
};

export class GeminiProvider {
    private apiKey: string;

    constructor() {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('Missing GEMINI_API_KEY');
        this.apiKey = key;
    }

    private async fetchGemini(prompt: string, useJson: boolean = false): Promise<string | null> {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;
            const body: any = {
                contents: [{ parts: [{ text: prompt }] }]
            };
            if (useJson) {
                body.generationConfig = { responseMimeType: "application/json" };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Gemini Direct API Error (${response.status}):`, errText);
                return null;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return text || null;
        } catch (e) {
            console.error('Gemini Fetch Error:', e);
            return null;
        }
    }

    async synthesizeIdeas(countryName: string, searchResults: any[]): Promise<GeminiIdea[]> {
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
        
        OUTPUT SCHEMA (JSON):
        {
          "title_es": "Short catchy title",
          "idea_summary": "2-4 lines explanation",
          "why_pearl": "Bullets why it is a gem",
          "pearl_score": number (0-100),
          "execution_steps": ["step1", "step2"],
          "faceless_script": {"hook": "", "body": "", "cta": ""},
          "monetization_options": ["option1", "option2"],
          "friction_notes": "explanation",
          "cost_notes": "explanation",
          "cost_level": "LOW|MED|HIGH",
          "effort_level": "LOW|MED|HIGH",
          "faceless_fit": number (0-10),
          "tags": ["tag1"],
          "sources": ["url1", "url2"],
          "verified": boolean
        }

        Input Context:
        ${context}

        Output a JSON Array of objects matching the schema above.
        `;

        const text = await this.fetchGemini(prompt, true);
        if (!text) return [];

        try {
            console.log('[Gemini] Raw Response Text (first 200):', text.slice(0, 200));
            // Resilience: Strip markdown if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const raw = JSON.parse(cleanText);
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
                            summary_es: pearl.idea_summary, // ENSURE THIS EXISTS
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
                            evidence_summary: pearl.evidence_summary || 'Extracted from search',
                            created_at: new Date().toISOString(),
                            // Initialize ProofPack (Phase B)
                            proof_pack: pearl.proof_pack || { evidence_items: [], confidence_score: 0, gaps: [] }
                        });
                    } else {
                        console.error('[Gemini] safeParse Failed for item:', item.title_es, parsed.error);
                    }
                }
            }
            return results;
        } catch (e) {
            console.error('Gemini Synthesis Parse Failed:', e);
            return [];
        }
    }

    async generateIdeaChat(title: string, summary: string, sources: string[]): Promise<string> {
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
        (Explain the hidden value. "Es una oportunidad única because...")

        ## Paso a Paso 🚀
        (Explain how to execute it logically. Use bullets but explain each step well.)

        ## Guion para Redes (30-60s) 🎬
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

        const text = await this.fetchGemini(prompt, false);
        return text || "Error generating chat report. Please try again.";
    }

    async adaptToMiami(title: string, summary: string, sources: string[]): Promise<string> {
        return this.generateIdeaChat(title, summary, sources); // Alias for now
    }

    async generateExperimentPack(prompt: string): Promise<any | null> {
        const text = await this.fetchGemini(prompt, true);
        if (!text) return null;
        try {
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error('Experiment Pack JSON Parse Failed:', e);
            return null;
        }
    }
}

export function generateFingerprint(idea: any): string {
    const title = idea.title_es || idea.name || 'Unknown';
    const source = idea.sources?.[0] || idea.source_url || '';
    const input = `${title.toLowerCase().trim()}|${source.trim()}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}
