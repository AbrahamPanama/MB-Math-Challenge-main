'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, RotateCcw, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';

const PiAreaDemo = () => {
  const [slices, setSlices] = useState(12);
  const [progress, setProgress] = useState(0); // 0 = Círculo, 1 = Rectángulo
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState(1);

  const radius = 85;
  const centerX = 200;
  const centerY = 150;

  // Animación fluida
  useEffect(() => {
    let animationId: number;
    if (isAnimating) {
      const startTime = performance.now();
      const duration = 2500;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const p = Math.min(elapsed / duration, 1);
        const easedP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        setProgress(easedP);

        if (p < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationId);
  }, [isAnimating]);

  const toggleAnimation = () => {
    if (progress > 0.5) {
      setIsAnimating(false);
      let p = progress;
      const animateBack = () => {
        p -= 0.03;
        if (p <= 0) {
          setProgress(0);
        } else {
          setProgress(p);
          requestAnimationFrame(animateBack);
        }
      };
      requestAnimationFrame(animateBack);
    } else {
      setIsAnimating(true);
    }
  };

  const reset = () => {
    setProgress(0);
    setIsAnimating(false);
    setSlices(12);
    setStep(1);
  };

  // Cálculo de sectores con geometría corregida
  const sliceElements = useMemo(() => {
    const elements = [];
    const sliceAngleRad = (2 * Math.PI) / slices;
    const halfAngle = sliceAngleRad / 2;

    // Chord width = the actual base width of each sector
    const chordWidth = 2 * radius * Math.sin(halfAngle);
    // Sector height from apex to arc midpoint
    const sectorHeight = radius * Math.cos(halfAngle);

    // In the rectangle, sectors interleave: even point up (tip top), odd point down (tip bottom).
    // They are spaced by chordWidth/2 horizontally.
    const totalRectWidth = (slices * chordWidth) / 2;
    const startX = centerX - totalRectWidth / 2;

    for (let i = 0; i < slices; i++) {
      const isTop = i % 2 === 0;

      // --- Circle state geometry ---
      // The path is drawn with apex at origin, arc extending in +Y.
      // Rotating by (angleDeg - 90) fans sectors outward from center.
      const angleDeg = (i * 360) / slices;
      const circleRotation = angleDeg - 90;

      // --- Rectangle state geometry ---
      // Even sectors (blue): rotation 180° → arc at TOP, tip at BOTTOM
      // Odd sectors (red): rotation 0° → tip at TOP, arc at BOTTOM
      // Both share the SAME vertical band (height ≈ r), interlocking like teeth.
      const targetRotation = isTop ? 180 : 0;
      const currentRotation = circleRotation + (targetRotation - circleRotation) * progress;

      // Rectangle position: sectors laid out horizontally
      const rectX = startX + i * (chordWidth / 2) + chordWidth / 4;
      // Blue (180°): translate below center so arc reaches top of band, tip at bottom
      // Red (0°): translate above center so tip at top of band, arc reaches bottom
      const rectY = isTop
        ? centerY + sectorHeight / 2   // blue: tip at bottom of band
        : centerY - sectorHeight / 2;  // red: tip at top of band

      // Interpolate position from circle center to rectangle position
      const currX = centerX + (rectX - centerX) * progress;
      const currY = centerY + (rectY - centerY) * progress;

      // Sector path: apex at (0,0), arc at distance=radius
      const xLeft = -radius * Math.sin(halfAngle);
      const xRight = radius * Math.sin(halfAngle);
      const yArc = sectorHeight;

      // Arc from left to right with sweep-flag=0:
      // SVG computes center at (0,0) with this flag combination,
      // producing an arc that bulges OUTWARD (away from apex). 
      const largeArcFlag = sliceAngleRad > Math.PI ? 1 : 0;
      const pathData = `M 0 0 L ${xLeft} ${yArc} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${xRight} ${yArc} Z`;

      elements.push({
        d: pathData,
        fill: i % 2 === 0 ? '#3b82f6' : '#ef4444',
        transform: `translate(${currX}, ${currY}) rotate(${currentRotation})`,
      });
    }
    return elements;
  }, [slices, progress, radius, centerX, centerY]);

  const steps = [
    {
      title: "El Círculo Original",
      content: "Comenzamos con un círculo de radio r. Para entender su área, lo dividimos en sectores iguales, como si fuera una pizza.",
      instruction: "Aumenta el número de sectores para ver cómo mejora la precisión."
    },
    {
      title: "Reorganización",
      content: "Si tomamos esos sectores y los alternamos (uno hacia arriba y otro hacia abajo), empezamos a formar una figura alargada.",
      instruction: "Haz clic en 'Animar' para ver la transformación física."
    },
    {
      title: "Hacia el Rectángulo",
      content: "A medida que los sectores son más pequeños, la base se vuelve más recta. Al límite, obtenemos un rectángulo casi perfecto.",
      instruction: "Observa cómo encajan los sectores rojos y azules."
    },
    {
      title: "La Deducción Final",
      content: "Este rectángulo tiene una altura igual al radio (r) y una base que es la mitad de la circunferencia (πr).",
      instruction: "Área = base × altura = (πr) × r = πr²."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center font-sans text-slate-900">
      <Card className="w-full max-w-4xl shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
        <CardHeader className="bg-white text-center pt-8 border-b border-slate-50">
          <CardTitle className="text-3xl font-black text-slate-800 flex items-center justify-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg"><BookOpen size={24} /></div>
            Visualizando el Área: πr²
          </CardTitle>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Guía Didáctica Interactiva</p>
        </CardHeader>

        <CardContent className="p-6 md:p-10 space-y-10">
          {/* SVG stage */}
          <div className="relative bg-slate-50 rounded-3xl border-2 border-slate-100 p-4 h-[380px] flex items-center justify-center shadow-inner overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="drop-shadow-sm">
              <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6,6" opacity={1 - progress} />

              {sliceElements.map((slice, i) => (
                <path
                  key={`${slices}-${i}`}
                  d={slice.d}
                  fill={slice.fill}
                  stroke="white"
                  strokeWidth="0.5"
                  transform={slice.transform}
                />
              ))}

              {progress > 0.85 && (
                <g opacity={Math.min(1, (progress - 0.85) / 0.15)}>
                  {/* Height label */}
                  <g transform={`translate(${centerX - 140}, ${centerY})`}>
                    <line y1={-radius / 2} y2={radius / 2} stroke="#64748b" strokeWidth="2" />
                    <text x="-25" y="5" fill="#64748b" fontFamily="serif" fontWeight="bold" fontSize="18" fontStyle="italic">r</text>
                  </g>
                  {/* Base label */}
                  <g transform={`translate(${centerX}, ${centerY + radius / 2 + 30})`}>
                    <line x1="-100" x2="100" stroke="#64748b" strokeWidth="2" />
                    <text x="-15" y="25" fill="#64748b" fontFamily="serif" fontWeight="bold" fontSize="18" fontStyle="italic">πr</text>
                  </g>
                </g>
              )}
            </svg>

            <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Estado Actual</span>
              <div className="bg-white px-3 py-1 rounded-full border shadow-sm text-xs font-bold text-blue-600">
                {progress > 0.9 ? 'Rectángulo' : progress < 0.1 ? 'Círculo' : 'Transformando'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Resolución</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Número de sectores</p>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{slices}</span>
                </div>
                <Slider
                  value={[slices]}
                  onValueChange={(v) => { setSlices(v[0]); setProgress(0); }}
                  min={4}
                  max={80}
                  step={2}
                  disabled={isAnimating}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={toggleAnimation}
                  className={`flex-1 h-14 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95 ${progress > 0.5 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {progress > 0.5 ? <RotateCcw className="mr-2" /> : <Play className="mr-2" />}
                  {progress > 0.5 ? "Restaurar" : "Animar"}
                </Button>
                <Button variant="outline" onClick={reset} className="h-14 w-14 rounded-2xl border-2 border-slate-100">
                  <RotateCcw size={20} className="text-slate-400" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 relative shadow-inner">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black absolute -top-4 -left-4 shadow-lg border-4 border-white">
                {step}
              </div>
              <h3 className="text-xl font-black text-blue-900 mb-2">{steps[step - 1].title}</h3>
              <p className="text-blue-800/70 text-sm leading-relaxed mb-6 font-medium italic">
                {steps[step - 1].content}
              </p>

              <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-blue-200/50">
                <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="font-bold text-blue-600">
                  <ChevronLeft size={18} /> Anterior
                </Button>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Paso {step}/4</span>
                <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.min(4, s + 1))} disabled={step === 4} className="font-bold text-blue-600">
                  Siguiente <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Final Summary */}
        <div className="bg-slate-900 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1">
            <h5 className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">Conclusión Matemática</h5>
            <p className="text-white text-lg font-medium">Área = Base × Altura</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center min-w-[80px]">
              <span className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Base</span>
              <span className="text-xl text-blue-400 font-serif font-bold italic">πr</span>
            </div>
            <div className="text-white text-2xl font-bold self-center">×</div>
            <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center min-w-[80px]">
              <span className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Altura</span>
              <span className="text-xl text-blue-400 font-serif font-bold italic">r</span>
            </div>
            <div className="text-white text-2xl font-bold self-center">=</div>
            <div className="bg-blue-600 px-6 py-3 rounded-2xl shadow-lg text-center min-w-[100px]">
              <span className="block text-[8px] text-blue-100 font-bold uppercase mb-1">Resultado</span>
              <span className="text-xl text-white font-serif font-black italic">πr²</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PiAreaDemo;
