export type FractionTone = 'a' | 'b' | 'result' | 'neutral';
export type FractionFocus = 'num' | 'den';

export const fractionToneCopy: Record<FractionTone, string> = {
  a: 'Fraccion A',
  b: 'Fraccion B',
  result: 'Resultado',
  neutral: 'Fraccion',
};

export const fractionToneClasses: Record<
  FractionTone,
  {
    text: string;
    bg: string;
    softBg: string;
    border: string;
    fill: string;
    empty: string;
    ring: string;
  }
> = {
  a: {
    text: 'text-indigo-700',
    bg: 'bg-indigo-600',
    softBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    fill: 'bg-indigo-400',
    empty: 'bg-indigo-50',
    ring: 'ring-indigo-200',
  },
  b: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-600',
    softBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    fill: 'bg-emerald-400',
    empty: 'bg-emerald-50',
    ring: 'ring-emerald-200',
  },
  result: {
    text: 'text-amber-700',
    bg: 'bg-amber-500',
    softBg: 'bg-amber-50',
    border: 'border-amber-200',
    fill: 'bg-amber-400',
    empty: 'bg-amber-50',
    ring: 'ring-amber-200',
  },
  neutral: {
    text: 'text-slate-700',
    bg: 'bg-slate-500',
    softBg: 'bg-slate-50',
    border: 'border-slate-200',
    fill: 'bg-slate-300',
    empty: 'bg-slate-50',
    ring: 'ring-slate-200',
  },
};

export const renderFractionToken = (
  numerator: number | string,
  denominator: number | string,
  tone: FractionTone = 'neutral',
  focus?: FractionFocus
): string => {
  const color =
    tone === 'a'
      ? '#4338ca'
      : tone === 'b'
        ? '#047857'
        : tone === 'result'
          ? '#b45309'
          : '#334155';
  const muted = '#94a3b8';
  const numColor = !focus || focus === 'num' ? color : muted;
  const denColor = !focus || focus === 'den' ? color : muted;

  return `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;gap:2px;vertical-align:middle;font-weight:900;color:${color};">
    <span style="color:${numColor};">${numerator}</span>
    <span style="width:100%;height:3px;background:${color};border-radius:2px;"></span>
    <span style="color:${denColor};">${denominator}</span>
  </span>`;
};
