# Module: Operaciones con Fracciones (+, −, ×, ÷)

Implementation plan for extending the **existing `fractions` category** with the four
operations, plus an interactive theory page. Source material: Santillana 5.°/6.° grado
(adición y sustracción de fracciones; multiplicación de fracciones). We follow the textbook's
methodology but improve on it where the interactive medium allows (area model for ×, "how many
fit" intuition for ÷).

## Decisions (already made)

- **No new category.** Everything lands inside the current `fractions` category
  (`src/lib/practice-engine.ts` + the `Fracciones` menu/stats entries).
- **Operations:** addition, subtraction, multiplication, **and division**. Division is beyond the
  printed pages (invert-and-multiply) and targets grade 6.
- **Answer format stays multiple-choice** (consistent with the whole game and `app-spirit.md`).
- **Determinism first.** All generation/grading is in the deterministic engine. AI stays
  enrichment-only (hints, end-of-session diagnostic), always behind a fallback.
- **Didactic-first, accessible by design.** The operations are taught with explicit, one-at-a-time
  steps and a consistent visual language, built for neurodivergent learners (ADHD, autism,
  dyscalculia). The fast timed quiz is the *last* step of learning, not the only one — see the
  Didactic layer below.

## Guardrails (read `docs/app-spirit.md` first)

- A session is 20 questions; review challenges mix into new practice; result feedback must render
  even if AI fails. Don't break these.
- Problem `text` is **HTML rendered via `dangerouslySetInnerHTML`**. Build it only with the
  existing inline-styled helpers (`renderFrac`, `fracRow`, `renderMixedInline`, …). **Never** route
  AI output into problem text.
- Engine code is the high-value, bug-sensitive path. Add the focused tests in Phase 4 before UI
  polish.

---

## Didactic layer (the heart of this revision)

The original plan jumped straight from "here is a fraction problem" to "pick one of 5 answers". For a
child with ADHD, autism, or dyscalculia that single leap hides 3–5 invisible steps they must hold in
their head at once — which is exactly where they fall off. This layer makes every step **explicit,
visible, and done one at a time**, and reuses *one* source of truth so the wording is identical
everywhere a child sees it.

### Learning model: gradual release ("Yo lo hago → Lo hacemos → Tú lo haces")

Three surfaces, in order. A child can move up only when ready; nothing forces the timed quiz.

1. **Teoría** — *watch it work.* The interactive demo (area model, equalizing bars, reciprocal flip).
2. **Modo paso a paso** *(NEW — guided)* — *do it with scaffolding.* No timer. The problem is split
   into explicit numbered steps; the child makes **one small decision per step**; finished steps stay
   on screen as memory. This is the surface the user is asking for.
3. **Práctica rápida** — the existing timed 20-question quiz, for fluency once the steps are
   internalized.

The quiz's existing "Necesito una pista" button is rewired to reveal these *same* steps (same words),
so a child never meets two different explanations of the same operation.

### Design principles for neurodivergent learners (apply on every surface)

- **One step at a time; steps never disappear.** Reveal Paso 1, child acts, it locks and stays
  visible as an external-memory strip (`✓ Paso 1: 1/4 + 2/4 → numeradores 1 + 2`), then Paso 2
  appears. **Never** ask a child to remember an intermediate number — always show it.
- **Same visual language everywhere.** Fixed color roles: **Fracción A = índigo**, **Fracción B =
  esmeralda**, **Resultado = ámbar**. Numerator on top, denominator below, bar always the same — in
  Teoría, guided, hints, and quiz. Predictability lowers anxiety and working-memory load far more
  than any single clever graphic.
- **Name the action, number the step.** `Paso 2: Suma solo los numeradores.` Imperative, literal,
  short, no idioms, one instruction per line.
- **Chunk the answer.** Instead of one 5-option choice for the whole problem, ask a tiny question
  per step ("¿Cuál es el denominador común?") with **2–3 big options**. Each correct micro-step is a
  visible win.
- **Calm by default while learning.** Guided mode has no countdown, no shake, soft/optional sound,
  generous spacing. Respect `prefers-reduced-motion` and add a persisted **"Modo calma"** toggle
  (localStorage `mm20-calm`, same pattern as the existing music mute) that also softens the quiz.
- **Errors are information, not failure.** A wrong micro-step gently shows the correct move *with its
  visual* and lets the child redo *that step only* — no streak loss, no penalty in guided mode.
- **Low sensory load.** One thing animates at a time; never stack motion; keep the existing muted
  palette.

### Solution-trace engine (deterministic backbone — build this first)

The engine already computes every intermediate value; expose it as a structured trace so guided
mode, hints, and result-review all speak the same steps. Pure function, no AI, no randomness beyond
shuffling choice order.

```ts
// src/lib/fraction-solution.ts
type StepVisual =
  | { kind: 'fractions'; items: Array<{ n:number; d:number; tone:'a'|'b'|'result'; focus?:'num'|'den' }>; op?: '+'|'−'|'×'|'÷' }
  | { kind: 'bars'; a:{n:number;d:number}; b?:{n:number;d:number}; mode:'same'|'equalize'|'combine' }
  | { kind: 'area'; a:{n:number;d:number}; b:{n:number;d:number} }      // multiplication grid
  | { kind: 'flip'; from:{n:number;d:number}; to:{n:number;d:number} }; // division reciprocal

type SolutionStep = {
  id: string;
  title: string;        // "Paso 1: Igualar los denominadores"
  instruction: string;  // short, literal, imperative
  resultLine: string;   // the NEW state after this step (the external-memory strip)
  visual: StepVisual;
  micro?: {             // optional chunked question for guided mode
    prompt: string;     // "¿Cuál es el denominador común?"
    answer: string | number;
    choices: Array<string | number>;
    misconception?: string; // gentle line shown if they pick the classic wrong option
  };
};

export function buildFractionSolution(pattern: string, seed: Record<string, number>): SolutionStep[];
```

Reuse it for **three** things so wording stays identical:
- **Guided mode UI** — render steps; if `micro` exists, ask it.
- **`fallbackHintForProblem`** — hint level _k_ = reveal step _k_'s `instruction` + `resultLine`. Hints
  literally *become* the steps.
- **Result-screen review** of a missed quiz question — replay the trace.

### Explicit step recipes (the content `buildFractionSolution` encodes)

Spanish UI copy shown; keep it this literal. Each line is one step with its `visual.kind`.

**Suma/Resta · igual denominador** (`add-same-denom`, `sub-same-denom`)
1. *El denominador es el mismo: se queda igual.* — `bars: same` (both bars same slicing, denominators highlighted)
2. *Suma/Resta solo los numeradores.* — `fractions` with `focus:'num'` (numerators combine; denominator greyed/unchanged)
3. *Simplifica si se puede.* — `fractions` showing ÷gcd → result (ámbar)

**Suma/Resta · distinto denominador** (`add-diff-denom`, `sub-diff-denom`)
1. *Los denominadores son distintos: necesitamos uno común.* — `bars: equalize` (gentle "son distintos")
2. *Busca el denominador común.* — `bars: equalize` re-slicing both bars to the LCM · `micro:` "¿Cuál es el común?"
3. *Convierte cada fracción (×).* — `fractions` showing each ×factor on num **and** den
4. *Ahora suma/resta los numeradores.* — `fractions` `focus:'num'`
5. *Simplifica.* — result

**Multiplicación · fracción × fracción** (`mult-fractions`)
1. *No hace falta denominador común.* (explicit contrast — the #1 confusion vs addition) — `fractions` op `×`
2. *Multiplica los de arriba (numeradores).* — `area` rows × cols, overlap highlighted
3. *Multiplica los de abajo (denominadores).* — `area` total cells
4. *Simplifica.* — result

**Multiplicación · natural × fracción** (`mult-natural`)
1. *Escribe el número como fracción: n = n/1.* — `fractions`
2. *Multiplica arriba con arriba, abajo con abajo.* — `area`
3. *Simplifica.*

**División · fracción ÷ fracción** (`div-fractions`)
1. *La primera fracción se queda igual.* — `fractions` (A only)
2. *Voltea la segunda (su recíproco).* — `flip` (animate the flip, B tone)
3. *Cambia ÷ por ×.* — `fractions` op `×`
4. *Multiplica arriba con arriba, abajo con abajo.* — `area`
5. *Simplifica.* — plus intuition line: *"Pregúntate: ¿cuántos 1/4 caben en 3/4?"*

**Números mixtos** (`mixed-add`, `mixed-sub`, `mult-mixed`, `div-mixed`)
0. *Convierte cada mixto a fracción impropia (entero × denom + numerador).* — `fractions`
1–n. *Sigue los pasos de la operación de arriba.*
last. *Vuelve a número mixto y simplifica.*

> Borrowing in `mixed-sub` gets its own explicit step ("Pide prestado 1 entero: 3 1/6 → 2 7/6") rather
> than happening silently — borrowing is a classic invisible-step failure point.

### Guided "Modo paso a paso" UX

- **Entry:** on the Fracciones intro screen add a mode toggle — **"Paso a paso"** vs **"Rápido"** (and
  a "Practícalo paso a paso" link from the Teoría page). Recommend defaulting new/low-accuracy
  players to Paso a paso.
- **Screen:** problem pinned at top (always visible). Steps reveal one at a time below. Completed
  steps collapse into a compact ✓ memory strip. A small **Paso 2 / 4** progress indicator replaces
  the countdown bar — progress, not pressure.
- **Per step:** if it has a `micro` question, show 2–3 large buttons. Correct → step locks, next
  reveals, soft chime (if sound on). Wrong → inline gentle correction with the visual, retry the same
  step, no penalty.
- **Finish:** show the full reduced answer with the whole step strip as a recap, then **"Otra igual"**
  (same pattern, new numbers via the variant generator) to build a routine through repetition.
- **Decoupled & lightweight:** this mode runs its own loop over `generateProblem('fractions', …)` +
  `buildFractionSolution`; it does **not** need the 20-question/timer/challenge machinery. It *may*
  optionally record attempts (`attemptSource:'new'`) so mastery still benefits — keep that behind a
  flag to avoid coupling.

### Shared consistency + reduced-motion plumbing

- `src/lib/fraction-visual-tokens.ts` — the A/B/result color tokens, numerator/denominator styling,
  and a `renderFractionToken` aligned with the engine's `renderFrac`. Teoría, guided, hints, and quiz
  all import these so a numerator looks identical everywhere.
- `src/hooks/use-prefers-reduced-motion.ts` — gate `animate-shake` / `animate-pop` / any future
  confetti.
- **"Modo calma"** persisted toggle (`mm20-calm`): hides the timer pressure visuals, mutes sound by
  default, forces the reduced-motion path. Surfaces on the intro screen next to the mode toggle.

---

## New problem patterns

Each `pattern` string below is the stable key used for `reviewKey`, challenge dedup, template
rebuild, and variant generation. Add these to `buildFractionProblem` in
`src/lib/practice-engine.ts` (alongside the existing `add-same-denom` / `add-diff-denom`).

| pattern              | example                | answer type          | grade | misconception tag              |
|----------------------|------------------------|----------------------|-------|--------------------------------|
| `sub-same-denom`     | 5/8 − 2/8              | fraction-str         | 5–6   | `fraction_operation`           |
| `sub-diff-denom`     | 3/4 − 1/6 (LCM)        | fraction-str         | 5–6   | `fraction_common_denominator`  |
| `mixed-add`          | 2 1/5 + 1 1/4          | mixed-fraction-str   | 6     | `fraction_common_denominator`  |
| `mixed-sub`          | 3 1/6 − 1 4/9 (borrow) | mixed-fraction-str   | 6     | `fraction_common_denominator`  |
| `mult-fractions`     | 2/5 × 5/4              | fraction-str / whole | 5–6   | `fraction_multiplication`      |
| `mult-natural`       | 4 × 2/3                | fraction-str / whole | 5–6   | `fraction_multiplication`      |
| `mult-mixed`         | 3 1/4 × 1/3            | mixed/fraction       | 6     | `fraction_multiplication`      |
| `div-fractions`      | 3/4 ÷ 1/8              | fraction-str / whole | 6     | `fraction_division`            |
| `div-mixed`          | 2 1/2 ÷ 1 1/4          | fraction/whole       | 6     | `fraction_division`            |

(`add-same-denom` / `add-diff-denom` already exist — leave them, just route them through the new
answer-normalization helper below.)

### Answer normalization (fixes a latent bug too)

Today the add path can emit ugly answers like `"1/1"` or unreduced `"6/2"`. Add two helpers and use
them for **every** operation result (old and new):

```ts
// reduce + decide the display + the option-decoy "type"
const formatFractionAnswer = (n: number, d: number):
  { ans: string | number; type: 'fraction-str' | 'standard' } => {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  const rn = n / g, rd = d / g;
  return rd === 1
    ? { ans: rn, type: 'standard' }        // whole number → numeric decoys
    : { ans: `${rn}/${rd}`, type: 'fraction-str' };
};

// for mixed results: carry/borrow already applied, then reduce the fractional part
const formatMixedAnswer = (whole: number, n: number, d: number):
  { ans: string | number; type: 'mixed-fraction-str' | 'fraction-str' | 'standard' } => {
  whole += Math.floor(n / d); n = n % d;
  if (n === 0) return { ans: whole, type: 'standard' };
  const g = gcd(n, d) || 1; n /= g; d /= g;
  return whole === 0
    ? { ans: `${n}/${d}`, type: 'fraction-str' }
    : { ans: `${whole} ${n}/${d}`, type: 'mixed-fraction-str' };
};

const lcm = (a: number, b: number) => (a * b) / gcd(a, b); // gcd already exists
```

The `ans`/`type` pair flows straight into `buildProblem(...)` and `generateOptions(ans, type)`.
Because `type` decides decoys and the button value's JS type, keep them paired (numeric ans ↔
`standard`; string ans ↔ `fraction-str`/`mixed-fraction-str`). This matters: grading is
`userValue === problem.ans` (strict), so a numeric answer must produce numeric options.

### Generation rules / edge cases

- **Always reduce to irreducible** (textbook: "fracción irreducible").
- **Subtraction must be positive** — construct so the first fraction ≥ second
  (`buildPositiveDifference` already exists for this style).
- **Mixed subtraction borrowing:** if minuend's fractional part < subtrahend's, borrow 1 whole
  (add `d` to numerator, `whole−1`).
- **Division:** `a/b ÷ c/d = a/b × d/c`; guard `c ≠ 0`. For `div-mixed`, convert both to improper
  first.
- **Keep denominators small (≤ 12)** for legibility. For heterogeneous +/−, pick denominator pairs
  from a curated set that share factors so the LCM stays ≤ ~24 (e.g. {2,3,4,6,8,12}); otherwise the
  LCM (and the multiple-choice strings) get unreadable.
- **Decoys must be unique and ≠ the reduced correct answer.**

### Each pattern needs a deterministic rebuild branch

For challenge review to regenerate the *exact* problem, every new `pattern` must:

1. Store **all inputs** in `challengeSeed` (e.g. `mult-fractions` → `{ n1, d1, n2, d2 }`; the result
   is recomputed, not stored, so it can never drift).
2. Get a matching branch in **`createProblemFromTemplate`** (the `if (category === 'fractions')`
   block) that reads the seed, recomputes via the same formula, and returns an identical `Problem`.
3. Be covered by the new **`createVariantProblem` fractions branch** (below).

### Fix: fractions currently have no review variant

`createVariantProblem` has branches for multiplication/addition/divisibility/combined but **none for
fractions**, so every fraction challenge re-shows the identical problem on review. Add a `fractions`
branch that perturbs the seed while preserving `pattern` + `difficulty`, then recomputes the answer:

- `*-same-denom` / `*-diff-denom`: nudge a numerator ±1 (kept in `[1, d-1]`), recompute.
- `mult-*` / `div-*`: swap one operand for a nearby one from the same denominator set.
- mixed patterns: nudge the whole part by ±1.

Fall back to the exact template rebuild if a perturbation can't produce a valid (positive,
in-range) problem.

