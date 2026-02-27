'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import type { Category, Problem } from '@/lib/types';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, type Firestore } from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase no configurado.");
}
// --------------------

type GameScreen = 'game' | 'result';

// --- Game Logic ---
// --- Fraction helpers ---
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const renderFrac = (n: number | string, d: number | string): string =>
    `<div style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;gap:2px;vertical-align:middle;"><span>${n}</span><div style="width:100%;height:3px;background:#1e293b;border-radius:2px;"></div><span>${d}</span></div>`;
const renderFracInline = (n: number, d: number): string => `${n}/${d}`;
const fracRow = (...parts: string[]): string =>
    `<div style="display:flex;align-items:center;justify-content:center;gap:0.15em;">${parts.join('')}</div>`;

const generateOptions = (correctAnswer: Problem['ans'], type: string): (string | number | boolean)[] => {
    if (typeof correctAnswer === 'boolean') return [true, false];
    let options: (string | number | boolean)[] = [correctAnswer];
    let attempts = 0;
    while (options.length < 5 && attempts < 50) {
        attempts++;
        let decoy: string | number | undefined;
        if (type === 'reverse-mult') {
            const parts = (correctAnswer as string).split(' × ');
            const targetVal = parseInt(parts[0]) * parseInt(parts[1]);
            let a = Math.floor(Math.random() * 11) + 2;
            let b = Math.floor(Math.random() * 11) + 2;
            let decoyStr = `${a} × ${b}`;
            let decoyVal = a * b;
            if (!options.includes(decoyStr) && Math.abs(decoyVal - targetVal) <= 15 && decoyVal !== targetVal) {
                decoy = decoyStr;
            }
        } else if (type === 'reverse-add') {
            const parts = (correctAnswer as string).split(' + ');
            const targetVal = parseInt(parts[0]) + parseInt(parts[1]);
            let a = Math.max(1, parseInt(parts[0]) + (Math.floor(Math.random() * 11) - 5));
            let b = targetVal - a + (Math.floor(Math.random() * 7) - 3);
            if (b < 1) b = Math.floor(Math.random() * 9) + 1;
            let decoyStr = `${a} + ${b}`;
            let decoyVal = a + b;
            if (!options.includes(decoyStr) && decoyVal !== targetVal) {
                decoy = decoyStr;
            }
        } else if (type === 'fraction-str') {
            // Generate plausible wrong fraction strings
            const parts = (correctAnswer as string).split('/');
            const cn = parseInt(parts[0]);
            const cd = parseInt(parts[1]);
            const variations = [
                [cn + 1, cd], [cn - 1, cd], [cn, cd + 1], [cn, cd - 1],
                [cn + 1, cd + 1], [cn - 1, cd - 1], [cd, cn], [cn + 2, cd],
            ];
            const pick = variations[Math.floor(Math.random() * variations.length)];
            if (pick[0] > 0 && pick[1] > 0 && `${pick[0]}/${pick[1]}` !== correctAnswer) {
                decoy = `${pick[0]}/${pick[1]}`;
            }
        } else {
            let diff = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
            decoy = (correctAnswer as number) + diff;
        }
        if (decoy !== undefined && (typeof decoy !== 'number' || decoy > 0) && !options.includes(decoy)) {
            options.push(decoy);
        }
    }
    return options.sort(() => Math.random() - 0.5);
};

