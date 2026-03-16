import {
  REVIEW_INTERVALS,
  categoryLabels,
  getQuestionThresholdMs,
} from './practice-engine';
import type {
  AttemptRecord,
  Category,
  CategoryStats,
  ChallengeCounts,
  ChallengeRecord,
  GradeLevel,
  PracticeSessionPayload,
  SaveSlot,
  SessionDiagnostic,
  SessionSummary,
  Skill,
  User,
  UserProgress,
} from './types';

const SAVES_KEY = 'mm20-saves';
const ACTIVE_KEY = 'mm20-active-slot';

const ALL_CATEGORIES: Category[] = [
  'multiplication',
  'addition',
  'divisibility',
  'fractions',
  'combined',
];

const EMPTY_DIAGNOSTIC: SessionDiagnostic = {
  generatedBy: 'fallback',
  mastered: [],
  struggles: [],
  whyItHappened: '',
  strategy: '',
  nextChallenge: '',
  nextMission: '',
  encouragement: '',
  reviewPreview: '',
  attemptInsights: [],
};

function emptyCategoryStats(): CategoryStats {
  return {
    gamesPlayed: 0,
    bestTime: null,
    totalCorrect: 0,
    totalQuestions: 0,
    lastPlayed: null,
  };
}

function normalizeCategoryStats(raw: unknown): CategoryStats {
  const record = raw as Partial<CategoryStats> | undefined;
  return {
    gamesPlayed: Number(record?.gamesPlayed ?? 0),
    bestTime:
      typeof record?.bestTime === 'number' && Number.isFinite(record.bestTime)
        ? record.bestTime
        : null,
    totalCorrect: Number(record?.totalCorrect ?? 0),
    totalQuestions: Number(record?.totalQuestions ?? 0),
    lastPlayed: typeof record?.lastPlayed === 'string' ? record.lastPlayed : null,
  };
}

function normalizeDiagnostic(raw: unknown): SessionDiagnostic {
  const record = raw as Partial<SessionDiagnostic> | undefined;
  return {
    generatedBy: record?.generatedBy === 'ai' ? 'ai' : 'fallback',
    mastered: Array.isArray(record?.mastered)
      ? record.mastered.filter((item): item is string => typeof item === 'string')
      : [],
    struggles: Array.isArray(record?.struggles)
      ? record.struggles.filter((item): item is string => typeof item === 'string')
      : [],
    whyItHappened: typeof record?.whyItHappened === 'string' ? record.whyItHappened : '',
    strategy: typeof record?.strategy === 'string' ? record.strategy : '',
    nextChallenge: typeof record?.nextChallenge === 'string' ? record.nextChallenge : '',
    nextMission: typeof record?.nextMission === 'string' ? record.nextMission : '',
    encouragement: typeof record?.encouragement === 'string' ? record.encouragement : '',
    reviewPreview: typeof record?.reviewPreview === 'string' ? record.reviewPreview : '',
    attemptInsights: Array.isArray(record?.attemptInsights)
      ? record.attemptInsights.filter(
          (item): item is SessionDiagnostic['attemptInsights'][number] =>
            Boolean(item) &&
            typeof item.attemptId === 'string' &&
            typeof item.promptText === 'string' &&
            typeof item.userAnswer === 'string' &&
            typeof item.correctAnswer === 'string' &&
            typeof item.explanation === 'string'
        )
      : [],
  };
}

function normalizeSession(raw: unknown): SessionSummary | null {
  const record = raw as Partial<SessionSummary> | undefined;
  if (!record?.id || !record.category) return null;
  return {
    id: record.id,
    category: record.category,
    gradeLevel: (record.gradeLevel as GradeLevel) ?? 6,
    startedAt: typeof record.startedAt === 'string' ? record.startedAt : new Date().toISOString(),
    endedAt: typeof record.endedAt === 'string' ? record.endedAt : new Date().toISOString(),
    timeElapsedSec: Number(record.timeElapsedSec ?? 0),
    wasCompleted: Boolean(record.wasCompleted),
    totalQuestions: Number(record.totalQuestions ?? 0),
    correctCount: Number(record.correctCount ?? 0),
    accuracy: Number(record.accuracy ?? 0),
    goal: typeof record.goal === 'string' ? record.goal : 'Quiero seguir aprendiendo.',
    reflection: typeof record.reflection === 'string' ? record.reflection : undefined,
    reviewQuestions: Number(record.reviewQuestions ?? 0),
    newQuestions: Number(record.newQuestions ?? 0),
    challengeIdsTouched: Array.isArray(record.challengeIdsTouched)
      ? record.challengeIdsTouched.filter((item): item is string => typeof item === 'string')
      : [],
    challengeIdsMastered: Array.isArray(record.challengeIdsMastered)
      ? record.challengeIdsMastered.filter((item): item is string => typeof item === 'string')
      : [],
    challengeIdsCreated: Array.isArray(record.challengeIdsCreated)
      ? record.challengeIdsCreated.filter((item): item is string => typeof item === 'string')
      : [],
    diagnostic: normalizeDiagnostic(record.diagnostic),
  };
}

