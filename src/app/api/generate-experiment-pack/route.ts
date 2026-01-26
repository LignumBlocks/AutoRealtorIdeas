import { NextResponse } from 'next/server';
import { GeminiProvider } from '@/lib/run-engine/providers/gemini';

import { enforceCompliance } from '@/lib/run-engine/compliance';

export async function POST(req: Request) {
  try {
    const { ideaTitle, ideaSummary, country, topic } = await req.json();

    if (!ideaTitle || !ideaSummary) {
      return NextResponse.json({ ok: false, error: 'Missing idea details' }, { status: 400 });
    }

    const gemini = new GeminiProvider();

    const prompt = `
        ROLE: Elite Real Estate Marketing Strategist for Miami Spanish-speaking sellers.
        OUTPUT: ONLY valid JSON. No markdown, no explanations.
        
        CREATE Experiment Pack for:
        - Title: ${ideaTitle}
        - Summary: ${ideaSummary}
        - Market: ${country}
        - Pain Point: ${topic || 'Real Estate Sellers'}

        EXACT JSON STRUCTURE (MUST match perfectly):
        {
          "landing_copy": {
            "headlines": ["Headline impactante 1", "Headline impactante 2", "Headline impactante 3"],
            "bullets": ["Beneficio 1", "Beneficio 2", "Beneficio 3", "Beneficio 4", "Beneficio 5"],
            "faq": [
              {"q": "Pregunta frecuente 1", "a": "Respuesta completa 1"},
              {"q": "Pregunta frecuente 2", "a": "Respuesta completa 2"},
              {"q": "Pregunta frecuente 3", "a": "Respuesta completa 3"},
              {"q": "Pregunta frecuente 4", "a": "Respuesta completa 4"},
              {"q": "Pregunta frecuente 5", "a": "Respuesta completa 5"}
            ],
            "cta": "Llamado a acción claro y directo"
          },
          "shorts_scripts": [
            {"title": "Video 1", "hook": "Gancho inicial", "body": "Contenido de valor", "cta": "Cierre persuasivo", "caption": "Caption con hashtags"},
            {"title": "Video 2", "hook": "Gancho inicial", "body": "Contenido de valor", "cta": "Cierre persuasivo", "caption": "Caption con hashtags"},
            {"title": "Video 3", "hook": "Gancho inicial", "body": "Contenido de valor", "cta": "Cierre persuasivo", "caption": "Caption con hashtags"}
          ],
          "whatsapp_scripts": {
            "first_contact": "Mensaje inicial completo para primer contacto",
            "follow_up_24h": "Mensaje de seguimiento día 1 completo",
            "follow_up_72h": "Mensaje de seguimiento día 3 completo"
          },
          "distribution_checklist": [
            "Paso 1: Acción específica",
            "Paso 2: Acción específica",
            "Paso 3: Acción específica",
            "Paso 4: Acción específica",
            "Paso 5: Acción específica"
          ],
          "metrics_tracker": {
            "goal": "Objetivo principal de la campaña",
            "target_optins": 10,
            "target_convos": 3,
            "target_citas": 1,
            "weak_signal": "Qué indica que la campaña no funciona",
            "iterate_if": "Qué cambiar si weak_signal aparece"
          },
          "iteration_plan": {
            "if_low_optins": "Acción específica",
            "if_low_convos": "Acción específica",
            "if_no_citas": "Acción específica",
            "kill_criteria": "Cuándo abandonar este experimento"
          },
          "compliance_block": "PENDING"
        }

        PROHIBIDO: garantizado, seguro, 72h, mejor precio, asesoría legal/fiscal directa.
        IDIOMA: Español profesional.
        `;

    const rawPack = await gemini.generateExperimentPack(prompt);
    if (!rawPack) return NextResponse.json({ ok: false, error: 'Gemini failed to generate JSON pack' }, { status: 500 });

    // Phase A: Enforce Compliance Sanitizer
    const { pack, logicProof } = enforceCompliance(rawPack);

    // Phase B: Completeness Guard (Prevent nulls/missing fields - STRICT)
    const ensureArray = (arr: any, def: any[], minLen: number) => {
      if (!Array.isArray(arr) || arr.length < minLen) {
        const result = arr || [];
        while (result.length < minLen) result.push(def[result.length % def.length]);
        return result;
      }
      return arr.slice(0, minLen);
    };

    const finalPack = {
      landing_copy: {
        headlines: ensureArray(pack.landing_copy?.headlines, ["Headline 1", "Headline 2", "Headline 3"], 3),
        bullets: ensureArray(pack.landing_copy?.bullets, ["Beneficio clave"], 5),
        faq: ensureArray(pack.landing_copy?.faq, [{ q: "Pregunta", a: "Respuesta" }], 5),
        cta: pack.landing_copy?.cta || "Contactar ahora"
      },
      shorts_scripts: ensureArray(pack.shorts_scripts, [{ title: "Video", hook: "Hook", body: "Body", cta: "CTA", caption: "Caption" }], 3),
      whatsapp_scripts: {
        first_reply: pack.whatsapp_scripts?.first_contact || pack.whatsapp_scripts?.first_reply || "Hola, gracias por tu interés...",
        followup_24h: pack.whatsapp_scripts?.follow_up_24h || pack.whatsapp_scripts?.followup_24h || "Hola, seguimiento día 1...",
        followup_72h: pack.whatsapp_scripts?.follow_up_72h || pack.whatsapp_scripts?.followup_72h || "Hola, seguimiento día 3..."
      },
      distribution_checklist: ensureArray(pack.distribution_checklist, ["Paso de distribución"], 5),
      metrics_tracker: {
        goal: pack.metrics_tracker?.goal || "Generar leads cualificados",
        target_optins: 10,
        target_convos: 3,
        target_citas: 1,
        weak_signal: pack.metrics_tracker?.weak_signal || "Menos de 5 opt-ins en 48h",
        iterate_if: pack.metrics_tracker?.iterate_if || "Cambiar copy de headlines"
      },
      iteration_plan: pack.iteration_plan || {
        if_low_optins: "Revisar headlines y CTA",
        if_low_convos: "Revisar WhatsApp scripts",
        if_no_citas: "Calificar mejor los leads",
        kill_criteria: "Sin ninguna cita después de 2 semanas"
      },
      compliance_block: pack.compliance_block // Already set by enforceCompliance
    };

    console.log('[Compliance] Logic Proof:', logicProof);

    return NextResponse.json({ ok: true, pack: finalPack, logicProof });

  } catch (e: any) {
    console.error('Experiment Pack Gen Failed:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
