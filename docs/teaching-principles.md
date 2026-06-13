# Teaching principles (from Matt Pocock's `teach` skill)

Reference distilled from [github.com/mattpocock/skills](https://github.com/mattpocock/skills) —
`skills/productivity/teach/SKILL.md`. The lesson generator (`src/lib/lessons.ts`) applies these rules.

## Core ideas

- **Mission-grounded**: every lesson ties back to *why* the learner cares. Here, the mission is
  derived from data: the player's actual recurring weaknesses and their cost in games.
- **One tightly-scoped thing per lesson.** Working memory is small; each lesson teaches a single
  mental model and must be completable quickly, giving one tangible win.
- **Knowledge → Skills → Wisdom**:
  - Knowledge from high-trust resources (each lesson links a primary source).
  - Skills via interactive lessons with the **tightest possible feedback loop**
    (interactive boards validate moves instantly; quizzes explain immediately).
  - Wisdom by playing real games and reviewing them (the sync→analyze loop).
- **Fluency vs storage strength**: in-the-moment recall feels like mastery but fades.
  Build long-term retention through *desirable difficulty*:
  - retrieval practice (quizzes, "find the move" rather than showing the move)
  - spacing (re-review puzzles over time — roadmap)
  - interleaving (mix themes in the puzzle queue)
- **Zone of proximal development**: challenge "just enough". Lessons are generated from the
  player's top weakness motifs — by definition the closest reachable improvement.
- **Quiz hygiene**: answer choices should be about the same length; no formatting clues.
- **Lessons should be beautiful** (Tufte-ish): clean typography, returnable reference material.
- **The agent is the teacher**: lessons remind the learner they can ask follow-up questions in chat.
