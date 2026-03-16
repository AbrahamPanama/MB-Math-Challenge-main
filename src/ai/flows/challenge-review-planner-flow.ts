'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChallengeReviewPlannerInputSchema = z.object({
  category: z.string(),
  subskillId: z.string(),
  promptText: z.string(),
  lastStudentAnswer: z.string().optional(),
  misconceptionTags: z.array(z.string()),
  scheduleIndex: z.number().int(),
  status: z.string(),
});
export type ChallengeReviewPlannerInput = z.infer<
  typeof ChallengeReviewPlannerInputSchema
>;

const ChallengeReviewPlannerOutputSchema = z.object({
  variantFocus: z.string(),
  studentMessage: z.string(),
  dueInSessions: z.number().int(),
});
export type ChallengeReviewPlannerOutput = z.infer<
  typeof ChallengeReviewPlannerOutputSchema
>;

export async function planChallengeReview(
  input: ChallengeReviewPlannerInput
): Promise<ChallengeReviewPlannerOutput> {
  return challengeReviewPlannerFlow(input);
}

const challengeReviewPlannerPrompt = ai.definePrompt({
  name: 'challengeReviewPlannerPrompt',
  input: { schema: ChallengeReviewPlannerInputSchema },
  output: { schema: ChallengeReviewPlannerOutputSchema },
  prompt: `Eres una tutora de matemáticas para primaria. Tu tarea es decidir cómo debería volver a aparecer un reto en una sesión futura.

Datos del reto:
- categoría: {{{category}}}
- subskill: {{{subskillId}}}
- problema original: {{{promptText}}}
- última respuesta del estudiante: {{{lastStudentAnswer}}}
- posibles errores: {{#each misconceptionTags}}{{this}}, {{/each}}
- etapa de revisión actual: {{{scheduleIndex}}}
- estado: {{{status}}}

Devuelve:
- "variantFocus": en una sola frase, qué variante conviene mostrar después.
- "studentMessage": una frase breve para el estudiante explicando qué volverá a practicar.
- "dueInSessions": un entero pequeño entre 1 y 7.`,
});

const challengeReviewPlannerFlow = ai.defineFlow(
  {
    name: 'challengeReviewPlannerFlow',
    inputSchema: ChallengeReviewPlannerInputSchema,
    outputSchema: ChallengeReviewPlannerOutputSchema,
  },
  async (input) => {
    const { output } = await challengeReviewPlannerPrompt(input);
    if (!output) {
      throw new Error('Failed to plan challenge review.');
    }
    return output;
  }
);