const generateProblem = (category: Category, questionIndex: number): Problem => {
    let p: Problem = { text: '', ans: null, type: 'standard' };
    const hardNumbers = [6, 7, 8, 9, 12];

    if (category === 'multiplication') {
        const isReverse = (questionIndex >= 10 && Math.random() > (questionIndex >= 15 ? 0.2 : 0.5));
        let a, b;
        if (questionIndex < 5) {
            a = Math.floor(Math.random() * 9) + 2;
            b = Math.floor(Math.random() * 9) + 2;
        } else if (questionIndex < 15) {
            a = hardNumbers[Math.floor(Math.random() * hardNumbers.length)];
            b = Math.floor(Math.random() * 11) + 2;
        } else {
            a = hardNumbers[Math.floor(Math.random() * hardNumbers.length)];
            b = hardNumbers[Math.floor(Math.random() * hardNumbers.length)];
        }
        if (isReverse) {
            const result = a * b;
            p.text = `<span class="text-indigo-600 font-bold mr-2">${result}</span> =`;
            p.ans = `${a} × ${b}`;
            p.type = 'reverse-mult';
        } else {
            p.text = `${a} × ${b}`;
            p.ans = a * b;
            p.type = 'standard';
        }
    } else if (category === 'addition') {
        const isReverse = (questionIndex >= 10 && Math.random() > (questionIndex >= 15 ? 0.2 : 0.5));
        let a, b;
        if (questionIndex < 5) {
            // Early: mix of 1-digit and small 2-digit numbers
            const roll = Math.random();
            if (roll < 0.35) {
                // Both 1-digit
                a = Math.floor(Math.random() * 8) + 2;
                b = Math.floor(Math.random() * 8) + 2;
            } else if (roll < 0.75) {
                // 1-digit + 2-digit (or vice versa)
                a = Math.floor(Math.random() * 8) + 2;
                b = Math.floor(Math.random() * 40) + 10;
                if (Math.random() > 0.5) [a, b] = [b, a];
            } else {
                // Both 2-digit (easy)
                a = Math.floor(Math.random() * 40) + 10;
                b = Math.floor(Math.random() * 40) + 10;
            }
        } else if (questionIndex < 10) {
            // Mid: 1-digit + 2-digit with harder numbers
            const roll = Math.random();
            if (roll < 0.4) {
                // 1-digit + 2-digit
                a = Math.floor(Math.random() * 8) + 2;
                const ends = [7, 8, 9];
                b = (Math.floor(Math.random() * 8) * 10) + ends[Math.floor(Math.random() * 3)];
                if (Math.random() > 0.5) [a, b] = [b, a];
            } else {
                // Both 2-digit with carrying
                const ends = [7, 8, 9];
                a = (Math.floor(Math.random() * 8) * 10) + ends[Math.floor(Math.random() * 3)];
                b = (Math.floor(Math.random() * 8) * 10) + ends[Math.floor(Math.random() * 3)];
            }
        } else {
            // Late: harder 2-digit + 2-digit with carrying
            const ends = [7, 8, 9];
            a = (Math.floor(Math.random() * 8) * 10) + ends[Math.floor(Math.random() * 3)];
            b = (Math.floor(Math.random() * 8) * 10) + ends[Math.floor(Math.random() * 3)];
        }
        if (isReverse) {
            const result = a + b;
            p.text = `<span style="color:#6366f1;font-weight:800;margin-right:0.15em;">${result}</span> =`;
            p.ans = `${a} + ${b}`;
            p.type = 'reverse-add';
        } else {
            p.text = `<div style="display:inline-flex;flex-direction:column;align-items:flex-end;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:0.05em;">
              <div>${a}</div>
              <div style="display:flex;align-items:baseline;">
                <span style="font-size:0.45em;color:#6366f1;margin-right:0.3em;">+</span>
                <span>${b}</span>
              </div>
              <div style="width:100%;height:4px;background:#1e293b;margin-top:6px;border-radius:2px;"></div>
            </div>`;
            p.ans = a + b;
            p.type = 'standard';
        }
    } else if (category === 'divisibility') {
        let divisor: number;
        if (questionIndex < 8) divisor = [2, 5, 10][Math.floor(Math.random() * 3)];
        else divisor = [3, 9][Math.floor(Math.random() * 2)];

        const base = Math.floor(Math.random() * 50) + 10;
        const isDiv = Math.random() > 0.5;
        const num = isDiv ? base * divisor : (base * divisor) + (Math.floor(Math.random() * (divisor - 1)) + 1);
        p.text = `<span class="text-slate-500 text-4xl align-middle mr-2">¿</span>${num} ÷ ${divisor}<span class="text-slate-500 text-4xl align-middle ml-2">?</span>`;
        p.ans = (num % divisor === 0);
    } else if (category === 'fractions') {
        // Reverse chance increases with question index
        const reverseChance = questionIndex < 5 ? 0.15 : questionIndex < 10 ? 0.3 : questionIndex < 15 ? 0.4 : 0.5;
        const isReverse = Math.random() < reverseChance;

        // Pick question type based on difficulty tier
        const easyTypes = ['frac-of-number', 'simplify', 'equivalent'];
        const medTypes = ['compare', 'add-same-denom', 'simplify', 'equivalent', 'frac-of-number'];
        const hardTypes = ['add-diff-denom', 'add-same-denom', 'compare', 'frac-of-number', 'simplify'];

        let questionType: string;
        if (questionIndex < 7) {
            questionType = easyTypes[Math.floor(Math.random() * easyTypes.length)];
        } else if (questionIndex < 14) {
            questionType = medTypes[Math.floor(Math.random() * medTypes.length)];
        } else {
            questionType = hardTypes[Math.floor(Math.random() * hardTypes.length)];
        }

        // Difficulty-scaled denominators
        const easyDenoms = [2, 3, 4, 5];
        const medDenoms = [2, 3, 4, 5, 6, 8];
        const hardDenoms = [3, 4, 5, 6, 7, 8, 9, 10, 12];
        const denoms = questionIndex < 7 ? easyDenoms : questionIndex < 14 ? medDenoms : hardDenoms;
        const pickDenom = () => denoms[Math.floor(Math.random() * denoms.length)];

        if (questionType === 'frac-of-number') {
            const d = pickDenom();
            const n = 1 + Math.floor(Math.random() * (d - 1)); // numerator < denominator
            const multiplier = questionIndex < 7 ? (Math.floor(Math.random() * 4) + 2) : (Math.floor(Math.random() * 6) + 2);
            const whole = d * multiplier; // ensures clean result
            const result = (n * whole) / d;
            if (isReverse) {
                p.text = fracRow(`<span style="color:#6366f1;font-weight:800;">${result}</span>`, `<span style="font-size:0.5em;color:#94a3b8;">= ${renderFracInline(n, d)} de ...</span>`);
                p.ans = whole;
                p.type = 'standard';
            } else {
                p.text = fracRow(renderFrac(n, d), `<span style="font-size:0.5em;color:#94a3b8;margin:0 0.2em;">de</span>`, `<span style="font-weight:800;">${whole}</span>`);
                p.ans = result;
                p.type = 'standard';
            }
        } else if (questionType === 'simplify') {
            const d = pickDenom();
            const n = 1 + Math.floor(Math.random() * (d - 1));
            const g = gcd(n, d);
            const simplN = n / g;
            const simplD = d / g;
            // Multiply by a factor so the student has to simplify
            const factor = 2 + Math.floor(Math.random() * (questionIndex < 7 ? 3 : 5));
            const shownN = simplN * factor;
            const shownD = simplD * factor;
            if (isReverse) {
                p.text = fracRow(renderFrac(simplN, simplD), `<span style="font-size:0.5em;color:#94a3b8;">= ?</span>`);
                p.ans = renderFracInline(shownN, shownD);
                p.type = 'fraction-str';
            } else {
                p.text = `<span style="font-size:0.45em;color:#94a3b8;">Simplifica</span><br>${renderFrac(shownN, shownD)}`;
                p.ans = renderFracInline(simplN, simplD);
                p.type = 'fraction-str';
            }
        } else if (questionType === 'equivalent') {
            const d = pickDenom();
            const n = 1 + Math.floor(Math.random() * (d - 1));
            const factor = 2 + Math.floor(Math.random() * 4);
            const targetD = d * factor;
            const targetN = n * factor;
            p.text = fracRow(renderFrac(n, d), `<span style="font-size:0.6em;color:#94a3b8;">=</span>`, renderFrac('?', targetD));
            p.ans = targetN;
            p.type = 'standard';
        } else if (questionType === 'compare') {
            // Generate two different fractions
            const d1 = pickDenom();
            const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
            let d2 = pickDenom();
            while (d2 === d1) d2 = pickDenom();
            let n2 = 1 + Math.floor(Math.random() * (d2 - 1));
            // Ensure they're not equal
            while (n1 / d1 === n2 / d2) {
                n2 = 1 + Math.floor(Math.random() * (d2 - 1));
            }
            const val1 = n1 / d1;
            const val2 = n2 / d2;
            p.text = `<div style="font-size:0.45em;color:#94a3b8;text-align:center;margin-bottom:0.3em;">¿Cuál es mayor?</div>` + fracRow(renderFrac(n1, d1), `<span style="font-size:0.6em;color:#94a3b8;margin:0 0.3em;">ó</span>`, renderFrac(n2, d2));
            p.ans = val1 > val2 ? renderFracInline(n1, d1) : renderFracInline(n2, d2);
            p.type = 'fraction-str';
        } else if (questionType === 'add-same-denom') {
            const d = pickDenom();
            const n1 = 1 + Math.floor(Math.random() * (d - 1));
            let n2 = 1 + Math.floor(Math.random() * (d - 1));
            // Keep sum <= d for proper fractions most of the time
            while (n1 + n2 > d * 2) n2 = 1 + Math.floor(Math.random() * (d - 1));
            const sumN = n1 + n2;
            const g = gcd(sumN, d);
            const ansN = sumN / g;
            const ansD = d / g;
            if (isReverse) {
                p.text = fracRow(renderFrac(ansN, ansD), `<span style="font-size:0.5em;color:#94a3b8;">= ? + ?</span>`);
                p.ans = `${renderFracInline(n1, d)} + ${renderFracInline(n2, d)}`;
                p.type = 'fraction-str';
            } else {
                p.text = fracRow(renderFrac(n1, d), `<span style="font-size:0.6em;color:#6366f1;margin:0 0.15em;">+</span>`, renderFrac(n2, d));
                p.ans = renderFracInline(ansN, ansD);
                p.type = 'fraction-str';
            }
        } else if (questionType === 'add-diff-denom') {
            let d1 = pickDenom();
            let d2 = pickDenom();
            while (d2 === d1) d2 = pickDenom();
            const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
            const n2 = 1 + Math.floor(Math.random() * (d2 - 1));
            const commonD = (d1 * d2) / gcd(d1, d2);
            const sumN = n1 * (commonD / d1) + n2 * (commonD / d2);
            const g = gcd(sumN, commonD);
            const ansN = sumN / g;
            const ansD = commonD / g;
            if (isReverse) {
                p.text = fracRow(renderFrac(ansN, ansD), `<span style="font-size:0.5em;color:#94a3b8;">= ? + ?</span>`);
                p.ans = `${renderFracInline(n1, d1)} + ${renderFracInline(n2, d2)}`;
                p.type = 'fraction-str';
            } else {
                p.text = fracRow(renderFrac(n1, d1), `<span style="font-size:0.6em;color:#6366f1;margin:0 0.15em;">+</span>`, renderFrac(n2, d2));
                p.ans = renderFracInline(ansN, ansD);
                p.type = 'fraction-str';
            }
        }
    }
    return p;
};