### Grade / difficulty pools (`makeFractionsProblem`)

The textbook teaches +/−/× in **5th grade**, so operations now appear for grade 5 (today grade ≤5
only sees concept types — this is an intended behavior change). Difficulty still ramps by question
index (easy `<7`, medium `<14`, hard `≥14`). Suggested pools (tune with the teacher):

- **Grade 5**
  - easy: `frac-of-number`, `simplify`, `equivalent`, `mixed-to-improper`, `add-same-denom`,
    `sub-same-denom`
  - medium: + `add-diff-denom`, `sub-diff-denom`, `mult-natural`, `mult-fractions`, `compare`
  - hard: + `improper-to-mixed`, `div-fractions` (stretch)
- **Grade 6**
  - easy: concepts + same-denom +/− + `mult-natural`
  - medium: diff-denom +/−, `mult-fractions`, `mult-mixed`, `improper-to-mixed`, `compare`
  - hard: `mixed-add`, `mixed-sub`, `div-fractions`, `div-mixed`

---

## Misconception tags & feedback copy

Add three tags to the `MisconceptionTag` union in `src/lib/types.ts`:
`fraction_common_denominator`, `fraction_multiplication`, `fraction_division`.

Then add Spanish copy for each in **three** maps (don't skip any — TS won't force these to be
exhaustive because the maps are `Record<MisconceptionTag, string>`, so a missing key is a runtime
gap):

