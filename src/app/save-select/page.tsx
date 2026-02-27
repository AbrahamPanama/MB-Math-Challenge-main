'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSaveSlots, createSave, deleteSave, setActiveSlot, getOverallAccuracy, formatTimeAgo } from '@/lib/saveManager';
import type { SaveSlot } from '@/lib/types';

export default function SaveSelectPage() {
    const router = useRouter();
    const [slots, setSlots] = useState<(SaveSlot | null)[]>([null, null, null]);
    const [creating, setCreating] = useState<number | null>(null);
    const [playerName, setPlayerName] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setSlots(getSaveSlots());
        setMounted(true);
    }, []);

    const handleCreate = (slotIndex: number) => {
        setCreating(slotIndex);
        setPlayerName('');
    };

    const confirmCreate = () => {
        if (creating === null) return;
        createSave(creating, playerName);
        setSlots(getSaveSlots());
        setCreating(null);
        router.push('/');
    };

    const handleLoad = (slotIndex: number) => {
        setActiveSlot(slotIndex);
        router.push('/');
    };

    const handleDelete = (slotIndex: number) => {
        if (deleting === slotIndex) {
            deleteSave(slotIndex);
            setSlots(getSaveSlots());
            setDeleting(null);
        } else {
            setDeleting(slotIndex);
            setTimeout(() => setDeleting(null), 3000);
        }
    };

    if (!mounted) return null;

    return (
        <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
            {/* Header — matching app style */}
            <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl" />
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h1 className="text-xl font-bold tracking-tight">MathMaster 20</h1>
                </div>
                <div className="text-center relative z-10 py-2">
                    <span className="text-5xl block mb-3">💾</span>
                    <h2 className="text-2xl font-bold tracking-tight">Archivos de Juego</h2>
                    <p className="text-indigo-200 text-sm mt-1">Selecciona o crea tu perfil de jugador</p>
                </div>
            </div>

            {/* Save slots */}
            <div className="p-6 space-y-4">
                {slots.map((slot, i) => (
                    <div key={i} className="group relative">
                        {slot ? (
                            /* --- Filled Slot --- */
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => handleLoad(i)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLoad(i)}
                                className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:bg-indigo-50/50 transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">Slot {i + 1}</span>
                                        <span className="text-slate-800 font-bold text-lg">{slot.playerName}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{formatTimeAgo(slot.lastPlayed)}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Partidas</p>
                                        <p className="text-indigo-600 font-black text-sm tabular-nums">{slot.totalGames}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Precisión</p>
                                        <p className="text-amber-500 font-black text-sm tabular-nums">{getOverallAccuracy(slot)}%</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aciertos</p>
                                        <p className="text-emerald-500 font-black text-sm tabular-nums">{slot.totalCorrect}/{slot.totalQuestions}</p>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                                    className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${deleting === i
                                        ? 'bg-rose-100 text-rose-500 border-2 border-rose-200 animate-pulse'
                                        : 'bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100'
                                        }`}
                                    title={deleting === i ? 'Presiona de nuevo para borrar' : 'Borrar partida'}
                                >
                                    {deleting === i ? '!' : '×'}
                                </button>
                            </div>
                        ) : (
                            /* --- Empty Slot --- */
                            <button
                                onClick={() => handleCreate(i)}
                                className="w-full text-center p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Slot {i + 1}</span>
                                    <span className="text-slate-400 font-medium text-sm">— Vacío —</span>
                                </div>
                                <p className="text-indigo-500 text-xs font-medium">Presiona para crear nuevo jugador</p>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Create save modal */}
            {creating !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
                        <div className="text-center mb-6">
                            <span className="text-4xl block mb-2">🎮</span>
                            <h2 className="text-xl font-bold text-slate-800">Nuevo Jugador</h2>
                            <p className="text-slate-400 text-xs mt-1">Slot {creating + 1} • Máx. 12 caracteres</p>
                        </div>

                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value.slice(0, 12))}
                            placeholder="Tu nombre..."
                            autoFocus
                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-800 font-bold text-lg outline-none transition-colors placeholder:text-slate-300"
                            onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
                        />

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setCreating(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmCreate}
                                className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 border-2 border-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                            >
                                Crear ▶
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
