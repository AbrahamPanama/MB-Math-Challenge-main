'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveSave,
  getChallengeCounts,
  getCategoriesForGrade,
  getGradeLabel,
} from '@/lib/saveManager';
import type { SaveSlot, Category, GradeLevel } from '@/lib/types';

const CategoryButton = ({
  href,
  title,
  time,
  focus,
  bestTime,
  pendingChallenges,
}: {
  href: string;
  title: string;
  time: string;
  focus: string;
  bestTime?: number | null;
  pendingChallenges?: number;
}) => (
  <Link
    href={href}
    className="w-full p-4 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
  >
    <div className="text-left">
      <span className="block font-bold text-slate-700 text-lg">{title}</span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px]">{time}</span>
        {bestTime !== null && bestTime !== undefined && (
          <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">⚡ {bestTime.toFixed(1)}s</span>
        )}
        {pendingChallenges && pendingChallenges > 0 && (
          <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
            ↺ {pendingChallenges} reto{pendingChallenges > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <span className="text-xs text-indigo-500 block mt-1">{focus}</span>
    </div>
    <span className="text-slate-300 group-hover:text-indigo-500 text-2xl transition-colors">→</span>
  </Link>
);

export default function Home() {
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

  const accuracy = save.totalQuestions > 0 ? Math.round((save.totalCorrect / save.totalQuestions) * 100) : 0;

  const getBestTime = (cat: Category) => save.stats[cat]?.bestTime ?? null;
  const getPendingChallenges = (cat: Category) =>
    getChallengeCounts(save, cat).due;
  const grade: GradeLevel = save.gradeLevel ?? 6;
  const availableCategories = getCategoriesForGrade(grade);
  const has = (cat: Category) => availableCategories.includes(cat);

  // Grade-aware focus/time descriptions
  const multFocus: Record<GradeLevel, string> = { 3: 'Enfoque: Tablas 2-5', 4: 'Enfoque: Tablas 2-9', 5: 'Enfoque: Tablas 6-12', 6: 'Enfoque: Tablas 6, 7, 8, 9' };
  const addFocus: Record<GradeLevel, string> = { 3: 'Enfoque: Sumas de 1 dígito', 4: 'Enfoque: 1 y 2 dígitos', 5: 'Enfoque: Sumas de 2 dígitos', 6: 'Enfoque: Llevadas difíciles' };
  const divTime: Record<GradeLevel, string> = { 3: '1:30 MIN', 4: '1:30 MIN', 5: '1:45 MIN', 6: '1:30 MIN' };
  const divFocus: Record<GradeLevel, string> = { 3: '', 4: 'Enfoque: Reglas del 2, 5, 10', 5: 'Enfoque: Reglas del 2, 3, 5, 9', 6: 'Enfoque: Reglas del 3 y 9' };
  const fracFocus: Record<GradeLevel, string> = { 3: '', 4: '', 5: 'Enfoque: Simplificar, equivalentes', 6: 'Enfoque: Simplificar, comparar, operar' };
  const combFocus: Record<GradeLevel, string> = { 3: '', 4: 'Enfoque: ( )', 5: 'Enfoque: ( ), [ ]', 6: 'Enfoque: ( ), [ ], { }' };

  return (
    <div id="app" className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
      <div className="bg-indigo-600 p-6 text-white transition-colors duration-500 relative overflow-hidden" id="header-bg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>MathMaster 20</span>
          </h1>
          <button
            onClick={() => router.push('/save-select')}
            className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 hover:bg-white/30 transition-all"
          >
            <span className="text-[10px] font-mono opacity-90">
              💾 {save.playerName}
            </span>
            <span className="text-[9px] font-bold text-amber-200 ml-1">{getGradeLabel(grade)}</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 relative z-10">
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Partidas</p>
            <p id="score" className="text-2xl font-black tabular-nums">{save.totalGames}</p>
          </div>
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Precisión</p>
            <p className="text-2xl font-black tabular-nums">{accuracy}%</p>
          </div>
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Aciertos</p>
            <p id="best-time" className="text-2xl font-black tabular-nums">{save.totalCorrect}</p>
          </div>
        </div>
      </div>

      <div id="screen-container" className="p-6">
        <div id="menu-screen" className="space-y-4 py-2">
          <div className="text-center mb-8">
            <span className="text-4xl block mb-2">🧠</span>
            <h2 className="text-2xl font-bold text-slate-800">Entrenamiento Mental</h2>
            <p className="text-slate-500 text-sm mt-1">Supera las 20 preguntas antes de que se agote el tiempo.</p>
          </div>
          {has('combined') && <CategoryButton href="/practice/combined" title="Operaciones Combinadas" time="3:00 MIN" focus={combFocus[grade]} bestTime={getBestTime('combined')} pendingChallenges={getPendingChallenges('combined')} />}
          <CategoryButton href="/practice/multiplication" title="Multiplicación" time="2:00 MIN" focus={multFocus[grade]} bestTime={getBestTime('multiplication')} pendingChallenges={getPendingChallenges('multiplication')} />
          <CategoryButton href="/practice/addition" title="Sumas" time="2:00 MIN" focus={addFocus[grade]} bestTime={getBestTime('addition')} pendingChallenges={getPendingChallenges('addition')} />
          {has('divisibility') && <CategoryButton href="/practice/divisibility" title="Divisibilidad" time={divTime[grade]} focus={divFocus[grade]} bestTime={getBestTime('divisibility')} pendingChallenges={getPendingChallenges('divisibility')} />}
          {has('fractions') && <CategoryButton href="/practice/fractions" title="Fracciones" time="2:00 MIN" focus={fracFocus[grade]} bestTime={getBestTime('fractions')} pendingChallenges={getPendingChallenges('fractions')} />}

          {/* Stats, Teoría & Switch Player */}
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <Link
                href="/stats"
                className="flex-1 py-3 text-center bg-slate-50 border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl font-bold text-sm text-slate-500 hover:text-indigo-600 transition-all"
              >
                📊 Estadísticas
              </Link>
              <button
                onClick={() => router.push('/save-select')}
                className="flex-1 py-3 text-center bg-slate-50 border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl font-bold text-sm text-slate-500 hover:text-indigo-600 transition-all"
              >
                💾 Cambiar Jugador
              </button>
            </div>
            <Link
              href="/teoria"
              className="w-full py-3 text-center bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-100 rounded-2xl font-bold text-sm text-indigo-500 hover:text-indigo-700 transition-all"
            >
              📐 Teoría
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