function normalizeAttempt(raw: unknown): AttemptRecord | null {
  const record = raw as Partial<AttemptRecord> | undefined;
  if (!record?.id || !record.sessionId || !record.category) return null;
  return {
    id: record.id,
    sessionId: record.sessionId,
    category: record.category,
    gradeLevel: (record.gradeLevel as GradeLevel) ?? 6,
    questionIndex: Number(record.questionIndex ?? 0),
    promptHtml: typeof record.promptHtml === 'string' ? record.promptHtml : '',
    promptText: typeof record.promptText === 'string' ? record.promptText : '',
    correctAnswer: typeof record.correctAnswer === 'string' ? record.correctAnswer : '',
    userAnswer: typeof record.userAnswer === 'string' ? record.userAnswer : '',
    isCorrect: Boolean(record.isCorrect),
    answeredAt: typeof record.answeredAt === 'string' ? record.answeredAt : new Date().toISOString(),
    timeSpentMs: Number(record.timeSpentMs ?? 0),
    attemptSource: record.attemptSource === 'review' ? 'review' : 'new',
    hintUsage:
      record.hintUsage === 1 || record.hintUsage === 2 || record.hintUsage === 3
        ? record.hintUsage
        : 0,
    challengeId: typeof record.challengeId === 'string' ? record.challengeId : null,
    reviewKey: typeof record.reviewKey === 'string' ? record.reviewKey : '',
    subskillId: typeof record.subskillId === 'string' ? record.subskillId : '',
    pattern: typeof record.pattern === 'string' ? record.pattern : '',
    difficulty:
      record.difficulty === 'easy' || record.difficulty === 'hard' ? record.difficulty : 'medium',
    challengeSeed:
      record.challengeSeed && typeof record.challengeSeed === 'object'
        ? (record.challengeSeed as AttemptRecord['challengeSeed'])
        : {},
    misconceptionTags: Array.isArray(record.misconceptionTags)
      ? record.misconceptionTags.filter((item): item is AttemptRecord['misconceptionTags'][number] => typeof item === 'string')
      : [],
  };
}

function normalizeChallenge(raw: unknown): ChallengeRecord | null {
  const record = raw as Partial<ChallengeRecord> | undefined;
  if (!record?.id || !record.category || !record.template) return null;
  return {
    id: record.id,
    category: record.category,
    gradeLevel: (record.gradeLevel as GradeLevel) ?? 6,
    subskillId: typeof record.subskillId === 'string' ? record.subskillId : '',
    pattern: typeof record.pattern === 'string' ? record.pattern : '',
    reviewKey: typeof record.reviewKey === 'string' ? record.reviewKey : '',
    template: record.template,
    misconceptionTags: Array.isArray(record.misconceptionTags)
      ? record.misconceptionTags.filter((item): item is ChallengeRecord['misconceptionTags'][number] => typeof item === 'string')
      : [],
    status:
      record.status === 'review' || record.status === 'mastered'
        ? record.status
        : 'active',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
    nextReviewSession:
      typeof record.nextReviewSession === 'number' ? record.nextReviewSession : null,
    scheduleIndex: Number(record.scheduleIndex ?? 0),
    consecutiveSuccesses: Number(record.consecutiveSuccesses ?? 0),
    attempts: Number(record.attempts ?? 0),
    successes: Number(record.successes ?? 0),
    failures: Number(record.failures ?? 0),
    variantFocus:
      typeof record.variantFocus === 'string' && record.variantFocus.length > 0
        ? record.variantFocus
        : 'Volverá con una variante cercana para comprobar si ya lo dominaste.',
    lastStudentAnswer:
      typeof record.lastStudentAnswer === 'string' ? record.lastStudentAnswer : undefined,
    lastStrategyTip:
      typeof record.lastStrategyTip === 'string' ? record.lastStrategyTip : undefined,
    lastReviewedAt:
      typeof record.lastReviewedAt === 'string' ? record.lastReviewedAt : undefined,
    masteredAt: typeof record.masteredAt === 'string' ? record.masteredAt : undefined,
    history: Array.isArray(record.history)
      ? record.history.filter(
          (item): item is ChallengeRecord['history'][number] =>
            Boolean(item) &&
            typeof item.sessionId === 'string' &&
            typeof item.attemptId === 'string' &&
            typeof item.answeredAt === 'string'
        )
      : [],
  };
}

