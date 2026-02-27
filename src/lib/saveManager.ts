import type { Category, CategoryStats, SaveSlot, GameResult } from './types';

const SAVES_KEY = 'mm20-saves';
const ACTIVE_KEY = 'mm20-active-slot';

const ALL_CATEGORIES: Category[] = ['multiplication', 'addition', 'divisibility', 'fractions'];

function emptyCategoryStats(): CategoryStats {
    return { gamesPlayed: 0, bestTime: null, totalCorrect: 0, totalQuestions: 0, lastPlayed: null };
}

// --- CRUD ---

export function getSaveSlots(): (SaveSlot | null)[] {
    if (typeof window === 'undefined') return [null, null, null];
    try {
        const raw = localStorage.getItem(SAVES_KEY);
        if (!raw) return [null, null, null];
        return JSON.parse(raw) as (SaveSlot | null)[];
    } catch {
        return [null, null, null];
    }
}

function writeSaveSlots(slots: (SaveSlot | null)[]) {
    localStorage.setItem(SAVES_KEY, JSON.stringify(slots));
}

export function createSave(slotIndex: number, playerName: string): SaveSlot {
    const slots = getSaveSlots();
    const now = new Date().toISOString();
    const stats: Record<string, CategoryStats> = {};
    ALL_CATEGORIES.forEach(c => { stats[c] = emptyCategoryStats(); });

    const save: SaveSlot = {
        id: slotIndex + 1,
        playerName: playerName.trim() || `Jugador ${slotIndex + 1}`,
        createdAt: now,
        lastPlayed: now,
        totalGames: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        stats: stats as Record<Category, CategoryStats>,
    };

    slots[slotIndex] = save;
    writeSaveSlots(slots);
    setActiveSlot(slotIndex);
    return save;
}

export function deleteSave(slotIndex: number) {
    const slots = getSaveSlots();
    slots[slotIndex] = null;
    writeSaveSlots(slots);
    // If this was the active slot, clear it
    if (getActiveSlotIndex() === slotIndex) {
        localStorage.removeItem(ACTIVE_KEY);
    }
}

// --- Active Slot ---

export function getActiveSlotIndex(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw === null) return null;
    const idx = parseInt(raw, 10);
    return isNaN(idx) ? null : idx;
}

export function setActiveSlot(slotIndex: number) {
    localStorage.setItem(ACTIVE_KEY, String(slotIndex));
}

export function getActiveSave(): SaveSlot | null {
    const idx = getActiveSlotIndex();
    if (idx === null) return null;
    const slots = getSaveSlots();
    return slots[idx] || null;
}

// --- Record a game result ---

export function recordGame(result: GameResult): SaveSlot | null {
    const idx = getActiveSlotIndex();
    if (idx === null) return null;
    const slots = getSaveSlots();
    const save = slots[idx];
    if (!save) return null;

    const now = new Date().toISOString();
    save.lastPlayed = now;
    save.totalGames += 1;
    save.totalCorrect += result.correct;
    save.totalQuestions += result.total;

    // Category-specific
    const cat = save.stats[result.category];
    cat.gamesPlayed += 1;
    cat.totalCorrect += result.correct;
    cat.totalQuestions += result.total;
    cat.lastPlayed = now;

    // Best time: only if completed with 18+ correct
    if (result.completed && result.correct >= 18) {
        if (cat.bestTime === null || result.timeElapsed < cat.bestTime) {
            cat.bestTime = result.timeElapsed;
        }
    }

    slots[idx] = save;
    writeSaveSlots(slots);
    return save;
}

// --- Helpers ---

export function getOverallAccuracy(save: SaveSlot): number {
    if (save.totalQuestions === 0) return 0;
    return Math.round((save.totalCorrect / save.totalQuestions) * 100);
}

export function getCategoryAccuracy(stats: CategoryStats): number {
    if (stats.totalQuestions === 0) return 0;
    return Math.round((stats.totalCorrect / stats.totalQuestions) * 100);
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
