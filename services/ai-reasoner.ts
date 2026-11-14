import { EvidenceItem, ExtractedClaim } from '@/types';

export interface SemanticAssessment {
  evidenceAssessments: Array<{
    id: string;
    relevant: boolean;
    stance: 'supports' | 'refutes' | 'neutral' | 'mentions';
  }>;
  editorialSummary?: string;
}

/**
 * Optional LLM-backed semantic evidence analyzer (supports GEMINI_API_KEY or OPENAI_API_KEY).
 * Strictly operates ONLY on retrieved evidence items — zero hallucinated sources.
 */
export class AIReasoner {
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
  }

  async refineEvidenceStances(
    claims: ExtractedClaim[],
    evidence: EvidenceItem[]
  ): Promise<{ evidence: EvidenceItem[]; summaryOverride?: string }> {
    if (!this.isConfigured() || claims.length === 0 || evidence.length === 0) {
      return { evidence };
    }

    const promptPayload = {
      claims: claims.map((c) => c.text),
      evidence: evidence.slice(0, 10).map((e) => ({
        id: e.id,
        domain: e.sourceDomain,
        date: e.sourceDate || null,
        title: e.sourceTitle,
        snippet: e.sourceSnippet,
      })),
    };

    const systemInstruction = `You are a strict investigative fact-checking editor.
Analyze the claims against ONLY the provided retrieved evidence records.
Do NOT invent facts or sources.
For each evidence item, determine:
- "relevant": true if it actually addresses the claim topic/entities, false if unrelated noise.
- "stance": "supports" (directly corroborates the exact claim including numbers/direction), "refutes" (denies, debunks, shows opposite action, or flags exaggeration like preliminary mouse trials vs 100% cure), "neutral" (contextual/mixed), or "mentions" (tangential).
Also write a concise 1-2 sentence objective "editorialSummary" in Arabic grounded strictly in the provided evidence.
Respond ONLY with valid JSON: {"evidenceAssessments":[{"id":"...","relevant":true,"stance":"supports|refutes|neutral|mentions"}],"editorialSummary":"..."}`;

    try {
      let jsonText = '';
      const geminiKey = process.env.GEMINI_API_KEY?.trim();
      const openaiKey = process.env.OPENAI_API_KEY?.trim();

      if (geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemInstruction}\n\nINPUT:\n${JSON.stringify(promptPayload)}` }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(5500),
          }
        );
        if (res.ok) {
          const data = await res.json();
          jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } else if (openaiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: JSON.stringify(promptPayload) },
            ],
          }),
          signal: AbortSignal.timeout(5500),
        });
        if (res.ok) {
          const data = await res.json();
          jsonText = data?.choices?.[0]?.message?.content || '';
        }
      }

      if (!jsonText) return { evidence };

      const parsed = JSON.parse(jsonText) as SemanticAssessment;
      const map = new Map<string, { relevant: boolean; stance: EvidenceItem['stance'] }>();
      for (const a of parsed.evidenceAssessments || []) {
        if (a?.id) {
          map.set(a.id, { relevant: Boolean(a.relevant), stance: a.stance });
        }
      }

      const refined = evidence
        .filter((ev) => {
          const assessed = map.get(ev.id);
          return assessed ? assessed.relevant || ev.sourceType === 'factcheck' : true;
        })
        .map((ev) => {
          const assessed = map.get(ev.id);
          if (!assessed) return ev;
          return { ...ev, stance: assessed.stance };
        });

      return {
        evidence: refined,
        summaryOverride: parsed.editorialSummary?.trim() || undefined,
      };
    } catch {
      return { evidence };
    }
  }
}

export const globalAIReasoner = new AIReasoner();