function normalizeSaveSlot(raw: unknown, slotIndex: number): SaveSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Partial<SaveSlot>;
  if (!record.playerName) return null;
  const now = new Date().toISOString();
  const stats = ALL_CATEGORIES.reduce<Record<Category, CategoryStats>>((acc, category) => {
    acc[category] = normalizeCategoryStats(record.stats?.[category]);
    return acc;
  }, {} as Record<Category, CategoryStats>);

  return {
    id: Number(record.id ?? slotIndex + 1),
    playerName: record.playerName,
    gradeLevel: (record.gradeLevel as GradeLevel) ?? 6,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    lastPlayed: typeof record.lastPlayed === 'string' ? record.lastPlayed : now,
    totalGames: Number(record.totalGames ?? 0),
    totalCorrect: Number(record.totalCorrect ?? 0),
    totalQuestions: Number(record.totalQuestions ?? 0),
    stats,
    attempts: Array.isArray(record.attempts)
      ? record.attempts.map(normalizeAttempt).filter(Boolean) as AttemptRecord[]
      : [],
    sessions: Array.isArray(record.sessions)
      ? record.sessions.map(normalizeSession).filter(Boolean) as SessionSummary[]
      : [],
    challenges: Array.isArray(record.challenges)
      ? record.challenges.map(normalizeChallenge).filter(Boolean) as ChallengeRecord[]
      : [],
  };
}

function writeSaveSlots(slots: Array<SaveSlot | null>) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(slots));
}

const fallbackVariantFocus = (attempt: AttemptRecord): string => {
  const primary = attempt.misconceptionTags[0];
  switch (primary) {
    case 'fact_recall':
      return 'Volverá con la misma familia de factores para reforzar memoria y precisión.';
    case 'reverse_reasoning':
      return 'Volverá en formato inverso para practicar qué número falta y por qué.';
    case 'place_value':
      return 'Volverá con números parecidos para cuidar columnas y llevadas.';
    case 'divisibility_rule':
      return 'Volverá con la misma regla de divisibilidad en números cercanos.';
    case 'fraction_simplification':
      return 'Volverá con una fracción equivalente para revisar factor común.';
    case 'fraction_comparison':
      return 'Volverá con una comparación similar para estimar qué fracción es mayor.';
    case 'fraction_operation':
      return 'Volverá con fracciones del mismo tipo para repetir el procedimiento.';
    case 'operation_order':
      return 'Volverá con otra expresión parecida para repetir el orden de operaciones.';
    case 'time_pressure':
      return 'Volverá pronto, pero con la consigna de resolver con más calma.';
    default:
      return 'Volverá con una variante cercana para comprobar si ya lo dominaste.';
  }
};

const attemptNeedsChallenge = (attempt: AttemptRecord): boolean =>
  !attempt.isCorrect ||
  attempt.hintUsage >= 3 ||
  attempt.timeSpentMs > getQuestionThresholdMs(attempt.category, attempt.gradeLevel);

const historyOutcomeForAttempt = (
  attempt: AttemptRecord
): ChallengeRecord['history'][number]['outcome'] => {
  if (!attempt.isCorrect) return 'incorrect';
  if (attempt.hintUsage >= 3) return 'hinted';
  if (attempt.timeSpentMs > getQuestionThresholdMs(attempt.category, attempt.gradeLevel)) {
    return 'slow';
  }
  return 'correct';
};

const mergeTags = (
  current: ChallengeRecord['misconceptionTags'],
  next: AttemptRecord['misconceptionTags']
): ChallengeRecord['misconceptionTags'] =>
  Array.from(new Set([...current, ...next]));

