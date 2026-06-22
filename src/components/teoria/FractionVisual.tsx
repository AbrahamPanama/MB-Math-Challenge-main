'use client';

export type VisualizerMode = 'pill' | 'square' | 'circle' | 'egg-carton';

type FractionVisualProps = {
  numerator: number;
  denominator: number;
  label: string;
  tone?: 'indigo' | 'emerald';
  mode: VisualizerMode;
};

export const visualizerOptions: Array<{
  id: VisualizerMode;
  label: string;
  description: string;
}> = [
  { id: 'pill', label: 'Pildora', description: 'Una barra partida en pedazos iguales.' },
  { id: 'square', label: 'Cuadrado', description: 'Un bloque dividido en cuadritos.' },
  { id: 'circle', label: 'Circulo', description: 'Una pizza con rebanadas iguales.' },
  { id: 'egg-carton', label: 'Caja de huevos', description: 'Huecos llenos y vacios para contar.' },
];

const getToneClasses = (tone: 'indigo' | 'emerald') => ({
  filled: tone === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-400',
  empty: tone === 'emerald' ? 'bg-emerald-50' : 'bg-indigo-50',
  border: tone === 'emerald' ? 'border-emerald-500' : 'border-indigo-500',
  stroke: tone === 'emerald' ? '#10b981' : '#6366f1',
  fill: tone === 'emerald' ? '#34d399' : '#818cf8',
  emptyFill: tone === 'emerald' ? '#ecfdf5' : '#eef2ff',
});

const getSlicePoint = (center: number, radius: number, angleDegrees: number) => {
  const angleRadians = (Math.PI / 180) * angleDegrees;
  return {
    x: center + radius * Math.cos(angleRadians),
    y: center + radius * Math.sin(angleRadians),
  };
};

const getSlicePath = (index: number, total: number) => {
  const center = 60;
  const radius = 48;
  const startAngle = -90 + (index * 360) / total;
  const endAngle = -90 + ((index + 1) * 360) / total;
  const start = getSlicePoint(center, radius, startAngle);
  const end = getSlicePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
};

export function FractionVisual({
  numerator,
  denominator,
  label,
  tone = 'indigo',
  mode,
}: FractionVisualProps) {
  const toneClasses = getToneClasses(tone);
  const filledParts = Math.min(numerator, denominator);

  const renderPill = () => (
    <div className={`flex h-10 overflow-hidden rounded-full border-2 ${toneClasses.border} bg-white`}>
      {Array.from({ length: denominator }).map((_, index) => (
        <div
          key={index}
          className={`flex-1 ${index < filledParts ? toneClasses.filled : toneClasses.empty} ${
            index === denominator - 1 ? '' : 'border-r border-white'
          }`}
        />
      ))}
    </div>
  );

  const renderSquare = () => {
    const columns = Math.min(denominator, 10);
    return (
      <div
        className={`mx-auto grid max-w-[220px] gap-1 rounded-2xl border-2 ${toneClasses.border} bg-white p-2`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: denominator }).map((_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-md ${index < filledParts ? toneClasses.filled : toneClasses.empty}`}
          />
        ))}
      </div>
    );
  };

  const renderCircle = () => (
    <svg viewBox="0 0 120 120" className="mx-auto h-32 w-32 drop-shadow-sm" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="white" stroke={toneClasses.stroke} strokeWidth="3" />
      {Array.from({ length: denominator }).map((_, index) => (
        <path
          key={index}
          d={getSlicePath(index, denominator)}
          fill={index < filledParts ? toneClasses.fill : toneClasses.emptyFill}
          stroke="white"
          strokeWidth="1"
        />
      ))}
      <circle cx="60" cy="60" r="50" fill="none" stroke={toneClasses.stroke} strokeWidth="3" />
    </svg>
  );

  const renderEggCarton = () => {
    const columns = Math.min(denominator, 5);
    return (
      <div
        className={`mx-auto grid max-w-[230px] gap-2 rounded-[28px] border-2 ${toneClasses.border} bg-white p-3 shadow-inner`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: denominator }).map((_, index) => (
          <div
            key={index}
            className={`flex aspect-square items-center justify-center rounded-full border ${
              index < filledParts
                ? `${toneClasses.filled} border-white`
                : `${toneClasses.empty} border-slate-200`
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          </div>
        ))}
      </div>
    );
  };

  const content = {
    pill: renderPill,
    square: renderSquare,
    circle: renderCircle,
    'egg-carton': renderEggCarton,
  }[mode]();

  return (
    <div className="space-y-2">
      {content}
      <p className="text-center text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
    </div>
  );
}
