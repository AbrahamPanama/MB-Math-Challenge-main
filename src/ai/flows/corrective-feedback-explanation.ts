'use server';
/**
 * @fileOverview Provides corrective feedback and step-by-step explanations for incorrect math problems.
 *
 * - correctiveFeedbackExplanation - A function that generates a clear explanation for a math problem.
 * - CorrectiveFeedbackExplanationInput - The input type for the correctiveFeedbackExplanation function.
 * - CorrectiveFeedbackExplanationOutput - The return type for the correctiveFeedbackExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CorrectiveFeedbackExplanationInputSchema = z.object({
  problem: z.string().describe('The math problem presented to the child.'),
  childAnswer: z.string().describe('The child\'s incorrect answer.'),
  correctAnswer: z.string().describe('The actual correct answer to the problem.'),
  skillArea: z
    .string()
    .describe(
      'The specific math skill area (e.g., "Multiplication Tables", "Two-Digit Addition", "Fractions", "Divisibility Rules"). This helps tailor the explanation.'
    ),
});
export type CorrectiveFeedbackExplanationInput = z.infer<
  typeof CorrectiveFeedbackExplanationInputSchema
>;

const CorrectiveFeedbackExplanationOutputSchema = z.object({
  explanation:
    z.string().describe(
      'A clear, concise, step-by-step explanation of the correct answer, no more than 2-3 short lines, suitable for primary school children.'
    ),
  microStrategyTip:
    z.string().optional().describe(
      'An optional very short micro-strategy tip related to the problem. Omit if not relevant.'
    ),
});
export type CorrectiveFeedbackExplanationOutput = z.infer<
  typeof CorrectiveFeedbackExplanationOutputSchema
>;

export async function correctiveFeedbackExplanation(
  input: CorrectiveFeedbackExplanationInput
): Promise<CorrectiveFeedbackExplanationOutput> {
  return correctiveFeedbackExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'correctiveFeedbackExplanationPrompt',
  input: {schema: CorrectiveFeedbackExplanationInputSchema},
  output: {schema: CorrectiveFeedbackExplanationOutputSchema},
  prompt: `You are a helpful and encouraging math tutor for primary school children (ages 6-12).

Given the following math problem, the child's incorrect answer, and the correct answer, your task is to provide a clear, concise, step-by-step explanation of how to arrive at the correct answer. The explanation should be easy for a child to understand, encouraging, and no more than 2-3 short lines long.

Also, provide a very short, optional micro-strategy tip related to the problem. If no tip is relevant or beneficial, omit it from the response.

Math Skill Area: {{{skillArea}}}
Problem: {{{problem}}}
Child's Answer: {{{childAnswer}}}
Correct Answer: {{{correctAnswer}}}`,
});

const correctiveFeedbackExplanationFlow = ai.defineFlow(
  {
    name: 'correctiveFeedbackExplanationFlow',
    inputSchema: CorrectiveFeedbackExplanationInputSchema,
    outputSchema: CorrectiveFeedbackExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