const cloneChallenge = (challenge: ChallengeRecord): ChallengeRecord => ({
  ...challenge,
  template: {
    ...challenge.template,
    metadata: {
      ...challenge.template.metadata,
      challengeSeed: { ...challenge.template.metadata.challengeSeed },
      misconceptionHints: [...challenge.template.metadata.misconceptionHints],
    },
  },
  misconceptionTags: [...challenge.misconceptionTags],
  history: [...challenge.history],
});

const buildChallengeFromAttempt = (
  attempt: AttemptRecord,
  sessionOrdinal: number
): ChallengeRecord => ({
  id: crypto.randomUUID(),
  category: attempt.category,
  gradeLevel: attempt.gradeLevel,
  subskillId: attempt.subskillId,
  pattern: attempt.pattern,
  reviewKey: attempt.reviewKey,
  template: {
    promptHtml: attempt.promptHtml,
    promptText: attempt.promptText,
    correctAnswer: attempt.correctAnswer,
    type: attempt.pattern.includes('reverse') ? `reverse-${attempt.category}` : 'standard',
      metadata: {
        subskillId: attempt.subskillId,
        label: categoryLabels[attempt.category],
        pattern: attempt.pattern,
        difficulty: attempt.difficulty,
        reviewKey: attempt.reviewKey,
        challengeSeed: attempt.challengeSeed,
        misconceptionHints: attempt.misconceptionTags,
      },
  },
  misconceptionTags: [...attempt.misconceptionTags],
  status: 'active',
  createdAt: attempt.answeredAt,
  updatedAt: attempt.answeredAt,
  nextReviewSession: sessionOrdinal + REVIEW_INTERVALS[0],
  scheduleIndex: 0,
  consecutiveSuccesses: 0,
  attempts: 1,
  successes: attempt.isCorrect ? 1 : 0,
  failures: attempt.isCorrect ? 0 : 1,
  variantFocus: fallbackVariantFocus(attempt),
  lastStudentAnswer: attempt.userAnswer,
  history: [
    {
      sessionId: attempt.sessionId,
      attemptId: attempt.id,
      outcome: historyOutcomeForAttempt(attempt),
      timeSpentMs: attempt.timeSpentMs,
      hintUsage: attempt.hintUsage,
      answeredAt: attempt.answeredAt,
    },
  ],
});

const applyAttemptToChallenge = ({
  challenge,
  attempt,
  sessionOrdinal,
}: {
  challenge: ChallengeRecord;
  attempt: AttemptRecord;
  sessionOrdinal: number;
}): { challenge: ChallengeRecord; wasCreated: boolean; wasMastered: boolean } => {
  const updated = cloneChallenge(challenge);
  updated.updatedAt = attempt.answeredAt;
  updated.lastStudentAnswer = attempt.userAnswer;
  updated.misconceptionTags = mergeTags(updated.misconceptionTags, attempt.misconceptionTags);
  updated.variantFocus = fallbackVariantFocus(attempt);
  updated.attempts += 1;
  updated.history.push({
    sessionId: attempt.sessionId,
    attemptId: attempt.id,
    outcome: historyOutcomeForAttempt(attempt),
    timeSpentMs: attempt.timeSpentMs,
    hintUsage: attempt.hintUsage,
    answeredAt: attempt.answeredAt,
  });

  const wasRetador = attemptNeedsChallenge(attempt);
  let wasMastered = false;

  if (attempt.attemptSource === 'review') {
    updated.lastReviewedAt = attempt.answeredAt;
    if (attempt.isCorrect && !wasRetador) {
      updated.successes += 1;
      updated.consecutiveSuccesses += 1;
      if (updated.consecutiveSuccesses >= 2) {
        updated.status = 'mastered';
        updated.nextReviewSession = null;
        updated.masteredAt = attempt.answeredAt;
        wasMastered = true;
      } else {
        updated.status = 'review';
        updated.scheduleIndex = Math.min(
          updated.scheduleIndex + 1,
          REVIEW_INTERVALS.length - 1
        );
        updated.nextReviewSession = sessionOrdinal + REVIEW_INTERVALS[updated.scheduleIndex];
      }
    } else {
      updated.failures += attempt.isCorrect ? 0 : 1;
      updated.status = 'active';
      updated.consecutiveSuccesses = 0;
      updated.scheduleIndex = 0;
      updated.nextReviewSession = sessionOrdinal + REVIEW_INTERVALS[0];
      updated.masteredAt = undefined;
    }
  } else if (wasRetador) {
    updated.failures += attempt.isCorrect ? 0 : 1;
    updated.status = 'active';
    updated.consecutiveSuccesses = 0;
    updated.scheduleIndex = 0;
    updated.nextReviewSession = sessionOrdinal + REVIEW_INTERVALS[0];
    updated.masteredAt = undefined;
  } else if (attempt.isCorrect) {
    updated.successes += 1;
  }

  return { challenge: updated, wasCreated: false, wasMastered };
};

