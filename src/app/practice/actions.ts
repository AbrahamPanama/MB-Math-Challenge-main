'use server';

import { planChallengeReview } from '@/ai/flows/challenge-review-planner-flow';
import { correctiveFeedbackExplanation } from '@/ai/flows/corrective-feedback-explanation';
import { generateProgressiveHint } from '@/ai/flows/progressive-hint-generation';
import { generateSessionDiagnostic } from '@/ai/flows/session-diagnostic-flow';
import { buildFallbackSessionDiagnostic } from '@/lib/practice-engine';
import type {
  AttemptRecord,
  SessionDiagnostic,
} from '@/lib/types';

type SessionInsightInput = {
  category: string;
  gradeLevel: number;
  goal: string;
  dueCount: number;
  attempts: AttemptRecord[];
  challengeDrafts: Array<{
    challengeId: string;
    category: string;
    subskillId: string;
    promptText: string;
    lastStudentAnswer?: string;
    misconceptionTags: string[];
    scheduleIndex: number;
    status: string;
  }>;
};

type SessionInsightResult = {
  diagnostic: SessionDiagnostic;
  challengeUpdates: Array<{
    challengeId: string;
    variantFocus?: string;
    lastStrategyTip?: string;
    dueInSessions?: number;
  }>;
};

export async function generateSessionInsightsAction(
  input: SessionInsightInput
): Promise<SessionInsightResult> {
  const fallback = buildFallbackSessionDiagnostic({
    attempts: input.attempts,
    goal: input.goal,
    dueCount: input.dueCount,
  });

  let diagnostic: SessionDiagnostic = fallback;

  try {
    const aiDiagnostic = await generateSessionDiagnostic({
      category: input.category,
      gradeLevel: input.gradeLevel,
      goal: input.goal,
      dueCount: input.dueCount,
      attempts: input.attempts.map((attempt) => ({
        attemptId: attempt.id,
        promptText: attempt.promptText,
        userAnswer: attempt.userAnswer,
        correctAnswer: attempt.correctAnswer,
        isCorrect: attempt.isCorrect,
        subskillId: attempt.subskillId,
        misconceptionTags: attempt.misconceptionTags,
        hintUsage: attempt.hintUsage,
      })),
    });

    diagnostic = {
      generatedBy: 'ai',
      ...aiDiagnostic,
    };
  } catch {
    diagnostic = fallback;
  }

  const keyIncorrectAttempts = input.attempts.filter((attempt) => !attempt.isCorrect).slice(0, 3);
  if (keyIncorrectAttempts.length > 0) {
    const explanationResults = await Promise.allSettled(
      keyIncorrectAttempts.map((attempt) =>
        correctiveFeedbackExplanation({
          problem: attempt.promptText,
          childAnswer: attempt.userAnswer,
          correctAnswer: attempt.correctAnswer,
          skillArea: attempt.subskillId,
        })
      )
    );

    const insightMap = new Map(
      diagnostic.attemptInsights.map((insight) => [insight.attemptId, insight])
    );

    explanationResults.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const attempt = keyIncorrectAttempts[index];
      insightMap.set(attempt.id, {
        attemptId: attempt.id,
        promptText: attempt.promptText,
        userAnswer: attempt.userAnswer,
        correctAnswer: attempt.correctAnswer,
        explanation: result.value.explanation,
        microStrategyTip: result.value.microStrategyTip,
      });
    });

    diagnostic = {
      ...diagnostic,
      attemptInsights: Array.from(insightMap.values()).slice(0, 3),
    };
  }

  const challengePlanResults = await Promise.allSettled(
    input.challengeDrafts.slice(0, 3).map((challenge) =>
      planChallengeReview({
        category: challenge.category,
        subskillId: challenge.subskillId,
        promptText: challenge.promptText,
        lastStudentAnswer: challenge.lastStudentAnswer,
        misconceptionTags: challenge.misconceptionTags,
        scheduleIndex: challenge.scheduleIndex,
        status: challenge.status,
      })
    )
  );

  const challengeUpdates = challengePlanResults.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    return [
      {
        challengeId: input.challengeDrafts[index].challengeId,
        variantFocus: result.value.variantFocus,
        lastStrategyTip: result.value.studentMessage,
        dueInSessions: result.value.dueInSessions,
      },
    ];
  });

  return {
    diagnostic,
    challengeUpdates,
  };
}

export async function generateHintAction(input: {
  problem: string;
  hintLevel: 1 | 2 | 3;
  incorrectAnswer?: string;
}): Promise<{ hint: string }> {
  return generateProgressiveHint(input);
}