export default function PracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const category = params.skillId as Category;

    const [screen, setScreen] = useState<GameScreen>('game');
    const [correctCount, setCorrectCount] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const totalQuestions = 20;

    const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
    const [options, setOptions] = useState<(string | number | boolean)[]>([]);
    const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    // Timer state
    const [maxTime, setMaxTime] = useState(90);
    const [timeLeft, setTimeLeft] = useState(90);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);
    const startTime = useRef<number>(0);

    // Result state
    const [finalTime, setFinalTime] = useState(0);
    const [wasCompleted, setWasCompleted] = useState(false);

    // Audio
    const synth = useRef<any | null>(null);
    const toneReady = useRef(false);

    // Firebase
    const [userId, setUserId] = useState<string | null>(null);
    const [bestTime, setBestTime] = useState<number | null>(null);

    useEffect(() => {
        if (!auth) return;
        signInAnonymously(auth).catch((error) => console.error("Auth error:", error));
        const unsubAuth = onAuthStateChanged(auth, user => user && setUserId(user.uid));
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!db || !userId) return;
        const docPath = `artifacts/math-master-hard-numbers/users/${userId}/stats/main`;
        const unsubDb = onSnapshot(doc(db, docPath), (docSnap) => {
            if (docSnap.exists()) setBestTime(docSnap.data().bestTime || null);
        });
        return () => unsubDb();
    }, [userId]);


    const startNewGame = useCallback(() => {
        if (!category) return;
        const timeLimits: Record<Category, number> = { multiplication: 120, addition: 120, divisibility: 90, fractions: 120 };
        const newMaxTime = timeLimits[category] || 90;

        setScreen('game');
        setCorrectCount(0);
        setQuestionIndex(0);
        setMaxTime(newMaxTime);
        setTimeLeft(newMaxTime);
        setFeedback(null);

        const problem = generateProblem(category, 0);
        setCurrentProblem(problem);
        setOptions(generateOptions(problem.ans, problem.type));

        startTime.current = Date.now();
        if (timerInterval.current) clearInterval(timerInterval.current);
        timerInterval.current = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        // Init Audio
        const initAudio = async () => {
            if (toneReady.current) {
                // @ts-ignore
                await window.Tone.start();
            }
        }
        initAudio();

    }, [category]);

    useEffect(() => {
        startNewGame();
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [startNewGame]);

    const endGame = useCallback((completed: boolean) => {
        if (timerInterval.current) clearInterval(timerInterval.current);
        const timeElapsed = (Date.now() - startTime.current) / 1000;

        setFinalTime(timeElapsed);
        setWasCompleted(completed);
        setScreen('result');

        if (completed && correctCount >= 18) {
            if (toneReady.current && synth.current) {
                // @ts-ignore
                const Tone = window.Tone;
                const now = Tone.now();
                synth.current?.triggerAttackRelease(["C4", "E4", "G4", "C5"], "8n", now);
                synth.current?.triggerAttackRelease(["E4", "G4", "C5", "E5"], "4n", now + 0.2);
            }

            if (db && userId && (!bestTime || timeElapsed < bestTime)) {
                const docRef = doc(db, `artifacts/math-master-hard-numbers/users/${userId}/stats/main`);
                updateDoc(docRef, { bestTime: timeElapsed }).catch(() => {
                    setDoc(docRef, { bestTime: timeElapsed });
                });
            }
        }
    }, [correctCount, bestTime, userId, db]);


    useEffect(() => {
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, [timeLeft, endGame]);

    const handleChoice = (userVal: string | number | boolean) => {
        if (screen !== 'game' || !category) return;

        const isCorrect = userVal === currentProblem?.ans;
        setFeedback({ text: isCorrect ? '¡EXCELENTE!' : 'INCORRECTO', correct: isCorrect });

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            if (toneReady.current) synth.current?.triggerAttackRelease(["C5", "E5"], "16n");
        } else {
            if (toneReady.current) synth.current?.triggerAttackRelease("G2", "8n");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 300);
        }

        setTimeout(() => {
            const nextIndex = questionIndex + 1;
            if (nextIndex >= totalQuestions) {
                endGame(true);
            } else {
                setQuestionIndex(nextIndex);
                const nextProblem = generateProblem(category, nextIndex);
                setCurrentProblem(nextProblem);
                setOptions(generateOptions(nextProblem.ans, nextProblem.type));
                setFeedback(null);
            }
        }, 500);
    };

    if (!currentProblem || !category) {
        return null; // or a loading state
    }

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
            <div id="app" className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
                <div className={`bg-indigo-600 p-6 text-white transition-colors duration-500 relative overflow-hidden`} id="header-bg">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h1 className="text-xl font-bold tracking-tight">{category.charAt(0).toUpperCase() + category.slice(1)}</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
                            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">ACIERTOS</p>
                            <p id="score" className="text-2xl font-black tabular-nums">{correctCount} / {totalQuestions}</p>
                        </div>
                        <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
                            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">MEJOR TIEMPO</p>
                            <p id="best-time" className="text-2xl font-black tabular-nums">{bestTime ? `${bestTime.toFixed(1)}s` : '--:--'}</p>
                        </div>
                    </div>
                </div>

                <div id="screen-container" className="p-6">
                    {screen === 'game' && (
                        <div id="game-screen">
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-full bg-slate-100 h-2.5 rounded-full mb-3 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${timeBarPercent}%` }}></div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                    <span className="text-lg">⏱</span>
                                    <span className={`font-mono font-bold text-xl tabular-nums ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>{timeLeft}</span>
                                </div>
                            </div>

                            <div className="text-center mb-8 min-h-[140px] flex flex-col justify-center">
                                <div
                                    id="problem-text"
                                    className={`text-6xl font-black text-slate-800 tracking-tight leading-none mb-2 transition-all animate-pop ${isShaking ? 'animate-shake' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: currentProblem.text }}
                                ></div>
                                <p id="progress-text" className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">PREGUNTA {questionIndex + 1} DE {totalQuestions}</p>
                            </div>

                            <div id="choice-container" className={`grid gap-3 mb-6 ${category === 'divisibility' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {options.map((opt, i) => {
                                    const isBool = typeof opt === 'boolean';
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleChoice(opt)}
                                            className={`choice-btn w-full p-4 rounded-xl font-bold text-xl shadow-sm border-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${isBool
                                                ? opt
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 py-6 text-2xl"
                                                    : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:border-rose-200 py-6 text-2xl"
                                                : "bg-white text-slate-600 border-slate-100 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md"
                                                }`}
                                            disabled={!!feedback}
                                        >
                                            {isBool ? (opt ? 'SÍ' : 'NO') : opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback && (
                                <div className={`text-center h-6 font-bold text-sm tracking-wide transition-all opacity-100 transform-none ${feedback.correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {feedback.text}
                                </div>
                            )}

                            <button onClick={() => router.push('/')} className="mt-8 w-full text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors py-2">
                                Abandonar Sesión
                            </button>
                        </div>
                    )}

                    {screen === 'result' && (
                        <div id="result-screen" className="text-center py-6">
                            <div className="text-7xl mb-6 animate-bounce">
                                {wasCompleted ? (correctCount >= 18 ? '🚀' : '👏') : '⏰'}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                                {wasCompleted ? (correctCount >= 18 ? '¡Eres un Genio!' : '¡Bien Hecho!') : '¡Tiempo Agotado!'}
                            </h2>
                            <p className="text-slate-500 mb-10 leading-relaxed max-w-[280px] mx-auto text-sm">
                                {wasCompleted ?
                                    (correctCount >= 18 ? '¡Impresionante velocidad y precisión! Has dominado los números difíciles.' : 'Has completado la prueba. Intenta mejorar tu precisión en la próxima ronda.') :
                                    'Has sido rápido, pero el reloj ganó esta vez. ¡Vuelve a intentarlo!'
                                }
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">TIEMPO FINAL</p>
                                    <p className="text-2xl font-black text-indigo-600 tabular-nums">{finalTime.toFixed(1)}s</p>
                                </div>
                                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">ACIERTOS</p>
                                    <p className="text-2xl font-black text-indigo-600 tabular-nums">{correctCount} / {totalQuestions}</p>
                                </div>
                            </div>
                            <button onClick={() => router.push('/')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95">
                                Volver al Menú
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