function upsertChallengesForAttempts({
  challenges,
  attempts,
  sessionOrdinal,
}: {
  challenges: ChallengeRecord[];
  attempts: AttemptRecord[];
  sessionOrdinal: number;
}): {
  challenges: ChallengeRecord[];
  touchedIds: string[];
  createdIds: string[];
  masteredIds: string[];
} {
  const nextChallenges = challenges.map(cloneChallenge);
  const touchedIds = new Set<string>();
  const createdIds = new Set<string>();
  const masteredIds = new Set<string>();

  attempts.forEach((attempt) => {
    const matchIndex =
      attempt.challengeId
        ? nextChallenges.findIndex((challenge) => challenge.id === attempt.challengeId)
        : nextChallenges.findIndex(
            (challenge) =>
              challenge.category === attempt.category &&
              challenge.reviewKey === attempt.reviewKey
          );

    if (attempt.attemptSource === 'review' && matchIndex >= 0) {
      const { challenge, wasMastered } = applyAttemptToChallenge({
        challenge: nextChallenges[matchIndex],
        attempt,
        sessionOrdinal,
      });
      nextChallenges[matchIndex] = challenge;
      touchedIds.add(challenge.id);
      if (wasMastered) masteredIds.add(challenge.id);
      return;
    }

    if (!attemptNeedsChallenge(attempt)) return;

    if (matchIndex >= 0) {
      const { challenge, wasMastered } = applyAttemptToChallenge({
        challenge: nextChallenges[matchIndex],
        attempt,
        sessionOrdinal,
      });
      nextChallenges[matchIndex] = challenge;
      touchedIds.add(challenge.id);
      if (wasMastered) masteredIds.add(challenge.id);
      return;
    }

    const created = buildChallengeFromAttempt(attempt, sessionOrdinal);
    nextChallenges.push(created);
    touchedIds.add(created.id);
    createdIds.add(created.id);
  });

  return {
    challenges: nextChallenges,
    touchedIds: Array.from(touchedIds),
    createdIds: Array.from(createdIds),
    masteredIds: Array.from(masteredIds),
  };
}

export function getSaveSlots(): Array<SaveSlot | null> {
  if (typeof window === 'undefined') return [null, null, null];
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw) as unknown[];
    const normalized = Array.from({ length: 3 }, (_, slotIndex) =>
      normalizeSaveSlot(parsed?.[slotIndex] ?? null, slotIndex)
    );
    writeSaveSlots(normalized);
    return normalized;
  } catch {
    return [null, null, null];
  }
}

export function createSave(
  slotIndex: number,
  playerName: string,
  gradeLevel: GradeLevel = 6
): SaveSlot {
  const slots = getSaveSlots();
  const now = new Date().toISOString();
  const stats = ALL_CATEGORIES.reduce<Record<Category, CategoryStats>>((acc, category) => {
    acc[category] = emptyCategoryStats();
    return acc;
  }, {} as Record<Category, CategoryStats>);

  const save: SaveSlot = {
    id: slotIndex + 1,
    playerName: playerName.trim() || `Jugador ${slotIndex + 1}`,
    gradeLevel,
    createdAt: now,
    lastPlayed: now,
    totalGames: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    stats,
    attempts: [],
    sessions: [],
    challenges: [],
  };

  slots[slotIndex] = save;
  writeSaveSlots(slots);
  setActiveSlot(slotIndex);
  return save;
}

export function getGradeLabel(grade: GradeLevel): string {
  const labels: Record<GradeLevel, string> = {
    3: '3.er Grado',
    4: '4.to Grado',
    5: '5.to Grado',
    6: '6.to Grado',
  };
  return labels[grade];
}

