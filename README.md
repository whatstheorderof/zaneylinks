# Zaney Links

Zaney Links is a browser-based Connections-style word grouping game. It ships as a static site, so it is easy to host on Vercel through Git.

## What is included

- A playable 4x4 grouping game with shuffle, mistakes, solved rows, custom puzzle links, and keyboard-friendly controls.
- A hint system, “almost there” feedback, completion explanations, and shareable friend challenges.
- A generator page for building and sharing custom puzzles with difficulty and explanations.
- Starter themed packs for movies, gaming, animals, and music.
- A curated category bank that produces more than 10,000 finishable puzzles by construction.
- A build-time puzzle validator that blocks duplicate words, malformed groups, malformed packs, and too-small puzzle pools.
- AdSense-ready ad slots that only load after `window.ZANEY_ADSENSE_CLIENT` is configured.
- A full privacy policy page and `ads.txt` placeholder for AdSense readiness.
- An in-depth improvement roadmap in `IMPROVEMENTS.md`.

## Local Preview

```sh
npm run build
npm run dev
```

Then open `http://localhost:3000`.

## Deploying To Vercel

1. Push this folder to a Git repository.
2. Import the repository in Vercel.
3. Keep the build command as `npm run build` and the output directory as `dist`.
4. After Google AdSense approval, set the publisher client id in `public/config.js`.
5. Replace the publisher line in `public/ads.txt` and update the contact line in `public/privacy.html`.

## Puzzle Guarantee

The app does not store 10,000 handwritten boards. Instead, it stores a curated bank of complete four-word categories. Each game board is a combination of four valid categories. The validator confirms that:

- every category has exactly four unique words,
- no generated sample board contains duplicate words,
- the possible valid puzzle count is at least 10,000,
- every themed pack has exactly four valid groups with explanations and difficulty labels,
- the daily puzzle and deterministic puzzle id system can always map to a finishable board.

Run the validator any time the category bank changes:

```sh
npm run validate:puzzles
```
