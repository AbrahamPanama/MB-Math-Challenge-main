import type { LucideIcon } from 'lucide-react';

export type Category =
  | 'multiplication'
  | 'addition'
  | 'divisibility'
  | 'fractions'
  | 'combined';

export type GradeLevel = 3 | 4 | 5 | 6;

export type ProblemAnswer = number | string | boolean;
export type DifficultyTag = 'easy' | 'medium' | 'hard';
export type AttemptSource = 'new' | 'review';
export type HintUsage = 0 | 1 | 2 | 3;
export type MasteryState = 'active' | 'review' | 'mastered';

export type MisconceptionTag =
  | 'fact_recall'
  | 'reverse_reasoning'
  | 'place_value'
  | 'divisibility_rule'
  | 'fraction_simplification'
  | 'fraction_comparison'
  | 'fraction_operation'
  | 'operation_order'
  | 'time_pressure'
  | 'accuracy_lapse'
  | 'context_transfer'
  | 'unknown';

export type ProblemMetadata = {
  subskillId: string;
  label: string;
  pattern: string;
  difficulty: DifficultyTag;
  reviewKey: string;
  challengeSeed: Record<string, string | number | boolean>;
  misconceptionHints: MisconceptionTag[];
};

export type Problem = {
  text: string;
  plainText: string;
  ans: ProblemAnswer;
  type: string;
  metadata: ProblemMetadata;
};

export type AttemptRecord = {
  id: string;
  sessionId: string;
  category: Category;
  gradeLevel: GradeLevel;
  questionIndex: number;
  promptHtml: string;
  promptText: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  timeSpentMs: number;
  attemptSource: AttemptSource;
  hintUsage: HintUsage;
  challengeId: string | null;
  reviewKey: string;
  subskillId: string;
  pattern: string;
  difficulty: DifficultyTag;
  challengeSeed: Record<string, string | number | boolean>;
  misconceptionTags: MisconceptionTag[];
};

export type AttemptInsight = {
  attemptId: string;
  promptText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  microStrategyTip?: string;
};

export type SessionDiagnostic = {
  generatedBy: 'fallback' | 'ai';
  mastered: string[];
  struggles: string[];
  whyItHappened: string;
  strategy: string;
  nextChallenge: string;
  nextMission: string;
  encouragement: string;
  reviewPreview: string;
  attemptInsights: AttemptInsight[];
};

export type ChallengeHistoryEntry = {
  sessionId: string;
  attemptId: string;
  outcome: 'correct' | 'incorrect' | 'slow' | 'hinted';
  timeSpentMs: number;
  hintUsage: HintUsage;
  answeredAt: string;
};

export type ChallengeTemplate = {
  promptHtml: string;
  promptText: string;
  correctAnswer: string;
  type: string;
  metadata: ProblemMetadata;
};

export type ChallengeRecord = {
  id: string;
  category: Category;
  gradeLevel: GradeLevel;
  subskillId: string;
  pattern: string;
  reviewKey: string;
  template: ChallengeTemplate;
  misconceptionTags: MisconceptionTag[];
  status: MasteryState;
  createdAt: string;
  updatedAt: string;
  nextReviewSession: number | null;
  scheduleIndex: number;
  consecutiveSuccesses: number;
  attempts: number;
  successes: number;
  failures: number;
  variantFocus: string;
  lastStudentAnswer?: string;
  lastStrategyTip?: string;
  lastReviewedAt?: string;
  masteredAt?: string;
  history: ChallengeHistoryEntry[];
};

export type SessionSummary = {
  id: string;
  category: Category;
  gradeLevel: GradeLevel;
  startedAt: string;
  endedAt: string;
  timeElapsedSec: number;
  wasCompleted: boolean;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  goal: string;
  reflection?: string;
  reviewQuestions: number;
  newQuestions: number;
  challengeIdsTouched: string[];
  challengeIdsMastered: string[];
  challengeIdsCreated: string[];
  diagnostic: SessionDiagnostic;
};

export type CategoryStats = {
  gamesPlayed: number;
  bestTime: number | null;
  totalCorrect: number;
  totalQuestions: number;
  lastPlayed: string | null;
};

export type SaveSlot = {
  id: number;
  playerName: string;
  gradeLevel: GradeLevel;
  createdAt: string;
  lastPlayed: string;
  totalGames: number;
  totalCorrect: number;
  totalQuestions: number;
  stats: Record<Category, CategoryStats>;
  attempts: AttemptRecord[];
  sessions: SessionSummary[];
  challenges: ChallengeRecord[];
};

export type PracticeSessionPayload = {
  session: SessionSummary;
  attempts: AttemptRecord[];
};

export type ChallengeCounts = {
  active: number;
  review: number;
  mastered: number;
  due: number;
};

export type GameResult = {
  category: Category;
  correct: number;
  total: number;
  timeElapsed: number;
  completed: boolean;
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Skill = {
  id: Category;
  nameKey: string;
  descriptionKey: string;
  mastery: {
    stars: number;
    progress: number;
  };
};

export type UserProgress = {
  xp: number;
  streak: number;
  skillsMastered: number;
  weeklyProgress: Array<{
    day: string;
    xp: number;
  }>;
};

export type PracticeMode = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  href: string;
};
