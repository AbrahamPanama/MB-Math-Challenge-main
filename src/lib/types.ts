export type Category = 'multiplication' | 'addition' | 'divisibility' | 'fractions';

export type Problem = {
  text: string;
  ans: number | string | boolean;
  type: string;
};

// --- Save File System ---
export type CategoryStats = {
  gamesPlayed: number;
  bestTime: number | null;
  totalCorrect: number;
  totalQuestions: number;
  lastPlayed: string | null;
};

export type SaveSlot = {
  id: number;              // 1-3
  playerName: string;
  createdAt: string;       // ISO
  lastPlayed: string;      // ISO
  totalGames: number;
  totalCorrect: number;
  totalQuestions: number;
  stats: Record<Category, CategoryStats>;
};

export type GameResult = {
  category: Category;
  correct: number;
  total: number;
  timeElapsed: number;
  completed: boolean;
};
