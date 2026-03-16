'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import {
  Brain,
  Lightbulb,
  LoaderCircle,
  Repeat2,
  Sparkles,
  Target,
} from 'lucide-react';
import { generateHintAction, generateSessionInsightsAction } from '@/app/practice/actions';
import {
  TOTAL_QUESTIONS,
  answerToString,
  buildFallbackSessionDiagnostic,
  buildPracticeQueue,
  categoryLabels,
  defaultGoalsByCategory,
  fallbackHintForProblem,
  generateOptions,
  inferMisconceptionTags,
  reflectionOptions,
} from '@/lib/practice-engine';
import {
  getActiveSave,
  getChallengeCounts,
  getDueChallenges,
  recordPracticeSession,
  updateSessionInsights,
  updateSessionReflection,
} from '@/lib/saveManager';
import type {
  AttemptRecord,
  Category,
  GradeLevel,
  HintUsage,
  Problem,
  SaveSlot,
  SessionDiagnostic,
} from '@/lib/types';

type GameScreen = 'intro' | 'game' | 'result';

const TIME_LIMITS: Record<Category, number> = {
  multiplication: 120,
  addition: 120,
  divisibility: 90,
  fractions: 120,
  combined: 180,
};

const isCategory = (value: string): value is Category =>
  ['multiplication', 'addition', 'divisibility', 'fractions', 'combined'].includes(value);

