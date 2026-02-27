'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, type Firestore } from 'firebase/firestore';

// NOTE: Add your Firebase config here
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
  console.warn("Firebase no configurado. La persistencia de datos no funcionará.");
}

const CategoryButton = ({
  href,
  title,
  time,
  focus,
}: {
  href: string;
  title: string;
  time: string;
  focus: string;
}) => (
  <Link
    href={href}
    className="w-full p-4 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
  >
    <div className="text-left">
      <span className="block font-bold text-slate-700 text-lg">{title}</span>
      <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px]">{time}</span>
      <span className="text-xs text-indigo-500 block mt-1">{focus}</span>
    </div>
    <span className="text-slate-300 group-hover:text-indigo-500 text-2xl transition-colors">→</span>
  </Link>
);

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch((error) => {
      console.error("Error en auth anónimo:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db || !userId) return;
    const docPath = `artifacts/math-master-hard-numbers/users/${userId}/stats/main`;
    const unsubscribeDb = onSnapshot(doc(db, docPath), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBestTime(data.bestTime || null);
      }
    });
    return () => unsubscribeDb();
  }, [userId]);

  return (
    <div id="app" className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
      <div className="bg-indigo-600 p-6 text-white transition-colors duration-500 relative overflow-hidden" id="header-bg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>MathMaster 20</span>
          </h1>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] font-mono opacity-90" id="user-id-display">
              {userId ? `ID: ${userId.slice(0, 6)}` : 'Conectando...'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">ACIERTOS</p>
            <p id="score" className="text-2xl font-black tabular-nums">0 / 20</p>
          </div>
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">MEJOR TIEMPO</p>
            <p id="best-time" className="text-2xl font-black tabular-nums">
              {bestTime ? `${bestTime.toFixed(1)}s` : '--:--'}
            </p>
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
          <CategoryButton href="/practice/multiplication" title="Multiplicación" time="2:00 MIN" focus="Enfoque: Tablas 6, 7, 8, 9" />
          <CategoryButton href="/practice/addition" title="Sumas" time="2:00 MIN" focus="Enfoque: Llevadas difíciles" />
          <CategoryButton href="/practice/divisibility" title="Divisibilidad" time="1:30 MIN" focus="Enfoque: Reglas del 3 y 9" />
        </div>
      </div>
    </div>
  );
}