- `misconceptionWhy` (practice-engine) — *why it happened*, e.g.
  `fraction_common_denominator: 'Faltó igualar los denominadores antes de sumar o restar.'`
- `misconceptionStrategy` (practice-engine) — *what to do next*, e.g.
  `fraction_multiplication: 'Multiplica numerador por numerador y denominador por denominador, luego simplifica.'`
- `fallbackVariantFocus` switch (`src/lib/saveManager.ts`) — *how the challenge returns*, e.g.
  `fraction_division: 'Volverá con otra división para practicar invertir y multiplicar.'`

Optional but nice: extend `fallbackHintForProblem` with level-2/3 worked hints per new tag (level 1
already uses `misconceptionStrategy`).

## Targeted decoys (Phase 2 polish)

`generateOptions(correctAnswer, type)` already covers `fraction-str` / `mixed-fraction-str` /
numeric, so the module works without touching it. To make the multiple-choice *diagnostic*, add one
"classic mistake" distractor per operation by threading the problem in:

- diff-denom add: `(n1+n2)/(d1+d2)` (added across without common denom)
- diff-denom sub: `(n1−n2)/(d1−d2)`
- multiplication: cross-multiplied, or added instead of multiplied
- division: multiplied straight without inverting

Make it backward-compatible: `generateOptions(correctAnswer, type, problem?)`, inject the decoy when
`problem` is provided, and update the two call sites in
`src/app/practice/[skillId]/page.tsx` (`startSession`, `goToNextQuestion`) to pass the problem.

