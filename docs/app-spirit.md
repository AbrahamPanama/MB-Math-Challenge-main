# MathMaster 20 App Spirit

This document is the north star for changing MathMaster 20. It is not a feature list or a roadmap. It describes the feeling, product judgment, and engineering posture that should survive as the code evolves.

## What The App Is

MathMaster 20 is a fast, friendly math practice game for children who need repeated practice without feeling punished by it.

The core loop is simple: choose a profile, pick a math category, answer 20 questions under a light time constraint, and leave with a clear sense of what improved and what will come back next.

The app should feel like a focused training session, not a worksheet, dashboard, or lecture. It should be playful enough for a child to want another round, but calm enough that mistakes feel useful instead of embarrassing.

## Product Promise

Every session should answer three questions for the learner:

- What did I get right?
- What still needs practice?
- What is my next small challenge?

Scores matter, but they are not the main story. The main story is momentum.

## Learner Experience

The app is for children first. Parents, teachers, and future dashboards can matter, but the child-facing practice loop should stay direct and emotionally safe.

Good sessions feel:

- Quick to start.
- Easy to understand without instructions.
- Honest about mistakes without scolding.
- Rewarding even when the score is not perfect.
- Specific about what comes next.

Bad sessions feel:

- Verbose.
- Overdesigned.
- Too dashboard-like.
- Randomly punitive.
- Full of abstract feedback the child cannot act on.

## Voice And Tone

The voice should be warm, brief, and concrete.

Use direct Spanish UI copy for the primary game experience. Prefer phrases a child can understand immediately. Avoid teacherly paragraphs during gameplay. Save longer reflection for the result screen, and even there keep it tight.

Feedback should name the action, not judge the child:

- Good: "Lo revisaremos otra vez."
- Good: "Tu proximo reto sera cuidar las llevadas."
- Avoid: "Fallaste esta parte."
- Avoid: "Debes estudiar mas."

## Design Principles

The first screen after profile selection should be useful immediately. No marketing layer, no long onboarding, no decorative detours.

The visual system should support focus:

- Large tap targets.
- Clear category choices.
- Strong contrast for answer buttons.
- Short labels.
- Minimal visual noise around the active problem.
- Motion and sound as feedback, not distraction.

The app currently uses a compact mobile-first frame. Preserve that density and clarity unless there is a deliberate reason to expand the experience.

## Practice Logic Principles

The deterministic practice engine is the spine of the app. AI can enrich hints, summaries, and review planning, but the game should remain playable and understandable without AI.

Protect these behaviors:

- A session has 20 questions.
- Review challenges are mixed into new practice.
- Mistakes and slow answers can become future challenges.
- Result feedback appears even if AI calls fail.
- Saved progress lives with the selected player profile.

Randomness should create variety, not chaos. If a problem generator changes, it should still be grade-aware, answerable, and easy to test.

## AI Principles

AI is a tutor voice, not the source of truth.

Use AI for:

- Hints that guide without giving away the answer.
- End-of-session explanations.
- Short review suggestions.
- Rephrasing deterministic signals into child-friendly language.

Do not use AI for:

- Deciding whether an answer is correct.
- Generating HTML that is rendered directly into the problem area.
- Replacing the local fallback diagnostic.
- Making the app unusable when network or model calls fail.

## Progress And Mastery

Progress should feel like "I am getting better," not "I am being tracked."

Best times, accuracy, retries, and mastered challenges should encourage return visits. Challenge scheduling should make mistakes useful: an error becomes a future chance to prove growth.

Avoid mechanics that shame, over-rank, or trap the learner in remediation. The app should always provide another reachable next step.

## Engineering Posture

Prefer boring, testable logic for the core game loop.

Important code paths should stay small enough to reason about:

- Problem generation.
- Answer option generation.
- Attempt recording.
- Session finalization.
- Save normalization.
- Challenge scheduling.

When changing these areas, add focused tests before broad UI polish. Bugs in the practice engine are more damaging than visual rough edges.

## What To Protect

Protect the feeling that a child can open the app, play a session, make a few mistakes, and leave more confident than they arrived.

That is the spirit of MathMaster 20.
