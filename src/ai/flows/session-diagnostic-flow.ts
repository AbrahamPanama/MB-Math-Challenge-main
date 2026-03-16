'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AttemptInsightSchema = z.object({
  attemptId: z.string(),
  promptText: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  explanation: z.string(),
  microStrategyTip: z.string().optional(),
});

const SessionDiagnosticInputSchema = z.object({
  category: z.string(),
  gradeLevel: z.number().int(),
  goal: z.string(),
  dueCount: z.number().int(),
  attempts: z.array(
    z.object({
      attemptId: z.string(),
      promptText: z.string(),
      userAnswer: z.string(),
      correctAnswer: z.string(),
      isCorrect: z.boolean(),
      subskillId: z.string(),
      misconceptionTags: z.array(z.string()),
      hintUsage: z.number().int(),
    })
  ),
});
export type SessionDiagnosticInput = z.infer<typeof SessionDiagnosticInputSchema>;

const SessionDiagnosticOutputSchema = z.object({
  mastered: z.array(z.string()),
  struggles: z.array(z.string()),
  whyItHappened: z.string(),
  strategy: z.string(),
  nextChallenge: z.string(),
  nextMission: z.string(),
  encouragement: z.string(),
  reviewPreview: z.string(),
  attemptInsights: z.array(AttemptInsightSchema),
});
export type SessionDiagnosticOutput = z.infer<typeof SessionDiagnosticOutputSchema>;

export async function generateSessionDiagnostic(
  input: SessionDiagnosticInput
): Promise<SessionDiagnosticOutput> {
  return sessionDiagnosticFlow(input);
}

const sessionDiagnosticPrompt = ai.definePrompt({
  name: 'sessionDiagnosticPrompt',
  input: { schema: SessionDiagnosticInputSchema },
  output: { schema: SessionDiagnosticOutputSchema },
  prompt: `Eres una tutora de matemáticas para primaria. Analiza una sesión de práctica y devuelve un resumen final breve, claro y accionable para un niño o niña de 6 a 12 años.

Objetivos:
- Reconocer fortalezas reales.
- Explicar dónde costó y por qué.
- Proponer una estrategia concreta para la próxima sesión.
- Anticipar el reto que volverá a aparecer.
- Mantener un tono cálido, preciso y motivador.

Categoría: {{{category}}}
Grado: {{{gradeLevel}}}
Meta elegida por el estudiante: {{{goal}}}
Cantidad de retos pendientes/due: {{{dueCount}}}

Intentos de la sesión:
{{#each attempts}}
- id: {{this.attemptId}}
  problema: {{this.promptText}}
  respuesta del estudiante: {{this.userAnswer}}
  respuesta correcta: {{this.correctAnswer}}
  acertó: {{this.isCorrect}}
  subskill: {{this.subskillId}}
  posibles errores: {{#each this.misconceptionTags}}{{this}}, {{/each}}
  hint usado: {{this.hintUsage}}
{{/each}}

Instrucciones:
- "mastered" y "struggles" deben tener como máximo 3 elementos cada uno.
- "attemptInsights" debe explicar solo los 2 o 3 errores más importantes.
- "whyItHappened", "strategy", "nextChallenge", "nextMission", "encouragement" y "reviewPreview" deben ser frases cortas, no párrafos largos.
- Nunca avergüences al estudiante.
- No des respuestas inventadas; usa solo la información disponible.`,
});

const sessionDiagnosticFlow = ai.defineFlow(
  {
    name: 'sessionDiagnosticFlow',
    inputSchema: SessionDiagnosticInputSchema,
    outputSchema: SessionDiagnosticOutputSchema,
  },
  async (input) => {
    const { output } = await sessionDiagnosticPrompt(input);
    if (!output) {
      throw new Error('Failed to generate session diagnostic.');
    }
    return output;
  }
);
