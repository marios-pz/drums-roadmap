/**
 * Roadmap progress, kept in localStorage. A lesson unlocks when every exercise in the lesson
 * before it is done. Unlocks are permanent: unticking an old exercise doesn't lock anything again.
 */

export interface Progress {
  done: string[];
  /** Index of the furthest unlocked lesson. */
  unlocked: number;
}

/** Exercise ids per lesson, in roadmap order. */
export type Roadmap = string[][];

export const emptyProgress = (): Progress => ({ done: [], unlocked: 0 });

export const completedIn = (p: Progress, ids: string[]) =>
  ids.filter((id) => p.done.includes(id)).length;

export const isComplete = (p: Progress, ids: string[]) => completedIn(p, ids) === ids.length;

/** Move the unlock point forward past every completed lesson. */
export function advance(p: Progress, roadmap: Roadmap): Progress {
  let unlocked = p.unlocked;
  while (unlocked < roadmap.length - 1 && isComplete(p, roadmap[unlocked])) unlocked++;
  return { ...p, unlocked };
}

export function setDone(p: Progress, roadmap: Roadmap, ids: string[], done: boolean): Progress {
  const set = new Set(p.done);
  for (const id of ids) done ? set.add(id) : set.delete(id);
  return advance({ ...p, done: [...set] }, roadmap);
}

/** Mark every exercise before `lesson` as done, for players who are past that point already. */
export const skipTo = (p: Progress, roadmap: Roadmap, lesson: number) =>
  setDone(p, roadmap, roadmap.slice(0, lesson).flat(), true);

/** The first lesson that still has work in it. */
export const nextLesson = (p: Progress, roadmap: Roadmap) => {
  const i = roadmap.findIndex((ids) => !isComplete(p, ids));
  return i === -1 ? roadmap.length - 1 : i;
};

const KEY = "drums-roadmap";

export function load(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && Array.isArray(saved.done) && Number.isInteger(saved.unlocked)) return saved;
  } catch {
    // Storage can be blocked (private mode); fall through to a fresh start.
  }
  return emptyProgress();
}

export function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Progress just won't persist.
  }
}