export function getCategoriesForGrade(grade: GradeLevel): Category[] {
  const base: Category[] = ['multiplication', 'addition'];
  if (grade >= 4) base.push('divisibility', 'combined');
  if (grade >= 5) base.push('fractions');
  return base;
}

export function deleteSave(slotIndex: number) {
  const slots = getSaveSlots();
  slots[slotIndex] = null;
  writeSaveSlots(slots);
  if (getActiveSlotIndex() === slotIndex) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function getActiveSlotIndex(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ACTIVE_KEY);
  if (raw === null) return null;
  const idx = Number(raw);
  return Number.isNaN(idx) ? null : idx;
}

export function setActiveSlot(slotIndex: number) {
  localStorage.setItem(ACTIVE_KEY, String(slotIndex));
}

export function getActiveSave(): SaveSlot | null {
  const idx = getActiveSlotIndex();
  if (idx === null) return null;
  return getSaveSlots()[idx] ?? null;
}

export function recordPracticeSession(
  payload: PracticeSessionPayload
): SaveSlot | null {
  const idx = getActiveSlotIndex();
  if (idx === null) return null;
  const slots = getSaveSlots();
  const save = slots[idx];
  if (!save) return null;

  const sessionOrdinal = save.sessions.length + 1;
  const now = payload.session.endedAt;
  save.lastPlayed = now;
  save.totalGames += 1;
  save.totalCorrect += payload.session.correctCount;
  save.totalQuestions += payload.session.totalQuestions;

  const categoryStats = save.stats[payload.session.category];
  categoryStats.gamesPlayed += 1;
  categoryStats.totalCorrect += payload.session.correctCount;
  categoryStats.totalQuestions += payload.session.totalQuestions;
  categoryStats.lastPlayed = now;
  if (payload.session.wasCompleted && payload.session.correctCount >= 18) {
    if (
      categoryStats.bestTime === null ||
      payload.session.timeElapsedSec < categoryStats.bestTime
    ) {
      categoryStats.bestTime = payload.session.timeElapsedSec;
    }
  }

  const challengeUpdate = upsertChallengesForAttempts({
    challenges: save.challenges,
    attempts: payload.attempts,
    sessionOrdinal,
  });
  save.challenges = challengeUpdate.challenges;
  save.attempts = [...save.attempts, ...payload.attempts].slice(-600);
  save.sessions = [
    ...save.sessions,
    {
      ...payload.session,
      challengeIdsTouched: challengeUpdate.touchedIds,
      challengeIdsMastered: challengeUpdate.masteredIds,
      challengeIdsCreated: challengeUpdate.createdIds,
      diagnostic: payload.session.diagnostic ?? EMPTY_DIAGNOSTIC,
    },
  ].slice(-120);

  slots[idx] = save;
  writeSaveSlots(slots);
  return save;
}

export function updateSessionInsights({
  sessionId,
  diagnostic,
  challengeUpdates = [],
}: {
  sessionId: string;
  diagnostic: SessionDiagnostic;
  challengeUpdates?: Array<{
    challengeId: string;
    variantFocus?: string;
    lastStrategyTip?: string;
    nextReviewSession?: number | null;
  }>;
}): SaveSlot | null {
  const idx = getActiveSlotIndex();
  if (idx === null) return null;
  const slots = getSaveSlots();
  const save = slots[idx];
  if (!save) return null;

  save.sessions = save.sessions.map((session) =>
    session.id === sessionId ? { ...session, diagnostic } : session
  );

  if (challengeUpdates.length > 0) {
    save.challenges = save.challenges.map((challenge) => {
      const patch = challengeUpdates.find((item) => item.challengeId === challenge.id);
      if (!patch) return challenge;
      return {
        ...challenge,
        variantFocus: patch.variantFocus ?? challenge.variantFocus,
        lastStrategyTip: patch.lastStrategyTip ?? challenge.lastStrategyTip,
        nextReviewSession:
          patch.nextReviewSession === undefined
            ? challenge.nextReviewSession
            : patch.nextReviewSession,
      };
    });
  }

  slots[idx] = save;
  writeSaveSlots(slots);
  return save;
}

export function updateSessionReflection(
  sessionId: string,
  reflection: string
): SaveSlot | null {
  const idx = getActiveSlotIndex();
  if (idx === null) return null;
  const slots = getSaveSlots();
  const save = slots[idx];
  if (!save) return null;

  save.sessions = save.sessions.map((session) =>
    session.id === sessionId ? { ...session, reflection } : session
  );
  slots[idx] = save;
  writeSaveSlots(slots);
  return save;
}

