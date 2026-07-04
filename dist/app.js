(function () {
  const GROUPS = window.ZANEY_GROUPS || [];
  const PACKS = window.ZANEY_PACKS || [];
  const COLORS = ["green", "blue", "coral", "amber"];
  const DIFFICULTY_ORDER = ["easy", "medium", "hard", "tricky"];
  const MODES = {
    4: { links: 4, mistakes: 4, label: "Classic" },
    6: { links: 6, mistakes: 5, label: "Hard" },
    8: { links: 8, mistakes: 6, label: "Mega" }
  };
  const STORAGE_KEY = "zaney-links-progress-v1";
  const DAILY_EPOCH = Date.UTC(2026, 0, 1);
  const state = {
    puzzle: null,
    selected: new Set(),
    solvedIds: [],
    groupCount: 4,
    mistakes: 4,
    hintsUsed: 0,
    startedAt: Date.now(),
    completedWon: null,
    completedSolvedCount: 0,
    completedSolvedColors: [],
    locked: false,
    view: "play"
  };

  const els = {
    playView: document.querySelector("#play-view"),
    generatorView: document.querySelector("#generator-view"),
    navButtons: document.querySelectorAll("[data-view-button]"),
    helpButton: document.querySelector("#help-button"),
    helpModal: document.querySelector("#help-modal"),
    helpClose: document.querySelector("#help-close"),
    puzzleId: document.querySelector("#puzzle-id-label"),
    headline: document.querySelector("#game-headline"),
    poolCount: document.querySelector("#pool-count"),
    groupStat: document.querySelector("#group-count-stat"),
    mistakeStat: document.querySelector("#mistake-count-stat"),
    wordStat: document.querySelector("#word-count-stat"),
    streakStat: document.querySelector("#streak-stat"),
    playedStat: document.querySelector("#played-stat"),
    bestStat: document.querySelector("#best-stat"),
    mistakeDots: document.querySelector("#mistake-dots"),
    solvedGroups: document.querySelector("#solved-groups"),
    grid: document.querySelector("#tile-grid"),
    message: document.querySelector("#game-message"),
    completionPanel: document.querySelector("#completion-panel"),
    shuffle: document.querySelector("#shuffle-button"),
    deselect: document.querySelector("#deselect-button"),
    hint: document.querySelector("#hint-button"),
    submit: document.querySelector("#submit-button"),
    newGame: document.querySelector("#new-game-button"),
    daily: document.querySelector("#daily-button"),
    challenge: document.querySelector("#challenge-button"),
    modeSelect: document.querySelector("#mode-select"),
    packSelect: document.querySelector("#pack-select"),
    packButton: document.querySelector("#pack-button"),
    generatorMode: document.querySelector("#generator-mode-select"),
    generatorFields: document.querySelector("#generator-fields"),
    generatorForm: document.querySelector("#generator-form"),
    generatorMessage: document.querySelector("#generator-message"),
    sample: document.querySelector("#sample-button"),
    aiPrompt: document.querySelector("#ai-prompt-button"),
    shareOutput: document.querySelector("#share-output"),
    creatorOutput: document.querySelector("#creator-output"),
    copy: document.querySelector("#copy-button")
  };

  function normalize(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function todayKey(offset = 0) {
    const now = new Date();
    const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
    return new Date(utc).toISOString().slice(0, 10);
  }

  function loadProgress() {
    try {
      const progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return {
        streak: progress.streak || 0,
        lastDaily: progress.lastDaily || "",
        played: progress.played || {},
        best: progress.best || {}
      };
    } catch (error) {
      return { streak: 0, played: {}, best: {} };
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      // Local storage can be disabled; gameplay should continue without it.
    }
  }

  function progressKey(puzzle = state.puzzle) {
    return `${puzzle?.theme || "mixed"}:${puzzle?.label || "puzzle"}:${puzzle?.groupCount || state.groupCount}`;
  }

  function updateProgressStats() {
    const progress = loadProgress();
    const best = progress.best?.[String(state.groupCount)];
    els.streakStat.textContent = progress.streak || 0;
    els.playedStat.textContent = Object.keys(progress.played || {}).length;
    els.bestStat.textContent = best ? `${best.mistakes}/${best.hints}` : "--";
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function next() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, seed) {
    const copy = items.slice();
    const random = mulberry32(seed);
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function combinationsCount(n, r) {
    if (r > n) return 0;
    let result = 1;
    for (let i = 1; i <= r; i += 1) {
      result = (result * (n - r + i)) / i;
    }
    return Math.floor(result);
  }

  function modeFor(value) {
    return MODES[Number(value)] || MODES[4];
  }

  function numberWord(value) {
    return {
      4: "four",
      6: "six",
      8: "eight"
    }[value] || String(value);
  }

  function compatible(group, picked) {
    const used = new Set();
    picked.forEach((candidate) => {
      candidate.words.forEach((word) => used.add(normalize(word)));
    });
    return group.words.every((word) => !used.has(normalize(word)));
  }

  function levelToDifficulty(level) {
    return DIFFICULTY_ORDER[Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, Number(level || 1) - 1))];
  }

  function groupCategory(group) {
    return group.category || group.title || "Mystery link";
  }

  function groupDifficulty(group) {
    return group.difficulty || levelToDifficulty(group.level);
  }

  function groupExplanation(group) {
    return group.explanation || `${group.words.join(", ")} all connect through "${groupCategory(group)}."`;
  }

  function normalizeGroup(group, index, label) {
    const difficulty = groupDifficulty(group);
    return {
      category: groupCategory(group),
      title: groupCategory(group),
      difficulty,
      level: DIFFICULTY_ORDER.indexOf(difficulty) + 1,
      words: group.words,
      explanation: groupExplanation(group),
      id: `${label}-${index}-${hashString(groupCategory(group))}`,
      color: difficulty
    };
  }

  function pickGroups(seed, groupCount = 4) {
    const randomOrder = shuffle(GROUPS, seed || 1);
    const picked = [];
    for (const group of randomOrder) {
      if (compatible(group, picked)) picked.push(group);
      if (picked.length === groupCount) break;
    }
    if (picked.length !== groupCount) {
      throw new Error("Unable to build a complete puzzle from the category bank.");
    }
    return picked;
  }

  function makePuzzle(seed, label, groupCount = state.groupCount) {
    const mode = modeFor(groupCount);
    const groups = pickGroups(seed, mode.links).map((group, index) => normalizeGroup(group, index, label));
    const tiles = groups.flatMap((group) =>
      group.words.map((word) => ({
        word,
        groupId: group.id
      }))
    );
    return {
      seed,
      label,
      groupCount: mode.links,
      mistakeLimit: mode.mistakes,
      title: label === "DAILY" ? "Daily Puzzle" : "Mixed Library",
      theme: "mixed",
      shareHash: `#puzzle=${seed}&links=${mode.links}`,
      groups,
      tiles: shuffle(tiles, seed ^ 0x9e3779b9)
    };
  }

  function packPuzzle(pack) {
    const seed = hashString(pack.id);
    const groups = pack.groups.map((group, index) => normalizeGroup(group, index, pack.id));
    return {
      seed,
      label: pack.title,
      groupCount: groups.length,
      mistakeLimit: 4,
      title: pack.title,
      theme: pack.theme,
      shareHash: `#pack=${encodeURIComponent(pack.id)}`,
      groups,
      tiles: shuffle(
        groups.flatMap((group) => group.words.map((word) => ({ word, groupId: group.id }))),
        seed
      )
    };
  }

  function dailySeed() {
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor((todayUtc - DAILY_EPOCH) / 86400000) + 1000;
  }

  function puzzleFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get("view") === "generator") {
      showView("generator");
      return null;
    }
    const custom = params.get("custom");
    if (custom) {
      try {
        return customPuzzleFromPayload(custom);
      } catch (error) {
        setMessage("That custom link could not be opened. Starting a random game instead.");
      }
    }
    const id = Number(params.get("puzzle"));
    const links = Number(params.get("links")) || 4;
    if (Number.isFinite(id) && id > 0) {
      return makePuzzle(id, String(id).padStart(5, "0"), links);
    }
    const packId = params.get("pack");
    if (packId) {
      const pack = PACKS.find((item) => item.id === packId);
      if (pack) return packPuzzle(pack);
    }
    return null;
  }

  function setMessage(message) {
    els.message.textContent = message;
  }

  function resultSquares() {
    const colorMap = {
      easy: "🟩",
      medium: "🟦",
      hard: "🟥",
      tricky: "🟨"
    };
    const colors =
      state.completedWon === null
        ? state.solvedIds.map((id) => state.puzzle.groups.find((group) => group.id === id)?.color).filter(Boolean)
        : state.completedSolvedColors;
    const solved = colors.map((color) => colorMap[color] || "⬜");
    const missed = Math.max(0, state.puzzle.groups.length - solved.length);
    return `${solved.join("")}${"⬜".repeat(missed)}`;
  }

  function resultText() {
    const limit = state.puzzle.mistakeLimit || modeFor(state.groupCount).mistakes;
    const mistakesUsed = limit - state.mistakes;
    const mode = MODES[state.groupCount]?.label || `${state.groupCount}-Link`;
    const title = state.puzzle.title || state.puzzle.label;
    const hash = state.puzzle.shareHash || `#puzzle=${state.puzzle.seed}&links=${state.groupCount}`;
    const link = `${window.location.origin}${window.location.pathname}${hash}`;
    return [
      `Zaney Links ${title} (${mode})`,
      `${state.completedSolvedCount}/${state.puzzle.groups.length} links · ${mistakesUsed}/${limit} mistakes · ${state.hintsUsed} hints`,
      resultSquares(),
      link
    ].join("\n");
  }

  function recordCompletion(won) {
    state.completedWon = won;
    state.completedSolvedCount = state.solvedIds.length;
    state.completedSolvedColors = state.solvedIds
      .map((id) => state.puzzle.groups.find((group) => group.id === id)?.color)
      .filter(Boolean);
    const progress = loadProgress();
    const key = progressKey();
    const limit = state.puzzle.mistakeLimit || modeFor(state.groupCount).mistakes;
    const mistakesUsed = limit - state.mistakes;
    const elapsed = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
    const existing = progress.played[key];
    if (!existing || won) {
      progress.played[key] = {
        date: todayKey(),
        won,
        mode: state.groupCount,
        mistakes: mistakesUsed,
        hints: state.hintsUsed,
        elapsed
      };
    }

    const bestKey = String(state.groupCount);
    const best = progress.best[bestKey];
    if (won && (!best || mistakesUsed < best.mistakes || (mistakesUsed === best.mistakes && state.hintsUsed < best.hints))) {
      progress.best[bestKey] = { mistakes: mistakesUsed, hints: state.hintsUsed, elapsed };
    }

    if (won && state.puzzle.label === "DAILY" && !existing?.won) {
      if (progress.lastDaily === todayKey(-1)) {
        progress.streak = (progress.streak || 0) + 1;
      } else if (progress.lastDaily !== todayKey()) {
        progress.streak = 1;
      }
      progress.lastDaily = todayKey();
    }

    saveProgress(progress);
    updateProgressStats();
  }

  function shareText(text, successMessage) {
    if (navigator.share) {
      navigator
        .share({ text })
        .then(() => setMessage(successMessage))
        .catch(() => navigator.clipboard?.writeText(text).then(() => setMessage(successMessage)).catch(() => setMessage(text)));
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => setMessage(successMessage))
      .catch(() => setMessage(text));
  }

  function startPuzzle(puzzle) {
    state.puzzle = puzzle;
    state.selected.clear();
    state.solvedIds = [];
    state.groupCount = puzzle.groupCount || puzzle.groups.length;
    state.mistakes = puzzle.mistakeLimit || modeFor(state.groupCount).mistakes;
    state.hintsUsed = 0;
    state.startedAt = Date.now();
    state.completedWon = null;
    state.completedSolvedCount = 0;
    state.completedSolvedColors = [];
    state.locked = false;
    els.puzzleId.textContent = puzzle.label;
    els.headline.textContent = `Find the ${numberWord(state.groupCount)} hidden links.`;
    els.groupStat.textContent = state.groupCount;
    els.mistakeStat.textContent = state.mistakes;
    els.wordStat.textContent = state.groupCount * 4;
    els.grid.dataset.links = String(state.groupCount);
    if (MODES[state.groupCount]) els.modeSelect.value = String(state.groupCount);
    els.completionPanel.hidden = true;
    els.completionPanel.innerHTML = "";
    setMessage("Select four tiles that belong together.");
    updateProgressStats();
    render();
  }

  function render() {
    renderMistakes();
    renderSolved();
    renderTiles();
    els.submit.disabled = state.selected.size !== 4 || state.locked;
  }

  function renderMistakes() {
    els.mistakeDots.innerHTML = "";
    const limit = state.puzzle?.mistakeLimit || state.mistakes;
    for (let i = 0; i < limit; i += 1) {
      const dot = document.createElement("span");
      dot.className = i < state.mistakes ? "dot is-live" : "dot";
      els.mistakeDots.append(dot);
    }
  }

  function renderSolved() {
    els.solvedGroups.innerHTML = "";
    state.solvedIds.forEach((id) => {
      const group = state.puzzle.groups.find((item) => item.id === id);
      const row = document.createElement("article");
      row.className = `solved-row ${group.color}`;
      row.innerHTML = `
        <div class="solved-row-heading">
          <strong>${escapeHtml(group.category)}</strong>
          <em>${escapeHtml(group.difficulty)}</em>
        </div>
        <span>${group.words.map(escapeHtml).join(" · ")}</span>
      `;
      els.solvedGroups.append(row);
    });
  }

  function renderTiles() {
    const solved = new Set(state.solvedIds);
    els.grid.innerHTML = "";
    state.puzzle.tiles
      .filter((tile) => !solved.has(tile.groupId))
      .forEach((tile) => {
        const button = document.createElement("button");
        button.className = "tile";
        button.type = "button";
        button.textContent = tile.word;
        button.dataset.word = tile.word;
        button.setAttribute("aria-pressed", state.selected.has(tile.word) ? "true" : "false");
        if (state.selected.has(tile.word)) button.classList.add("is-selected");
        button.addEventListener("click", () => toggleTile(tile.word));
        els.grid.append(button);
      });
  }

  function toggleTile(word) {
    if (state.locked) return;
    if (state.selected.has(word)) {
      state.selected.delete(word);
    } else if (state.selected.size < 4) {
      state.selected.add(word);
    }
    render();
  }

  function submitSelection() {
    if (state.selected.size !== 4 || state.locked) return;
    const selected = Array.from(state.selected).sort();
    const match = state.puzzle.groups.find((group) => {
      if (state.solvedIds.includes(group.id)) return false;
      return group.words.slice().sort().join("|") === selected.join("|");
    });

    if (match) {
      state.solvedIds.push(match.id);
      state.selected.clear();
      setMessage(state.solvedIds.length === state.puzzle.groups.length ? "Perfect. You solved Zaney Links." : "Nice link.");
      render();
      if (state.solvedIds.length === state.puzzle.groups.length) {
        state.locked = true;
        recordCompletion(true);
        renderCompletion(false);
      }
      return;
    }

    state.mistakes -= 1;
    const oneAway = state.puzzle.groups.some((group) => {
      if (state.solvedIds.includes(group.id)) return false;
      return group.words.filter((word) => state.selected.has(word)).length === 3;
    });
    state.selected.clear();
    setMessage(
      state.mistakes <= 0
        ? "Out of mistakes. The links are revealed below."
        : oneAway
          ? "Almost there: three of those belong together."
          : "Not quite."
    );
    if (state.mistakes <= 0) {
      state.locked = true;
      recordCompletion(false);
      state.solvedIds = state.puzzle.groups.map((group) => group.id);
      renderCompletion(true);
    }
    render();
  }

  function useHint() {
    if (state.locked) return;
    const unsolved = state.puzzle.groups.filter((group) => !state.solvedIds.includes(group.id));
    if (!unsolved.length) return;
    const best = unsolved
      .map((group) => ({
        group,
        selectedMatches: group.words.filter((word) => state.selected.has(word)).length
      }))
      .sort((a, b) => b.selectedMatches - a.selectedMatches || a.group.level - b.group.level)[0].group;

    let message = "";
    if (state.hintsUsed === 0) {
      message = `Hint: one remaining link is ${best.difficulty}. Its category starts with "${best.category[0]}".`;
    } else if (state.hintsUsed === 1) {
      message = `Hint: look for "${best.category}".`;
    } else {
      const revealedWord = best.words.find((word) => !state.selected.has(word)) || best.words[0];
      message = `Hint: "${revealedWord}" belongs in "${best.category}".`;
    }
    state.hintsUsed += 1;
    setMessage(message);
  }

  function renderCompletion(revealedByLoss) {
    els.completionPanel.hidden = false;
    els.completionPanel.innerHTML = `
      <h2>${revealedByLoss ? "Answer Key" : "Explanation"}</h2>
      <button class="wide-button result-share-button" type="button" id="result-share-button">Share Result</button>
      <div class="explanation-list">
        ${state.puzzle.groups
          .map(
            (group) => `
              <article class="explanation-item ${group.color}">
                <div>
                  <strong>${escapeHtml(group.category)}</strong>
                  <span>${escapeHtml(group.difficulty)}</span>
                </div>
                <p>${escapeHtml(group.explanation)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `;
    document.querySelector("#result-share-button")?.addEventListener("click", () => {
      shareText(resultText(), "Result copied. Send it to a friend.");
    });
  }

  function reshuffleTiles() {
    if (state.locked) return;
    state.puzzle.tiles = shuffle(state.puzzle.tiles, hashString(`${Date.now()}-${state.puzzle.seed}`));
    renderTiles();
  }

  function deselect() {
    state.selected.clear();
    render();
  }

  function showView(view) {
    state.view = view;
    els.playView.classList.toggle("is-visible", view === "play");
    els.generatorView.classList.toggle("is-visible", view === "generator");
    els.navButtons.forEach((button) => {
      const isActive = button.dataset.viewButton === view;
      button.classList.toggle("is-active", isActive);
    });
    if (view === "generator") {
      window.history.replaceState(null, "", "#view=generator");
    } else if (state.puzzle) {
      window.history.replaceState(null, "", state.puzzle.shareHash || `#puzzle=${state.puzzle.seed}`);
    }
  }

  function openHelp() {
    els.helpModal.hidden = false;
    els.helpClose.focus();
  }

  function closeHelp() {
    els.helpModal.hidden = true;
    els.helpButton.focus();
  }

  function generatorGroupCount() {
    return modeFor(els.generatorMode?.value || 4).links;
  }

  function buildGeneratorFields() {
    const count = generatorGroupCount();
    els.generatorFields.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "category-field";
      fieldset.innerHTML = `
        <label>
          Category ${index + 1}
          <input name="title-${index}" type="text" autocomplete="off" placeholder="Category name" />
        </label>
        <label>
          Difficulty
          <select name="difficulty-${index}">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="tricky">Tricky</option>
          </select>
        </label>
        <div class="word-inputs">
          ${[0, 1, 2, 3]
            .map(
              (wordIndex) =>
                `<input name="word-${index}-${wordIndex}" type="text" autocomplete="off" placeholder="Word ${wordIndex + 1}" />`
            )
            .join("")}
        </div>
        <label>
          Explanation
          <textarea name="explanation-${index}" placeholder="Why these four belong together"></textarea>
        </label>
      `;
      els.generatorFields.append(fieldset);
    }
  }

  function readGeneratorForm(form) {
    const data = new FormData(form);
    return Array.from({ length: generatorGroupCount() }, (_, index) => ({
      category: String(data.get(`title-${index}`) || "").trim(),
      difficulty: String(data.get(`difficulty-${index}`) || DIFFICULTY_ORDER[index]),
      words: [0, 1, 2, 3].map((wordIndex) => String(data.get(`word-${index}-${wordIndex}`) || "").trim()),
      explanation: String(data.get(`explanation-${index}`) || "").trim()
    }));
  }

  function validateCustomGroups(groups) {
    const allWords = new Set();
    if (![4, 6, 8].includes(groups.length)) return "Custom puzzles need 4, 6, or 8 links.";
    for (const group of groups) {
      if (!String(group.category || group.title || "").trim()) return "Every category needs a name.";
      if (!DIFFICULTY_ORDER.includes(groupDifficulty(group))) return "Every category needs a valid difficulty.";
      if (group.words.some((word) => !word)) return "Every category needs four words.";
      const local = new Set(group.words.map(normalize));
      if (local.size !== 4) return `"${groupCategory(group)}" has a repeated word.`;
      for (const word of local) {
        if (allWords.has(word)) return "A word can only appear once in the puzzle.";
        allWords.add(word);
      }
    }
    return "";
  }

  function encodeCustomGroups(groups) {
    const compact = groups.map((group) => ({
      t: groupCategory(group),
      d: groupDifficulty(group),
      w: group.words,
      e: groupExplanation(group)
    }));
    return btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function decodePayload(payload) {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  }

  function customPuzzleFromPayload(payload) {
    const decoded = decodePayload(payload);
    const groups = decoded.map((group, index) => ({
      category: group.t,
      difficulty: group.d || DIFFICULTY_ORDER[index],
      words: group.w,
      explanation: group.e || `${group.w.join(", ")} share the category "${group.t}".`
    })).map((group, index) => normalizeGroup(group, index, "custom"));
    const error = validateCustomGroups(groups);
    if (error) throw new Error(error);
    const seed = hashString(payload);
    return {
      seed,
      label: "CUSTOM",
      groupCount: groups.length,
      mistakeLimit: Math.max(4, Math.ceil(groups.length * 0.75)),
      title: "Custom Puzzle",
      theme: "community",
      shareHash: `#custom=${payload}`,
      groups,
      tiles: shuffle(
        groups.flatMap((group) => group.words.map((word) => ({ word, groupId: group.id }))),
        seed
      )
    };
  }

  function handleGenerator(event) {
    event.preventDefault();
    const groups = readGeneratorForm(event.currentTarget);
    const error = validateCustomGroups(groups);
    if (error) {
      els.generatorMessage.textContent = error;
      return;
    }
    const payload = encodeCustomGroups(groups);
    const link = `${window.location.origin}${window.location.pathname}#custom=${payload}`;
    els.shareOutput.value = link;
    els.generatorMessage.textContent = "Share link created.";
    startPuzzle(customPuzzleFromPayload(payload));
    showView("play");
    window.history.replaceState(null, "", `#custom=${payload}`);
  }

  function fillSample() {
    const samples = [
      {
        category: "Picnic things",
        difficulty: "easy",
        words: ["Blanket", "Basket", "Thermos", "Napkin"],
        explanation: "All four are items you might bring to a picnic."
      },
      {
        category: "Moon features",
        difficulty: "medium",
        words: ["Crater", "Mare", "Regolith", "Rille"],
        explanation: "These are physical features or materials found on the Moon."
      },
      {
        category: "Things with keys",
        difficulty: "hard",
        words: ["Piano", "Locker", "Map", "Cipher"],
        explanation: "Each can involve a key, but in different senses."
      },
      {
        category: "Green vegetables",
        difficulty: "tricky",
        words: ["Kale", "Pea", "Okra", "Chard"],
        explanation: "All four are green vegetables, with short names that can blend into other clue sets."
      },
      {
        category: "Keyboard corners",
        difficulty: "medium",
        words: ["Escape", "Shift", "Control", "Enter"],
        explanation: "These are keyboard keys often found near the outer edges of a keyboard."
      },
      {
        category: "Pirate kit",
        difficulty: "easy",
        words: ["Anchor", "Cutlass", "Treasure", "Parrot"],
        explanation: "All four are classic pirate-associated words."
      },
      {
        category: "Words before board",
        difficulty: "hard",
        words: ["Score", "Chess", "Notice", "Surf"],
        explanation: "Each can come before the word board."
      },
      {
        category: "Tiny bits",
        difficulty: "tricky",
        words: ["Speck", "Crumb", "Pebble", "Droplet"],
        explanation: "Each word describes something small, but from a different setting."
      }
    ];
    samples.slice(0, generatorGroupCount()).forEach((group, index) => {
      els.generatorForm.elements[`title-${index}`].value = group.category;
      els.generatorForm.elements[`difficulty-${index}`].value = group.difficulty;
      els.generatorForm.elements[`explanation-${index}`].value = group.explanation;
      group.words.forEach((word, wordIndex) => {
        els.generatorForm.elements[`word-${index}-${wordIndex}`].value = word;
      });
    });
    els.generatorMessage.textContent = "Sample filled.";
  }

  function buildAiPrompt() {
    const groups = readGeneratorForm(els.generatorForm);
    const filledWords = groups.flatMap((group) => group.words).filter(Boolean);
    const seedText = filledWords.length ? `Use or improve these draft words: ${filledWords.join(", ")}.` : "";
    els.creatorOutput.value = [
      "Create one Zaney Links puzzle in JSON.",
      "Use this exact shape:",
      '{ "id": "draft", "date": "YYYY-MM-DD", "groups": [{ "category": "funny category name", "difficulty": "easy|medium|hard|tricky", "words": ["one", "two", "three", "four"], "explanation": "short fair explanation" }] }',
      `Rules: exactly ${generatorGroupCount()} groups, exactly 4 unique words per group, no duplicate words across the puzzle, funny but clear category names, balanced difficulty labels.`,
      seedText
    ]
      .filter(Boolean)
      .join("\n\n");
    els.generatorMessage.textContent = "AI prompt drafted.";
  }

  function populatePacks() {
    PACKS.forEach((pack) => {
      const option = document.createElement("option");
      option.value = pack.id;
      option.textContent = pack.title;
      els.packSelect.append(option);
    });
  }

  function playSelectedPack() {
    const packId = els.packSelect.value;
    if (packId === "all") {
      const seed = Math.floor(Math.random() * 100000000) + 1;
      startPuzzle(makePuzzle(seed, String(seed).slice(0, 5).padStart(5, "0"), state.groupCount));
      window.history.replaceState(null, "", state.puzzle.shareHash);
      return;
    }
    const pack = PACKS.find((item) => item.id === packId);
    if (!pack) return;
    startPuzzle(packPuzzle(pack));
    window.history.replaceState(null, "", state.puzzle.shareHash);
    showView("play");
  }

  function copyChallenge() {
    const hash = state.puzzle?.shareHash || `#puzzle=${state.puzzle.seed}`;
    const link = `${window.location.origin}${window.location.pathname}${hash}`;
    shareText(link, "Challenge link copied. Send it to a friend.");
  }

  function copyShareLink() {
    if (!els.shareOutput.value) return;
    navigator.clipboard
      .writeText(els.shareOutput.value)
      .then(() => {
        els.generatorMessage.textContent = "Copied.";
      })
      .catch(() => {
        els.generatorMessage.textContent = "Select the link and copy it manually.";
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initAds() {
    const client = window.ZANEY_ADSENSE_CLIENT;
    const ad = document.querySelector(".adsbygoogle");
    if (!client || !ad) return;
    ad.dataset.adClient = client;
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.append(script);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }

  function init() {
    const pool = combinationsCount(GROUPS.length, 4);
    els.poolCount.textContent = `${pool.toLocaleString()}+ classic boards, with harder 6-link and 8-link modes.`;
    buildGeneratorFields();
    populatePacks();
    const linkedPuzzle = puzzleFromHash();
    startPuzzle(linkedPuzzle || makePuzzle(dailySeed(), "DAILY", state.groupCount));
    els.navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewButton)));
    els.shuffle.addEventListener("click", reshuffleTiles);
    els.deselect.addEventListener("click", deselect);
    els.hint.addEventListener("click", useHint);
    els.submit.addEventListener("click", submitSelection);
    els.helpButton.addEventListener("click", openHelp);
    els.helpClose.addEventListener("click", closeHelp);
    els.helpModal.addEventListener("click", (event) => {
      if (event.target === els.helpModal) closeHelp();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.helpModal.hidden) closeHelp();
    });
    els.modeSelect.addEventListener("change", () => {
      state.groupCount = modeFor(els.modeSelect.value).links;
      const seed = Math.floor(Math.random() * 100000000) + 1;
      startPuzzle(makePuzzle(seed, String(seed).slice(0, 5).padStart(5, "0"), state.groupCount));
      window.history.replaceState(null, "", state.puzzle.shareHash);
      showView("play");
    });
    els.newGame.addEventListener("click", () => {
      const seed = Math.floor(Math.random() * 100000000) + 1;
      startPuzzle(makePuzzle(seed, String(seed).slice(0, 5).padStart(5, "0"), state.groupCount));
      window.history.replaceState(null, "", state.puzzle.shareHash);
      showView("play");
    });
    els.daily.addEventListener("click", () => {
      const seed = dailySeed();
      startPuzzle(makePuzzle(seed, "DAILY", state.groupCount));
      window.history.replaceState(null, "", state.puzzle.shareHash);
      showView("play");
    });
    els.challenge.addEventListener("click", copyChallenge);
    els.packButton.addEventListener("click", playSelectedPack);
    els.generatorForm.addEventListener("submit", handleGenerator);
    els.generatorMode.addEventListener("change", buildGeneratorFields);
    els.sample.addEventListener("click", fillSample);
    els.aiPrompt.addEventListener("click", buildAiPrompt);
    els.copy.addEventListener("click", copyShareLink);
    initAds();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
