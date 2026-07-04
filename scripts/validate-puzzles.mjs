import fs from "node:fs";
import vm from "node:vm";

const DATA_PATH = new URL("../public/data.js", import.meta.url);
const PACKS_PATH = new URL("../public/packs.js", import.meta.url);
const MINIMUM_PUZZLES = 10000;
const MODE_COUNTS = [4, 6, 8];

function loadData() {
  const source = fs.readFileSync(DATA_PATH, "utf8");
  const packs = fs.readFileSync(PACKS_PATH, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "data.js" });
  vm.runInContext(packs, sandbox, { filename: "packs.js" });
  return {
    groups: sandbox.window.ZANEY_GROUPS,
    packs: sandbox.window.ZANEY_PACKS
  };
}

function normalize(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function combinationsCount(n, r) {
  if (r > n) return 0;
  let result = 1;
  for (let index = 1; index <= r; index += 1) {
    result = (result * (n - r + index)) / index;
  }
  return Math.floor(result);
}

function pickGroups(groups, groupCount, seed) {
  const picked = [];
  const shuffled = groups
    .map((group, index) => ({ group, sort: (index * 2654435761 + seed * 97) >>> 0 }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.group);

  for (const group of shuffled) {
    picked.push(group);
    if (picked.length === groupCount) return picked;
  }
  return picked;
}

function validateGroups(groups) {
  const errors = [];
  const globalWords = new Map();
  if (!Array.isArray(groups)) {
    return ["window.ZANEY_GROUPS must be an array."];
  }

  groups.forEach((group, groupIndex) => {
    if (!group || typeof group.title !== "string" || !group.title.trim()) {
      errors.push(`Group ${groupIndex + 1} is missing a title.`);
    }
    if (!Array.isArray(group.words) || group.words.length !== 4) {
      errors.push(`${group?.title || `Group ${groupIndex + 1}`} must have exactly four words.`);
      return;
    }

    const localWords = new Set();
    group.words.forEach((word) => {
      const normalized = normalize(word);
      if (!normalized) {
        errors.push(`${group.title} contains a blank word.`);
      }
      if (localWords.has(normalized)) {
        errors.push(`${group.title} repeats "${word}".`);
      }
      localWords.add(normalized);

      const owner = globalWords.get(normalized);
      if (owner) {
        errors.push(`"${word}" appears in both "${owner}" and "${group.title}".`);
      }
      globalWords.set(normalized, group.title);
    });
  });

  const puzzleCount = combinationsCount(groups.length, 4);
  if (puzzleCount < MINIMUM_PUZZLES) {
    errors.push(`Puzzle pool is ${puzzleCount.toLocaleString()}, below ${MINIMUM_PUZZLES.toLocaleString()}.`);
  }

  MODE_COUNTS.forEach((groupCount) => {
    const modeCount = combinationsCount(groups.length, groupCount);
    if (modeCount < MINIMUM_PUZZLES) {
      errors.push(`${groupCount}-link mode is ${modeCount.toLocaleString()}, below ${MINIMUM_PUZZLES.toLocaleString()}.`);
    }
    for (let seed = 1; seed <= 250; seed += 1) {
      const picked = pickGroups(groups, groupCount, seed);
      const words = picked.flatMap((group) => group.words.map(normalize));
      if (picked.length !== groupCount || new Set(words).size !== groupCount * 4) {
        errors.push(`${groupCount}-link sample seed ${seed} did not produce ${groupCount} complete unique groups.`);
        break;
      }
    }
  });

  return errors;
}

function validatePackPuzzles(packs) {
  const errors = [];
  if (!Array.isArray(packs)) {
    return ["window.ZANEY_PACKS must be an array."];
  }

  packs.forEach((pack) => {
    if (!pack.id || !pack.title || !pack.theme || !pack.date) {
      errors.push(`Pack ${pack?.id || "unknown"} is missing id, title, theme, or date.`);
    }
    if (!Array.isArray(pack.groups) || pack.groups.length !== 4) {
      errors.push(`Pack ${pack?.id || "unknown"} must have exactly four groups.`);
      return;
    }

    const words = new Map();
    pack.groups.forEach((group, index) => {
      if (!group.category) errors.push(`Pack ${pack.id} group ${index + 1} is missing a category.`);
      if (!["easy", "medium", "hard", "tricky"].includes(group.difficulty)) {
        errors.push(`Pack ${pack.id} group ${group.category || index + 1} has invalid difficulty.`);
      }
      if (!group.explanation) errors.push(`Pack ${pack.id} group ${group.category || index + 1} is missing an explanation.`);
      if (!Array.isArray(group.words) || group.words.length !== 4) {
        errors.push(`Pack ${pack.id} group ${group.category || index + 1} must have exactly four words.`);
        return;
      }

      const localWords = new Set();
      group.words.forEach((word) => {
        const normalized = normalize(word);
        if (!normalized) errors.push(`Pack ${pack.id} group ${group.category} contains a blank word.`);
        if (localWords.has(normalized)) errors.push(`Pack ${pack.id} group ${group.category} repeats "${word}".`);
        localWords.add(normalized);
        if (words.has(normalized)) {
          errors.push(`Pack ${pack.id} repeats "${word}" in "${words.get(normalized)}" and "${group.category}".`);
        }
        words.set(normalized, group.category);
      });
    });
  });

  return errors;
}

const { groups, packs } = loadData();
const errors = [...validateGroups(groups), ...validatePackPuzzles(packs)];

if (errors.length) {
  console.error("Puzzle validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Puzzle validation passed: ${groups.length} groups support 4/6/8-link modes (${combinationsCount(groups.length, 4).toLocaleString()} classic boards), plus ${packs.length} themed packs.`
);
