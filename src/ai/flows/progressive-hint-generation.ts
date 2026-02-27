'use server';
/**
 * @fileOverview A flow to generate progressive hints for math problems.
 *
 * - generateProgressiveHint - A function that generates a math hint based on the requested level.
 * - ProgressiveHintInput - The input type for the generateProgressiveHint function.
 * - ProgressiveHintOutput - The return type for the generateProgressiveHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProgressiveHintInputSchema = z.object({
  problem: z.string().describe('The math problem for which to generate a hint.'),
  hintLevel:
    z.number()
      .int()
      .min(1)
      .max(3)
      .describe('The level of hint requested (1: gentle reminder, 2: step breakdown, 3: worked example).'),
  incorrectAnswer: z.string().optional().describe('The child\'s incorrect answer, if any, to help tailor the hint.')
});
export type ProgressiveHintInput = z.infer<typeof ProgressiveHintInputSchema>;

const ProgressiveHintOutputSchema = z.object({
  hint: z.string().describe('The generated hint for the math problem.')
});
export type ProgressiveHintOutput = z.infer<typeof ProgressiveHintOutputSchema>;

export async function generateProgressiveHint(
  input: ProgressiveHintInput
): Promise<ProgressiveHintOutput> {
  return progressiveHintFlow(input);
}

const progressiveHintPrompt = ai.definePrompt({
  name: 'progressiveHintPrompt',
  input: { schema: ProgressiveHintInputSchema },
  output: { schema: ProgressiveHintOutputSchema },
  prompt: `You are a helpful math tutor for primary school children (ages 6-12). Your goal is to provide hints that guide the child to solve the problem themselves, without giving away the direct answer or the final solution.

Here is the math problem: {{{problem}}}

The child needs a hint of level {{{hintLevel}}}.

Hint Levels:
- Level 1 (Gentle Reminder/Strategy): Provide a general tip, a reminder of a relevant math concept, or a high-level strategy to approach the problem. Do NOT give specific steps or calculations.
- Level 2 (Step Breakdown/Guiding Questions): Break down the problem into smaller, logical steps or ask guiding questions that lead the child through the process. Still, do NOT give the direct answer or full solution.
- Level 3 (Worked Example/First Step): Provide a worked example for a *similar* but different problem, or clearly explain the very first step of solving the given problem without completing it. Do NOT give the final answer.

If the child provided an incorrect answer, here it is (use this to understand common misconceptions, but do not directly comment on its correctness in the hint unless it helps guide them to the right path without giving away the answer): {{{incorrectAnswer}}}

Based on the hint level, generate a helpful hint for the child.`,
});

const progressiveHintFlow = ai.defineFlow(
  {
    name: 'progressiveHintFlow',
    inputSchema: ProgressiveHintInputSchema,
    outputSchema: ProgressiveHintOutputSchema,
  },
  async (input) => {
    const { output } = await progressiveHintPrompt(input);
    if (!output) {
      throw new Error('Failed to generate hint.');
    }
    return output;
  }
);
