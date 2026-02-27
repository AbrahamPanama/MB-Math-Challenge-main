'use server';
/**
 * @fileOverview A Genkit flow for generating math problems for the RetoMates "Smart Practice" mode.
 *
 * - generateSmartPracticeProblem - A function that generates a math problem tailored to a specific skill level and area.
 * - SmartPracticeProblemGenerationInput - The input type for the generateSmartPracticeProblem function.
 * - SmartPracticeProblemGenerationOutput - The return type for the generateSmartPracticeProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartPracticeProblemGenerationInputSchema = z.object({
  skillArea: z
    .enum([
      'multiplication',
      'addition_subtraction',
      'fractions',
      'divisibility_rules',
    ])
    .describe('The broad skill area for the math problem.'),
  level: z
    .string()
    .describe(
      'The specific difficulty level within the skill area (e.g., L1 for multiplication, A2 for addition, F3 for fractions, D1 for divisibility).'
    ),
  additionalContext: z
    .string()
    .optional()
    .describe(
      'Any additional instructions or context for problem generation (e.g., "ensure it involves borrowing", "avoid specific factors", "focus on proper fractions").'
    ),
});
export type SmartPracticeProblemGenerationInput = z.infer<
  typeof SmartPracticeProblemGenerationInputSchema
>;

const SmartPracticeProblemGenerationOutputSchema = z.object({
  question: z
    .string()
    .describe('The math problem question, clearly formatted for a child.'),
  correctAnswer: z
    .string()
    .describe('The correct answer to the math problem.'),
  problemType: z
    .string()
    .describe(
      'A brief description of the specific type of problem generated (e.g., "Direct Multiplication", "Missing Factor", "Addition No Carry", "Simplify Fraction").'
    ),
  subskillId: z
    .string()
    .describe(
      'An identifier for the specific subskill related to this problem (e.g., "multiplication-l1", "addition-a2", "fractions-f3", "divisibility-d1").'
    ),
});
export type SmartPracticeProblemGenerationOutput = z.infer<
  typeof SmartPracticeProblemGenerationOutputSchema
>;

export async function generateSmartPracticeProblem(
  input: SmartPracticeProblemGenerationInput
): Promise<SmartPracticeProblemGenerationOutput> {
  return smartPracticeProblemGenerationFlow(input);
}

const problemGenerationPrompt = ai.definePrompt({
  name: 'smartPracticeProblemGenerationPrompt',
  input: {schema: SmartPracticeProblemGenerationInputSchema},
  output: {schema: SmartPracticeProblemGenerationOutputSchema},
  prompt: `You are an expert math problem generator for primary school children (ages 6-12).
Your task is to generate a single math problem based on the provided skill area and difficulty level.
The problem should be engaging, appropriate for the specified age group, and focus on the requested skill.
Ensure the problem is always new and not a repetition of very common textbook examples.
Provide the question, the correct answer, the specific problem type, and a subskill identifier.

Skill Area: {{{skillArea}}}
Level: {{{level}}}
{{#if additionalContext}}
Additional Context: {{{additionalContext}}}
{{/if}}

Based on the above, generate a math problem in JSON format. Ensure the 'subskillId' is a hyphen-separated string combining the skill area and level (e.g., "multiplication-l1").`
});

const smartPracticeProblemGenerationFlow = ai.defineFlow(
  {
    name: 'smartPracticeProblemGenerationFlow',
    inputSchema: SmartPracticeProblemGenerationInputSchema,
    outputSchema: SmartPracticeProblemGenerationOutputSchema,
  },
  async (input) => {
    const {output} = await problemGenerationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate problem.');
    }
    return output;
  }
);