## Timing/copy tuning (small)

- `TIME_LIMITS.fractions` (page `[skillId]`): consider 120 → 150s now that sessions include heavier
  operations.
- `getQuestionThresholdMs` fractions: 9000 → ~11000ms (challenge "slow" threshold).
- `defaultGoalsByCategory.fractions`: add an ops-flavored goal, e.g.
  *"Quiero cuidar el denominador común al sumar y restar."*
- `src/app/page.tsx` `fracFocus`: grade 5 → *"Enfoque: Sumar, restar y multiplicar"*; grade 6 →
  *"Enfoque: +, −, × y ÷ con mixtos"*.

---

## Theory page: `/teoria/operaciones-fracciones`

Mirror the existing `FractionsDemo` conventions (client component, `/teoria` back-link, white header
card, interactive sections with shadcn `Slider`/`Button`/`RadioGroup`, Tailwind only).

1. **Extract the reusable visual.** Move the inline `FractionVisual` (pill/square/circle/egg-carton)
   out of `src/components/teoria/FractionsDemo.tsx` into
   `src/components/teoria/FractionVisual.tsx` and import it from both demos. (Pure refactor — keep
   behavior identical.)
2. **New component** `src/components/teoria/FractionOperationsDemo.tsx` with three sections:
   - **Suma y resta** — a `RadioGroup` toggle (sumar/restar) + two fraction inputs (sliders).
     When denominators differ, visually re-slice both bars into LCM-sized pieces *first* (the key
     idea kids miss), then combine the shaded parts. Show the 3 steps: igualar → operar → simplificar
     with the live numeric result.
   - **Multiplicación (modelo de área)** — this is the textbook's grid (p. 52–53). Overlay
     fraction A as shaded **rows** and fraction B as shaded **columns** on a `d1 × d2` grid; the
     double-shaded overlap cells = numerator of the product, total cells = denominator. Then reduce.
     This makes "why you multiply across" obvious.
   - **División (invertir y multiplicar)** — animate the divisor flipping to its reciprocal and the
     `÷` turning into `×`, alongside the intuition *"¿cuántos 1/4 caben en 3/4?"* with a bar split
     into quarters.
   Each section: live result + step text + a "Reiniciar" button (reuse the `RotateCcw` pattern).
   **Drive the step text from `buildFractionSolution` and the shared `fraction-visual-tokens`** so
   the demo, the guided mode, and the hints all narrate the operation with the exact same words and
   colors (consistency is the accessibility win — don't hand-write parallel copy here).
3. **Register the topic** in `src/app/teoria/page.tsx` `topics[]` (e.g. icon `Calculator` or
   `X`/`Divide` from lucide), and add `src/app/teoria/operaciones-fracciones/page.tsx`:
   ```tsx
   import FractionOperationsDemo from '@/components/teoria/FractionOperationsDemo';
   export default function Page() { return <FractionOperationsDemo />; }
   ```

---

## Engine tests (before broad UI polish)

Per `app-spirit.md`, add focused engine tests before UI polish. Recommend **vitest**
(`npm i -D vitest`, add `"test": "vitest"`), file `src/lib/practice-engine.test.ts`:

- **Answerability:** for every new pattern, generate N problems and assert the stated `ans` equals
  the value recomputed from `challengeSeed` by an independent reference formula.
- **Normalization:** `formatFractionAnswer(6,2)→3` (standard), `(1,1)→1`, `(4,6)→"2/3"`;
  `formatMixedAnswer` carries (`(1, 7, 5)→"2 2/5"`) and borrows correctly.
- **Template round-trip:** `generateProblem`→`createProblemFromTemplate(metadata)` yields identical
  `ans` + `plainText` for each pattern.
- **Variant validity:** `createVariantProblem` fractions branch returns positive, in-range,
  answerable problems for each pattern.
- **Options:** `generateOptions` includes the correct answer, has the right length, unique entries,
  and (Phase 2) contains the misconception decoy.
- **Invariants:** subtraction results are always ≥ 0; `buildPracticeQueue` still returns 20 items
  with the expected review mix.
- **Solution trace:** for every pattern, `buildFractionSolution` returns ≥ 2 steps, the final
  `resultLine` matches the problem's reduced answer, and every `micro.answer` is present in its own
  `micro.choices`. (This guarantees guided mode and hints can never contradict the engine.)

---

## File-by-file change list

| File | Change |
|------|--------|
| `src/lib/types.ts` | +3 `MisconceptionTag` values |
| `src/lib/practice-engine.ts` | `lcm`, `formatFractionAnswer`, `formatMixedAnswer`; new `buildFractionProblem` branches (sub/mult/div/mixed); update `makeFractionsProblem` pools; new `createProblemFromTemplate` fraction branches; new `createVariantProblem` fractions branch; extend `misconceptionWhy`/`misconceptionStrategy`; optional `fallbackHintForProblem` + `generateOptions` decoys; tune `getQuestionThresholdMs`, `defaultGoalsByCategory.fractions` |
| `src/lib/saveManager.ts` | extend `fallbackVariantFocus` switch for the 3 new tags |
| `src/lib/fraction-solution.ts` | **new** — `SolutionStep`, `buildFractionSolution` (deterministic step trace; backbone of guided mode + hints + review) |
| `src/lib/fraction-visual-tokens.ts` | **new** — shared A/B/result colors + numerator/denominator styling + `renderFractionToken` |
| `src/lib/practice-engine.ts` | additionally: rewire `fallbackHintForProblem` to read `buildFractionSolution` steps |
| `src/hooks/use-prefers-reduced-motion.ts` | **new** — gate shake/pop/confetti |
| `src/app/practice/[skillId]/page.tsx` | (Phase 2) pass `problem` to `generateOptions`; `TIME_LIMITS.fractions` bump; add "Paso a paso"/"Rápido" + "Modo calma" toggles on the intro screen; honor reduced-motion + `mm20-calm` |
| `src/app/practice-guided/fractions/page.tsx` (or a mode flag on `[skillId]`) | **new** — the untimed step-by-step loop over `generateProblem` + `buildFractionSolution` |
| `src/components/practice/SolutionSteps.tsx` | **new** — renders a `SolutionStep[]` one-at-a-time with the memory strip + per-step `micro` choices (shared by guided mode, hints, result review) |
| `src/app/page.tsx` | update `fracFocus` copy |
| `src/components/teoria/FractionVisual.tsx` | **new** — extracted shared visual |
| `src/components/teoria/FractionsDemo.tsx` | import the extracted `FractionVisual` |
| `src/components/teoria/FractionOperationsDemo.tsx` | **new** — the operations demo (narrated by `buildFractionSolution`) |
| `src/app/teoria/operaciones-fracciones/page.tsx` | **new** route |
| `src/app/teoria/page.tsx` | add topic entry |
| `vitest.config.ts`, `src/lib/*.test.ts`, `package.json` | **new** (test phase) — cover `buildFractionSolution` too |

## Suggested sequencing

1. **Engine core** — helpers + `sub-*` and `mult-*` patterns + `createProblemFromTemplate` branches
   + grade pools. Verify by playing a grade-5 Fracciones session.
2. **Division + mixed numbers** (`div-*`, `mixed-add`, `mixed-sub`) + `createVariantProblem` branch
   + the 3 misconception tags & copy.
3. **Solution-trace backbone** — `buildFractionSolution` + `fraction-visual-tokens` + the
   `SolutionSteps` component. Rewire `fallbackHintForProblem` to use it (the quiz instantly gets
   explicit, visual hints). **This is the didactic core — do not defer it.**
4. **Guided "Modo paso a paso"** — the untimed loop + intro-screen mode/calma toggles + reduced
   motion. (Depends only on step 3.)
5. **Theory page** — extract `FractionVisual`, build the 3-section demo *narrated by the same
   `buildFractionSolution`*, register topic.
6. **Hardening** — vitest (engine + `buildFractionSolution`), targeted decoys, timing/copy tuning.

Steps 1–2 are pure engine and independently shippable. Step 3 is the accessibility backbone and
unlocks both the guided mode (4) and a better-narrated theory page (5). If you must ship the
smallest didactic win first, do **1 → 3** and rewire hints — that alone makes the existing quiz teach
the steps explicitly.
