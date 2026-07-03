# Zaney Links Improvement Roadmap

## Implemented In This Pass

1. Rich puzzle metadata
   - Added support for category names, difficulty values, words, and explanations matching the intended `LinksPuzzle` shape.
   - Existing generated categories still work, with explanations filled automatically when the bank does not provide one yet.

2. Difficulty colors
   - Solved rows now use semantic difficulty classes: `easy`, `medium`, `hard`, and `tricky`.
   - Completion explanations show the same difficulty labels so the player understands puzzle texture after finishing.

3. Explanations after completion
   - Solving the puzzle reveals a completion panel with each category, its difficulty, and a short explanation.
   - Running out of mistakes reveals the same answer key, which reduces frustration and teaches the pattern.

4. Anti-frustration hint system
   - Added a `Hint` action.
   - Hints escalate: first a difficulty and first-letter clue, then the category name, then one word in a remaining category.
   - Existing “one away” feedback is now more explicit: “Almost there: three of those belong together.”

5. Themed packs
   - Added starter packs for movies, gaming, animals, and music.
   - Packs use the richer `LinksPuzzle`-style group shape with funny category names and explanations.
   - Added pack selection and a `Play Pack` button in the sidebar.

6. Community puzzle creator upgrade
   - The generator now collects category name, difficulty, four words, and explanation for each group.
   - Share links preserve the richer custom puzzle data.

7. Friends challenge mode
   - Added `Copy Challenge` to copy a deterministic link for the current puzzle, themed pack, or custom puzzle.

8. AI category workflow, static-safe version
   - Added an `AI Prompt` button that drafts a strict puzzle-generation prompt from the current creator inputs.
   - This keeps the current app static and Vercel-simple while leaving a clear path to connect an AI API later.

9. Stronger build validation
   - The validator now checks the 10,000+ generated puzzle pool and themed pack structure.
   - It blocks malformed themed packs, missing explanations, invalid difficulties, duplicate words, and incomplete groups.

## High-Value Next Improvements

1. Upgrade the main category bank to full authored metadata
   - Add funny category names and custom explanations to all 127 generated-library groups.
   - Current fallback explanations are functional but not as delightful as hand-authored ones.

2. Add puzzle quality ratings
   - Track ambiguity risks such as words with multiple meanings, overlapping category themes, or too many proper nouns.
   - Keep an internal `quality: "safe" | "spicy" | "experimental"` flag so only safe puzzles enter the daily rotation.

3. Daily archive and streaks
   - Save solved daily puzzles locally.
   - Add streak count, completion time, and mistake count.
   - Keep this local-only until accounts exist.

4. User-submitted pack moderation
   - Add export/import of pack JSON.
   - Add a review queue if the app later gets a backend.
   - Validate submissions with the same pack validator before publishing.

5. Real AI generation
   - Add a backend route or serverless function to generate candidate puzzles.
   - Run every AI output through the same validator.
   - Add a human approval step before any AI-generated puzzle enters the public pool.

6. Challenge results
   - Add share text after completion: puzzle id, mistake count, and colored difficulty result blocks.
   - Avoid spoiling category names in the copied result.

7. Accessibility polish
   - Add keyboard grid navigation with arrow keys.
   - Add reduced-motion handling if animations are added.
   - Add clearer screen-reader announcements for solved groups and hints.

8. Monetization readiness
   - Replace the placeholder `ads.txt` with the real AdSense publisher line after approval.
   - Add an ad density policy so ads never interrupt the puzzle board.
   - Consider a sponsorship slot for themed packs as a cleaner alternative to heavy display ads.

9. SEO and retention
   - Add static pages for each pack.
   - Add Open Graph images for challenge links.
   - Add a lightweight “how to play” modal reachable from the header.

10. Analytics without creepiness
   - Track only aggregate events: puzzle started, puzzle completed, hints used, pack played.
   - Avoid collecting custom puzzle contents unless explicitly submitted.

## Target Data Shape

```ts
type LinksPuzzle = {
  id: string;
  date: string;
  groups: {
    category: string;
    difficulty: "easy" | "medium" | "hard" | "tricky";
    words: string[];
    explanation: string;
  }[];
};
```

The app now supports this shape for themed packs and custom shared puzzles. The large generated library still uses the older compact bank format internally, then normalizes into this shape at runtime.