export default function PracticeSessionPage() {
  const router = useRouter();
  const params = useParams();
  const rawCategory = String(params.skillId ?? '');
  const category = isCategory(rawCategory) ? rawCategory : null;

  const [screen, setScreen] = useState<GameScreen>('intro');
  const [save, setSave] = useState<SaveSlot | null>(null);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(6);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [queue, setQueue] = useState<ReturnType<typeof buildPracticeQueue>>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [options, setOptions] = useState<Array<string | number | boolean>>([]);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<HintUsage>(0);
  const [maxTime, setMaxTime] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [finalTime, setFinalTime] = useState(0);
  const [wasCompleted, setWasCompleted] = useState(false);
  const [diagnostic, setDiagnostic] = useState<SessionDiagnostic | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [reflectionChoice, setReflectionChoice] = useState<string | null>(null);
  const [reviewQuestionCount, setReviewQuestionCount] = useState(0);
  const [challengeCreatedCount, setChallengeCreatedCount] = useState(0);
  const [challengeMasteredCount, setChallengeMasteredCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isGeneratingHint, startHintTransition] = useTransition();
  const [isGeneratingInsights, startInsightsTransition] = useTransition();

  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef(0);
  const questionStartedAt = useRef(0);
  const sessionIdRef = useRef('');
  const attemptsRef = useRef<AttemptRecord[]>([]);
  const correctCountRef = useRef(0);
  const queueRef = useRef<ReturnType<typeof buildPracticeQueue>>([]);

  const synth = useRef<any | null>(null);
  const toneReady = useRef(false);
  const musicParts = useRef<any[]>([]);
  const musicSynths = useRef<any[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mm20-music-muted') === 'true';
  });

  useEffect(() => {
    if (!category) {
      router.push('/');
      return;
    }
    const activeSave = getActiveSave();
    if (!activeSave) {
      router.push('/save-select');
      return;
    }
    setSave(activeSave);
    setGradeLevel(activeSave.gradeLevel ?? 6);
    setBestTime(activeSave.stats[category]?.bestTime ?? null);
    setDueCount(getDueChallenges(activeSave, category).length);
    setSelectedGoal(
      getDueChallenges(activeSave, category).length > 0
        ? defaultGoalsByCategory[category][2]
        : defaultGoalsByCategory[category][0]
    );
    setScreen('intro');
  }, [category, router]);

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      stopMusic();
    };
  }, []);

  const stopMusic = () => {
    // @ts-ignore
    const Tone = window.Tone;
    musicParts.current.forEach((part) => {
      part.stop();
      part.dispose();
    });
    musicSynths.current.forEach((instance) => instance.dispose());
    musicParts.current = [];
    musicSynths.current = [];
    if (Tone) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
    setMusicPlaying(false);
  };

  const startMusic = async () => {
    // @ts-ignore
    const Tone = window.Tone;
    if (!Tone || musicParts.current.length > 0) return;
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = 140;

    const melodySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.1 },
      volume: -14,
    }).toDestination();

    const bassSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.05 },
      volume: -18,
    }).toDestination();

    const melodyNotes = [
      'E5',
      'G5',
      'C6',
      'G5',
      'E5',
      'D5',
      'C5',
      'D5',
      'E5',
      'G5',
      'A5',
      'G5',
      'E5',
      null,
      'C5',
      'D5',
    ];

    const bassNotes = [
      'C3',
      null,
      'G3',
      null,
      'C3',
      null,
      'E3',
      null,
      'F3',
      null,
      'C3',
      null,
      'G3',
      null,
      'E3',
      null,
    ];

    const melodySeq = new Tone.Sequence((time: number, note: string | null) => {
      if (note) melodySynth.triggerAttackRelease(note, '16n', time);
    }, melodyNotes, '8n');

    const bassSeq = new Tone.Sequence((time: number, note: string | null) => {
      if (note) bassSynth.triggerAttackRelease(note, '8n', time);
    }, bassNotes, '8n');

    melodySeq.loop = true;
    bassSeq.loop = true;
    melodySeq.start(0);
    bassSeq.start(0);
    Tone.Transport.start();

    musicParts.current = [melodySeq, bassSeq];
    musicSynths.current = [melodySynth, bassSynth];
    setMusicPlaying(true);
  };

  const toggleMusic = async () => {
    // @ts-ignore
    const Tone = window.Tone;
    if (Tone) await Tone.start();
    if (musicPlaying) {
      stopMusic();
      setMusicMuted(true);
      localStorage.setItem('mm20-music-muted', 'true');
    } else {
      setMusicMuted(false);
      localStorage.setItem('mm20-music-muted', 'false');
      void startMusic();
    }
  };

  const hydrateIntroState = (updatedSave: SaveSlot) => {
    if (!category) return;
    setSave(updatedSave);
    setGradeLevel(updatedSave.gradeLevel);
    setBestTime(updatedSave.stats[category]?.bestTime ?? null);
    setDueCount(getDueChallenges(updatedSave, category).length);
  };

  const startSession = async () => {
    if (!category || !save) return;

    const refreshedSave = getActiveSave() ?? save;
    const sessionOrdinal = refreshedSave.sessions.length + 1;
    const dueChallenges = getDueChallenges(refreshedSave, category, sessionOrdinal);
    const sessionQueue = buildPracticeQueue({
      category,
      grade: refreshedSave.gradeLevel,
      dueChallenges,
      sessionOrdinal,
    });

    queueRef.current = sessionQueue;
    attemptsRef.current = [];
    correctCountRef.current = 0;
    sessionIdRef.current = crypto.randomUUID();
    setQueue(sessionQueue);
    setReviewQuestionCount(sessionQueue.filter((item) => item.source === 'review').length);
    setQuestionIndex(0);
    setCorrectCount(0);
    setFeedback(null);
    setDiagnostic(null);
    setHintText(null);
    setHintLevel(0);
    setReflectionChoice(null);
    setChallengeCreatedCount(0);
    setChallengeMasteredCount(0);
    setSavedSessionId(null);

    const firstProblem = sessionQueue[0]?.problem ?? null;
    setCurrentProblem(firstProblem);
    setOptions(firstProblem ? generateOptions(firstProblem.ans, firstProblem.type) : []);

    const nextMaxTime =
      category === 'divisibility' && refreshedSave.gradeLevel === 5
        ? 105
        : TIME_LIMITS[category];
    setMaxTime(nextMaxTime);
    setTimeLeft(nextMaxTime);
    setScreen('game');

    startTime.current = Date.now();
    questionStartedAt.current = Date.now();
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    if (toneReady.current && !musicMuted) {
      void startMusic();
    }
  };

  const finalizeSession = (completed: boolean) => {
    if (!category) return;
    if (timerInterval.current) clearInterval(timerInterval.current);
    stopMusic();

    const timeElapsedSec = (Date.now() - startTime.current) / 1000;
    const sessionAttempts = [...attemptsRef.current];
    const accuracy =
      sessionAttempts.length > 0
        ? Math.round((correctCountRef.current / sessionAttempts.length) * 100)
        : 0;
    const fallbackDiagnostic = buildFallbackSessionDiagnostic({
      attempts: sessionAttempts,
      goal: selectedGoal,
      dueCount,
    });

    const sessionPayload = {
      session: {
        id: sessionIdRef.current,
        category,
        gradeLevel,
        startedAt: new Date(startTime.current).toISOString(),
        endedAt: new Date().toISOString(),
        timeElapsedSec,
        wasCompleted: completed,
        totalQuestions: TOTAL_QUESTIONS,
        correctCount: correctCountRef.current,
        accuracy,
        goal: selectedGoal,
        reviewQuestions: reviewQuestionCount,
        newQuestions: TOTAL_QUESTIONS - reviewQuestionCount,
        challengeIdsTouched: [],
        challengeIdsMastered: [],
        challengeIdsCreated: [],
        diagnostic: fallbackDiagnostic,
      },
      attempts: sessionAttempts,
    } satisfies Parameters<typeof recordPracticeSession>[0];

    const updatedSave = recordPracticeSession(sessionPayload);
    const updatedSession = updatedSave?.sessions.at(-1) ?? null;

    setFinalTime(timeElapsedSec);
    setWasCompleted(completed);
    setScreen('result');
    setDiagnostic(updatedSession?.diagnostic ?? fallbackDiagnostic);
    setSavedSessionId(updatedSession?.id ?? null);
    setChallengeCreatedCount(updatedSession?.challengeIdsCreated.length ?? 0);
    setChallengeMasteredCount(updatedSession?.challengeIdsMastered.length ?? 0);

    if (updatedSave) {
      hydrateIntroState(updatedSave);
    }

    if (updatedSave && updatedSession && sessionAttempts.length > 0) {
      const challengeDrafts = updatedSave.challenges
        .filter((challenge) => updatedSession.challengeIdsTouched.includes(challenge.id))
        .map((challenge) => ({
          challengeId: challenge.id,
          category: challenge.category,
          subskillId: challenge.subskillId,
          promptText: challenge.template.promptText,
          lastStudentAnswer: challenge.lastStudentAnswer,
          misconceptionTags: challenge.misconceptionTags,
          scheduleIndex: challenge.scheduleIndex,
          status: challenge.status,
        }));

      startInsightsTransition(async () => {
        try {
          const result = await generateSessionInsightsAction({
            category,
            gradeLevel,
            goal: selectedGoal,
            dueCount: getChallengeCounts(updatedSave, category).due,
            attempts: sessionAttempts,
            challengeDrafts,
          });

          const hydrated = updateSessionInsights({
            sessionId: updatedSession.id,
            diagnostic: result.diagnostic,
            challengeUpdates: result.challengeUpdates.map((update) => ({
              challengeId: update.challengeId,
              variantFocus: update.variantFocus,
              lastStrategyTip: update.lastStrategyTip,
              nextReviewSession:
                typeof update.dueInSessions === 'number'
                  ? updatedSave.sessions.length + update.dueInSessions
                  : undefined,
            })),
          });

          if (hydrated) {
            hydrateIntroState(hydrated);
            setDiagnostic(result.diagnostic);
          }
        } catch {
          // Keep deterministic diagnostic already shown in UI.
        }
      });
    }
  };

  useEffect(() => {
    if (screen === 'game' && timeLeft <= 0) {
      finalizeSession(false);
    }
  }, [screen, timeLeft]);

  const goToNextQuestion = (nextIndex: number) => {
    const nextItem = queueRef.current[nextIndex];
    if (!nextItem) {
      finalizeSession(true);
      return;
    }
    setQuestionIndex(nextIndex);
    setCurrentProblem(nextItem.problem);
    setOptions(generateOptions(nextItem.problem.ans, nextItem.problem.type));
    setFeedback(null);
    setHintText(null);
    setHintLevel(0);
    questionStartedAt.current = Date.now();
  };

  const handleChoice = (userValue: string | number | boolean) => {
    if (!category || !currentProblem || screen !== 'game') return;

    const currentQueueItem = queueRef.current[questionIndex];
    const isCorrect = userValue === currentProblem.ans;
    const timeSpentMs = Date.now() - questionStartedAt.current;
    const attempt: AttemptRecord = {
      id: crypto.randomUUID(),
      sessionId: sessionIdRef.current,
      category,
      gradeLevel,
      questionIndex,
      promptHtml: currentProblem.text,
      promptText: currentProblem.plainText,
      correctAnswer: answerToString(currentProblem.ans),
      userAnswer: answerToString(userValue),
      isCorrect,
      answeredAt: new Date().toISOString(),
      timeSpentMs,
      attemptSource: currentQueueItem?.source ?? 'new',
      hintUsage: hintLevel,
      challengeId: currentQueueItem?.challengeId ?? null,
      reviewKey: currentProblem.metadata.reviewKey,
      subskillId: currentProblem.metadata.subskillId,
      pattern: currentProblem.metadata.pattern,
      difficulty: currentProblem.metadata.difficulty,
      challengeSeed: currentProblem.metadata.challengeSeed,
      misconceptionTags: inferMisconceptionTags(currentProblem, isCorrect, timeSpentMs),
    };

    attemptsRef.current = [...attemptsRef.current, attempt];

    if (isCorrect) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
      if (toneReady.current && synth.current) {
        synth.current.triggerAttackRelease(['C5', 'E5'], '16n');
      }
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      if (toneReady.current && synth.current) {
        // @ts-ignore
        const Tone = window.Tone;
        const now = Tone.now();
        synth.current.triggerAttackRelease(['E4', 'G4'], '16n', now);
        synth.current.triggerAttackRelease(['C3', 'E3'], '8n', now + 0.12);
      }
    }

    setFeedback({
      text: isCorrect
        ? currentQueueItem?.source === 'review'
          ? '¡RETO SUPERADO!'
          : '¡EXCELENTE!'
        : 'LO REVISAREMOS OTRA VEZ',
      correct: isCorrect,
    });

    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= TOTAL_QUESTIONS) {
        finalizeSession(true);
      } else {
        goToNextQuestion(nextIndex);
      }
    }, 650);
  };

  const handleHint = () => {
    if (!currentProblem) return;
    const nextLevel = Math.min(3, hintLevel + 1) as HintUsage;
    setHintLevel(nextLevel);
    startHintTransition(async () => {
      try {
        const result = await generateHintAction({
          problem: currentProblem.plainText,
          hintLevel: nextLevel as 1 | 2 | 3,
        });
        setHintText(result.hint);
      } catch {
        setHintText(fallbackHintForProblem(currentProblem, nextLevel));
      }
    });
  };

  const handleReflection = (reflection: string) => {
    setReflectionChoice(reflection);
    if (!savedSessionId) return;
    const updatedSave = updateSessionReflection(savedSessionId, reflection);
    if (updatedSave) {
      hydrateIntroState(updatedSave);
    }
  };

  if (!category) return null;

  const currentSource = queue[questionIndex]?.source ?? 'new';
  const currentChallengeCount = save ? getChallengeCounts(save, category).due : 0;
  const timeBarPercent = (timeLeft / maxTime) * 100;

  return (
    <>
      <Script
        id="tone-js"
        src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"
        strategy="lazyOnload"
        onReady={() => {
          // @ts-ignore
          if (window.Tone) {
            // @ts-ignore
            const Tone = window.Tone;
            synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
            toneReady.current = true;
          }
        }}
      />
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
        <div className="bg-indigo-600 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-6 relative z-10 gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate min-w-0">
              {categoryLabels[category]}
            </h1>
            <button
              onClick={toggleMusic}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-500/40 hover:bg-indigo-500/60 backdrop-blur-sm border border-indigo-400/30 transition-all active:scale-90 text-lg"
              title={musicPlaying ? 'Silenciar música' : 'Activar música'}
            >
              {musicPlaying ? '🎵' : '🔇'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
              <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">
                ACIERTOS
              </p>
              <p className="text-2xl font-black tabular-nums">
                {correctCount} / {TOTAL_QUESTIONS}
              </p>
            </div>
            <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
              <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">
                MEJOR TIEMPO
              </p>
              <p className="text-2xl font-black tabular-nums">
                {bestTime ? `${bestTime.toFixed(1)}s` : '--:--'}
              </p>
            </div>
            <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
              <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">
                RETOS DUE
              </p>
              <p className="text-2xl font-black tabular-nums">{currentChallengeCount}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {screen === 'intro' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <span className="text-4xl block">🎯</span>
                <h2 className="text-2xl font-bold text-slate-800">Antes de empezar</h2>
                <p className="text-sm text-slate-500">
                  Elige una meta breve para esta sesión. Así el resumen final podrá decirte
                  si realmente la cumpliste.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Panorama
                  </span>
                  <span className="text-xs font-bold text-indigo-600">
                    {dueCount > 0 ? `${dueCount} reto(s) volverán` : 'Sesión nueva'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-slate-100 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Preguntas de review
                    </p>
                    <p className="text-lg font-black text-slate-800">
                      {Math.min(Math.max(1, Math.round(TOTAL_QUESTIONS * 0.3)), dueCount || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-100 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Tiempo total
                    </p>
                    <p className="text-lg font-black text-slate-800">
                      {category === 'divisibility' && gradeLevel === 5 ? '105s' : `${TIME_LIMITS[category]}s`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Target className="h-4 w-4 text-indigo-500" />
                  Meta de esta sesión
                </div>
                {defaultGoalsByCategory[category].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setSelectedGoal(goal)}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                      selectedGoal === goal
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>

              <button
                onClick={() => void startSession()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
              >
                Empezar sesión
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors py-2"
              >
                Volver al menú
              </button>
            </div>
          )}

          {screen === 'game' && currentProblem && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      timeLeft <= 10 ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${timeBarPercent}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <span className="text-lg">⏱</span>
                    <span
                      className={`font-mono font-bold text-xl tabular-nums ${
                        timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-700'
                      }`}
                    >
                      {timeLeft}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentSource === 'review' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                        <Repeat2 className="h-3.5 w-3.5" />
                        Reto pendiente
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      <Brain className="h-3.5 w-3.5" />
                      {selectedGoal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center min-h-[160px] flex flex-col justify-center">
                <div
                  className={`${category === 'combined' ? 'text-4xl' : 'text-6xl'} font-black text-slate-800 tracking-tight leading-none mb-2 transition-all ${isShaking ? 'animate-shake' : 'animate-pop'}`}
                  dangerouslySetInnerHTML={{ __html: currentProblem.text }}
                ></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  PREGUNTA {questionIndex + 1} DE {TOTAL_QUESTIONS}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleHint}
                  disabled={isGeneratingHint || hintLevel >= 3 || !!feedback}
                  className="w-full rounded-2xl border-2 border-amber-100 bg-amber-50 text-amber-700 py-3 px-4 font-bold text-sm hover:bg-amber-100 transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  <span className="inline-flex items-center gap-2">
                    {isGeneratingHint ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    {hintLevel === 0 ? 'Necesito una pista' : `Pista nivel ${Math.min(3, hintLevel + 1)}`}
                  </span>
                </button>

                {hintText && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-900">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mb-1">
                      Pista actual
                    </p>
                    <p>{hintText}</p>
                  </div>
                )}
              </div>

              <div
                className={`grid gap-3 ${
                  category === 'divisibility' || category === 'combined'
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {options.map((option, index) => {
                  const isBool = typeof option === 'boolean';
                  return (
                    <button
                      key={index}
                      onClick={() => handleChoice(option)}
                      disabled={!!feedback}
                      className={`w-full p-4 rounded-xl font-bold text-xl shadow-sm border-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                        isBool
                          ? option
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 py-6 text-2xl'
                            : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:border-rose-200 py-6 text-2xl'
                          : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md'
                      }`}
                    >
                      {isBool ? (option ? 'SÍ' : 'NO') : option}
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div
                  className={`text-center h-6 font-bold text-sm tracking-wide ${
                    feedback.correct ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <button
                onClick={() => router.push('/')}
                className="w-full text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors py-2"
              >
                Abandonar sesión
              </button>
            </div>
          )}

          {screen === 'result' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-7xl mb-4">
                  {wasCompleted ? (correctCountRef.current >= 18 ? '🚀' : '👏') : '⏰'}
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                  {wasCompleted
                    ? correctCountRef.current >= 18
                      ? '¡Sesión superada!'
                      : '¡Buen trabajo!'
                    : '¡Tiempo agotado!'}
                </h2>
                <p className="text-slate-500 text-sm max-w-[320px] mx-auto">
                  Ahora no solo guardamos la puntuación: también registramos qué te costó,
                  qué mejoró y qué reto volverá después.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    TIEMPO FINAL
                  </p>
                  <p className="text-2xl font-black text-indigo-600 tabular-nums">
                    {finalTime.toFixed(1)}s
                  </p>
                </div>
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    ACIERTOS
                  </p>
                  <p className="text-2xl font-black text-indigo-600 tabular-nums">
                    {correctCountRef.current} / {TOTAL_QUESTIONS}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Review
                  </p>
                  <p className="text-lg font-black text-slate-700">{reviewQuestionCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Nuevos retos
                  </p>
                  <p className="text-lg font-black text-slate-700">{challengeCreatedCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Superados
                  </p>
                  <p className="text-lg font-black text-slate-700">{challengeMasteredCount}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  {isGeneratingInsights ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                  )}
                  Feedback final
                </div>

                {diagnostic && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white border border-emerald-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-2">
                          Lo que dominaste
                        </p>
                        <div className="space-y-2 text-sm text-slate-700">
                          {diagnostic.mastered.map((item) => (
                            <p key={item}>• {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white border border-rose-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-rose-500 font-bold mb-2">
                          Dónde costó
                        </p>
                        <div className="space-y-2 text-sm text-slate-700">
                          {diagnostic.struggles.map((item) => (
                            <p key={item}>• {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl bg-white border border-slate-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                          Por qué pasó
                        </p>
                        <p className="text-sm text-slate-700">{diagnostic.whyItHappened}</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                          Estrategia para la próxima
                        </p>
                        <p className="text-sm text-slate-700">{diagnostic.strategy}</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                          Tu reto para la próxima vez
                        </p>
                        <p className="text-sm text-slate-700">{diagnostic.nextChallenge}</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                          Próxima misión
                        </p>
                        <p className="text-sm text-slate-700">{diagnostic.nextMission}</p>
                      </div>
                    </div>

                    {diagnostic.attemptInsights.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Errores importantes de esta sesión
                        </p>
                        {diagnostic.attemptInsights.map((insight) => (
                          <div key={insight.attemptId} className="rounded-2xl bg-white border border-slate-100 p-4">
                            <p className="font-bold text-slate-800">{insight.promptText}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              Tu respuesta: <span className="font-semibold">{insight.userAnswer}</span>
                            </p>
                            <p className="text-sm text-slate-500">
                              Respuesta correcta:{' '}
                              <span className="font-semibold">{insight.correctAnswer}</span>
                            </p>
                            <p className="text-sm text-slate-700 mt-3">{insight.explanation}</p>
                            {insight.microStrategyTip && (
                              <p className="text-sm text-indigo-600 mt-2 font-medium">
                                {insight.microStrategyTip}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-700">
                      {diagnostic.reviewPreview}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Target className="h-4 w-4 text-indigo-500" />
                  ¿Cómo te sentiste al terminar?
                </div>
                <div className="grid gap-2">
                  {reflectionOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleReflection(option)}
                      className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                        reflectionChoice === option
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => void startSession()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                >
                  Jugar otra sesión
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Volver al menú
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
