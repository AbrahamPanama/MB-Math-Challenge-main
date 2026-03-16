'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getActiveSave,
    getCategoryAccuracy,
    getChallengeCounts,
    getLatestSession,
    getOverallAccuracy,
} from '@/lib/saveManager';
import type { SaveSlot, Category } from '@/lib/types';

const CATEGORY_LABELS: Record<Category, { name: string; emoji: string }> = {
    multiplication: { name: 'Multiplicación', emoji: '✖️' },
    addition: { name: 'Sumas', emoji: '➕' },
    divisibility: { name: 'Divisibilidad', emoji: '➗' },
    fractions: { name: 'Fracciones', emoji: '🔢' },
    combined: { name: 'Operaciones combinadas', emoji: '🧩' },
};

export default function StatsPage() {
    const router = useRouter();
    const [save, setSave] = useState<SaveSlot | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const s = getActiveSave();
        if (!s) {
            router.push('/save-select');
            return;
        }
        setSave(s);
        setMounted(true);
    }, [router]);

    if (!mounted || !save) return null;

    const accuracy = getOverallAccuracy(save);
    const categories = Object.entries(save.stats) as [Category, typeof save.stats[Category]][];
    const challengeCounts = getChallengeCounts(save);
    const latestSession = getLatestSession(save);

    return (
        <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl" />
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">📊 Estadísticas</h1>
                        <p className="text-indigo-200 text-sm mt-0.5">{save.playerName}</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-xs font-bold hover:bg-white/30 transition-all"
                    >
                        ← Volver
                    </button>
                </div>

                {/* Overall stats */}
                <div className="grid grid-cols-3 gap-3 relative z-10">
                    <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
                        <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Partidas</p>
                        <p className="text-2xl font-black tabular-nums">{save.totalGames}</p>
                    </div>
                    <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
                        <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Precisión</p>
                        <p className="text-2xl font-black tabular-nums">{accuracy}%</p>
                    </div>
                    <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
                        <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Aciertos</p>
                        <p className="text-2xl font-black tabular-nums">{save.totalCorrect}</p>
                    </div>
                </div>
            </div>

            {/* Per-category breakdown */}
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Retos activos</p>
                        <p className="text-xl font-black text-amber-700">{challengeCounts.active + challengeCounts.review}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100 text-center">
                        <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Deben volver</p>
                        <p className="text-xl font-black text-indigo-700">{challengeCounts.due}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 text-center">
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Superados</p>
                        <p className="text-xl font-black text-emerald-700">{challengeCounts.mastered}</p>
                    </div>
                </div>

                {latestSession && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Última misión</p>
                        <p className="text-sm font-semibold text-slate-700">{latestSession.goal}</p>
                        {latestSession.diagnostic.nextMission && (
                            <p className="text-sm text-slate-500 mt-2">{latestSession.diagnostic.nextMission}</p>
                        )}
                    </div>
                )}

                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Por Categoría</h2>

                {categories.map(([cat, stats]) => {
                    const catAccuracy = getCategoryAccuracy(stats);
                    const label = CATEGORY_LABELS[cat];
                    const catChallenges = getChallengeCounts(save, cat);
                    return (
                        <div key={cat} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{label.emoji}</span>
                                    <span className="font-bold text-slate-700">{label.name}</span>
                                </div>
                                {stats.gamesPlayed > 0 && (
                                    <span className="text-xs text-slate-400 font-mono">
                                        {stats.gamesPlayed} {stats.gamesPlayed === 1 ? 'partida' : 'partidas'}
                                    </span>
                                )}
                            </div>

                            {stats.gamesPlayed === 0 ? (
                                <p className="text-slate-400 text-sm italic">Sin partidas aún</p>
                            ) : (
                                <>
                                    {/* Accuracy bar */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Precisión</span>
                                            <span className="font-bold">{catAccuracy}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${catAccuracy >= 80 ? 'bg-emerald-500' : catAccuracy >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${catAccuracy}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mejor Tiempo</p>
                                            <p className="text-lg font-black text-indigo-600 tabular-nums">
                                                {stats.bestTime !== null ? `${stats.bestTime.toFixed(1)}s` : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aciertos</p>
                                            <p className="text-lg font-black text-indigo-600 tabular-nums">
                                                {stats.totalCorrect}/{stats.totalQuestions}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Retos Due</p>
                                            <p className="text-lg font-black text-amber-600 tabular-nums">
                                                {catChallenges.due}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Superados</p>
                                            <p className="text-lg font-black text-emerald-600 tabular-nums">
                                                {catChallenges.mastered}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
