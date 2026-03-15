'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Circle } from 'lucide-react';

const topics = [
  {
    href: '/teoria/pi-area',
    title: 'Área del Círculo: πr²',
    description: 'Descubre por qué el área del círculo es πr² con una demostración visual interactiva.',
    icon: Circle,
    color: 'bg-blue-600',
  },
];

export default function TeoriaPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center font-sans text-slate-900">
      <div className="w-full max-w-2xl space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} /> Volver al menú
        </Link>

        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white shadow-lg mb-2">
            <BookOpen size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Teoría</h1>
          <p className="text-slate-400 text-sm font-medium">
            Explora conceptos matemáticos con demostraciones interactivas.
          </p>
        </div>

        {/* Topic cards */}
        <div className="space-y-4">
          {topics.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="block w-full p-5 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl group transition-all shadow-sm hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`${topic.color} p-3 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <topic.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-700 group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {topic.description}
                  </p>
                </div>
                <span className="text-slate-300 group-hover:text-indigo-500 text-2xl transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
