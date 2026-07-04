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

10. Harder link-count modes
   - Added Classic 4-link, Hard 6-link, and Mega 8-link mixed-library modes.
   - Challenge links preserve the selected link count.
   - Larger boards compact their tiles automatically so 24-word and 32-word puzzles remain playable.

11. Launch-loop implementation
   - Added spoiler-safe result sharing after completion.
   - Added local streak, played count, and best-score tracking.
   - Added 4/6/8-link support to the custom puzzle generator.
   - Added a how-to-play modal.
   - Added SEO basics: social metadata, `robots.txt`, and `sitemap.xml`.

## High-Value Next Improvements

1. Upgrade the main category bank to full authored metadata
   - Add funny category names and custom explanations to all 127 generated-library groups.
   - Current fallback explanations are functional but not as delightful as hand-authored ones.

2. Add puzzle quality ratings
   - Track ambiguity risks such as words with multiple meanings, overlapping category themes, or too many proper nouns.
   - Keep an internal `quality: "safe" | "spicy" | "experimental"` flag so only safe puzzles enter the daily rotation.

3. Daily archive and deeper progress
   - Save solved daily puzzles locally.
   - Expand the current local streak and best-score tracking with completion time history and per-mode records.
   - Keep this local-only until accounts exist.

4. User-submitted pack moderation
   - Add export/import of pack JSON.
   - Add a review queue if the app later gets a backend.
   - Validate submissions with the same pack validator before publishing.

5. Real AI generation
   - Add a backend route or serverless function to generate candidate puzzles.
   - Run every AI output through the same validator.
   - Add a human approval step before any AI-generated puzzle enters the public pool.

6. Share-card polish
   - Add generated Open Graph images for completed daily puzzles and friend challenges.
   - Keep category names out of copied result text so shares stay spoiler-safe.

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
   - Add a lightweight archive so players can revisit earlier daily puzzles.

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

## Remaining Gap Audit - July 4, 2026

### Launch Blockers

1. Main bank metadata quality
   - Current state: the generated-library groups mostly use plain category names and fallback explanations.
   - Add: authored funny names, explanations, difficulty, and optional theme tags for all 127 groups.
   - Why it matters: the differentiator is personality, not just a mathematically valid board.

2. AdSense launch details
   - Current state: ad slot, privacy policy, and `ads.txt` placeholder exist.
   - Add: real publisher id, real `ads.txt`, production domain, and final contact inbox.
   - Why it matters: Google review will look for a complete site, real policy, and stable content.

### Important Next Additions

1. Puzzle archive
   - Add a simple daily archive page or drawer.
   - Show previous daily puzzles by date and mode.
   - Keep answers hidden until opened.

2. Better themed packs
   - Expand each pack beyond one puzzle.
   - Add pack metadata: `title`, `description`, `difficulty`, `puzzleCount`, and `slug`.
   - Add more packs: TV, books, sports, food, internet culture, British slang.

3. Safer puzzle validation
   - Add ambiguity checks for word overlap across semantic themes.
   - Add banned word list and length warnings.
   - Add a report mode that prints suspicious categories instead of only pass/fail.

4. Accessibility pass
   - Add arrow-key tile navigation.
   - Add focus management after solved groups.
   - Add screen-reader announcements for hint use, solved rows, and completion.

5. Lightweight analytics
   - Track only aggregate, non-sensitive events: game started, mode selected, puzzle solved, hint used, pack played.
   - Do not track custom puzzle contents unless the user explicitly submits them.

### Later Bets

1. Community submissions
   - Add import/export JSON first.
   - Later add a backend moderation queue.
   - Never publish user submissions without validation and review.

2. Real AI-assisted generation
   - Add a serverless endpoint only after the static product is stable.
   - Validate every AI output.
   - Treat AI results as drafts, not automatic public puzzles.

3. Multiplayer race
   - Add only after daily/streak/share loops are working.
   - Likely needs a backend or realtime service.

4. Sponsored packs
   - Better fit than heavy ads if the game gets traction.
   - Could sponsor themed packs without interrupting the puzzle board.

## Recommended Next Build Order

1. Upgrade all category-bank entries with funny names, explanations, difficulty, and themes.
2. Add final AdSense production values once the publisher id and production domain are known.
3. Add puzzle archive and daily history.
4. Add accessibility keyboard navigation and focus management.
5. Expand themed packs into multi-puzzle collections.
6. Add safer ambiguity validation and report mode.
7. Add lightweight aggregate analytics.