export function getOverallAccuracy(save: SaveSlot): number {
  if (save.totalQuestions === 0) return 0;
  return Math.round((save.totalCorrect / save.totalQuestions) * 100);
}

export function getCategoryAccuracy(stats: CategoryStats): number {
  if (stats.totalQuestions === 0) return 0;
  return Math.round((stats.totalCorrect / stats.totalQuestions) * 100);
}

export function getChallengeCounts(
  save: SaveSlot,
  category?: Category,
  sessionOrdinal = save.sessions.length + 1
): ChallengeCounts {
  const list = category
    ? save.challenges.filter((challenge) => challenge.category === category)
    : save.challenges;
  return {
    active: list.filter((challenge) => challenge.status === 'active').length,
    review: list.filter((challenge) => challenge.status === 'review').length,
    mastered: list.filter((challenge) => challenge.status === 'mastered').length,
    due: list.filter(
      (challenge) =>
        challenge.status !== 'mastered' &&
        challenge.nextReviewSession !== null &&
        challenge.nextReviewSession <= sessionOrdinal
    ).length,
  };
}

export function getDueChallenges(
  save: SaveSlot,
  category: Category,
  sessionOrdinal = save.sessions.length + 1
): ChallengeRecord[] {
  return save.challenges
    .filter(
      (challenge) =>
        challenge.category === category &&
        challenge.status !== 'mastered' &&
        challenge.nextReviewSession !== null &&
        challenge.nextReviewSession <= sessionOrdinal
    )
    .sort((left, right) => {
      const leftPriority = left.status === 'active' ? 0 : 1;
      const rightPriority = right.status === 'active' ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    });
}

export function getLatestSession(
  save: SaveSlot,
  category?: Category
): SessionSummary | null {
  const sessions = category
    ? save.sessions.filter((session) => session.category === category)
    : save.sessions;
  return sessions.at(-1) ?? null;
}

export function getSkillSummaries(save: SaveSlot): Skill[] {
  return getCategoriesForGrade(save.gradeLevel).map((category) => {
    const stats = save.stats[category];
    const accuracy = getCategoryAccuracy(stats);
    const challengeCounts = getChallengeCounts(save, category);
    const progress = Math.min(
      100,
      Math.round(accuracy * 0.7 + Math.max(0, 100 - challengeCounts.active * 20) * 0.3)
    );
    const stars = progress >= 90 ? 3 : progress >= 65 ? 2 : progress >= 35 ? 1 : 0;

    return {
      id: category,
      nameKey:
        category === 'addition'
          ? 'skillsData.addition_subtraction.name'
          : `skillsData.${category}.name`,
      descriptionKey:
        category === 'addition'
          ? 'skillsData.addition_subtraction.description'
          : `skillsData.${category}.description`,
      mastery: {
        stars,
        progress,
      },
    };
  });
}

const computeStreak = (save: SaveSlot): number => {
  const uniqueDays = Array.from(
    new Set(
      save.sessions.map((session) => new Date(session.endedAt).toISOString().slice(0, 10))
    )
  ).sort();

  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (uniqueDays.includes(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
};

export function getUserProgressFromSave(save: SaveSlot): UserProgress {
  const today = new Date();
  const weeklyProgress = Array.from({ length: 7 }, (_, index) => {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - (6 - index));
    const key = cursor.toISOString().slice(0, 10);
    const xp = save.sessions
      .filter((session) => session.endedAt.slice(0, 10) === key)
      .reduce((total, session) => total + session.correctCount * 10 + session.challengeIdsMastered.length * 20, 0);
    return {
      day: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
      xp,
    };
  });

  const masteredChallenges = save.challenges.filter(
    (challenge) => challenge.status === 'mastered'
  ).length;

  return {
    xp:
      save.totalCorrect * 10 +
      save.sessions.length * 15 +
      masteredChallenges * 20,
    streak: computeStreak(save),
    skillsMastered: getSkillSummaries(save).filter(
      (skill) => skill.mastery.stars === 3
    ).length,
    weeklyProgress,
  };
}

export function getActiveUserProfile(save: SaveSlot | null): User {
  const name = save?.playerName ?? 'Alex';
  return {
    id: `player_${save?.id ?? 'guest'}`,
    name,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=ffffff`,
  };
}

export function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}
