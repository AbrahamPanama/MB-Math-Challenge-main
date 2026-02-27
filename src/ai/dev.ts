import { config } from 'dotenv';
config();

import '@/ai/flows/corrective-feedback-explanation.ts';
import '@/ai/flows/progressive-hint-generation.ts';
import '@/ai/flows/smart-practice-problem-generation.ts';