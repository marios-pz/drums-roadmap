/**
 * Grooves are written as one string per instrument, one character per step:
 *
 *   .  rest      x  hit       X  accent
 *   g  ghost     o  open hi-hat (hi-hat row only)
 *   f  flam
 *
 * Spaces and "|" are ignored, so rows can be split into beats and bars for readability:
 *
 *   hh: x.x. x.x. x.x. x.x.
 *   sn: .... x... .... x...
 *   kk: x... .... x... ....
 *
 * `sub` is the number of steps per beat: 4 for 16th notes, 3 for 12/8, 2 for 8th notes,
 * and 1 for odd meters counted in 8th notes (use `groups` to set the beaming, e.g. [2, 2, 3]).
 */

export const INSTRUMENTS = {
  cr: { name: "Crash", abc: "a", midi: 49, head: "x" },
  rd: { name: "Ride", abc: "f", midi: 51, head: "x" },
  hh: { name: "Hi-hat", abc: "g", midi: 42, head: "x" },
  sn: { name: "Snare", abc: "c", midi: 38 },
  rs: { name: "Cross-stick", abc: "_c", midi: 37, head: "x" },
  t1: { name: "Tom 1", abc: "e", midi: 48 },
  t2: { name: "Tom 2", abc: "d", midi: 45 },
  ft: { name: "Floor tom", abc: "A", midi: 43 },
  kk: { name: "Kick", abc: "F", midi: 36 },
  hf: { name: "Hi-hat foot", abc: "D", midi: 44, head: "x" },
} as const;

const OPEN_HIHAT = { abc: "^g", midi: 46, head: "x" };

export type Instrument = keyof typeof INSTRUMENTS;

const HANDS: Instrument[] = ["cr", "rd", "hh", "sn", "rs", "t1", "t2", "ft"];
const FEET: Instrument[] = ["kk", "hf"];

export interface Groove extends Partial<Record<Instrument, string>> {
  sub: 1 | 2 | 3 | 4;
  bpm: number;
  bar?: number;
  groups?: number[];
  swing?: boolean;
  stick?: string;
}

const clean = (row: string) => row.replace(/[\s|]/g, "");

/** Strip the readability spacing from every row. */
export function normalize(g: Groove): Groove {
  const out: Groove = { ...g };
  for (const key of [...HANDS, ...FEET, "stick"] as const) {
    const row = g[key];
    if (row !== undefined) out[key] = clean(row);
  }
  return out;
}

export const rowsOf = (g: Groove) => [...HANDS, ...FEET].filter((k) => g[k]);
export const stepsPerBar = (g: Groove) => g.bar ?? g.sub * 4;
export const beatGroups = (g: Groove) => g.groups ?? Array(stepsPerBar(g) / g.sub).fill(g.sub);
const lengthOf = (g: Groove) => g[rowsOf(g)[0]]!.length;

/** Returns a list of problems with a normalized groove; empty when it is valid. */
export function validate(g: Groove): string[] {
  const errors: string[] = [];
  const rows = rowsOf(g);
  if (!rows.length) return ["a groove needs at least one instrument row"];

  const bar = stepsPerBar(g);
  const len = lengthOf(g);
  for (const k of rows) {
    const row = g[k]!;
    if (row.length !== len) errors.push(`${k} has ${row.length} steps, expected ${len}`);
    const bad = row.match(/[^.xXgfo]/);
    if (bad) errors.push(`${k} has an unknown symbol "${bad[0]}"`);
    if (k !== "hh" && row.includes("o")) errors.push(`${k}: "o" (open) is only for the hi-hat`);
  }
  if (g.stick && g.stick.length !== len)
    errors.push(`stick has ${g.stick.length} steps, expected ${len}`);
  if (len % bar !== 0) errors.push(`${len} steps is not a whole number of ${bar}-step bars`);
  if (g.groups && g.groups.reduce((a, b) => a + b, 0) !== bar)
    errors.push(`groups must add up to ${bar}`);
  if (!g.groups && bar % g.sub !== 0)
    errors.push(`a bar of ${bar} steps doesn't split into beats of ${g.sub}`);
  return errors;
}

function meter(g: Groove): { meter: string; unit: string; beat: string } {
  const bar = stepsPerBar(g);
  switch (g.sub) {
    case 4:
      return { meter: `${bar / 4}/4`, unit: "1/16", beat: "1/4" };
    case 2:
      return { meter: `${bar / 2}/4`, unit: "1/8", beat: "1/4" };
    case 3:
      return { meter: `${bar}/8`, unit: "1/8", beat: "3/8" };
    case 1:
      return { meter: `${bar}/8`, unit: "1/8", beat: "1/8" };
  }
}

const duration = (steps: number) => (steps === 1 ? "" : String(steps));

/**
 * One ABC voice. Each beat is written as notes whose length runs to the next hit in the same
 * beat, so drum parts read the standard way (no ties across beats). Lines hold two bars,
 * or four short ones.
 */
function voice(
  g: Groove,
  rows: Instrument[],
  opts: { stick: boolean; hideEmptyBeats: boolean },
): string[] {
  const bar = stepsPerBar(g);
  const len = lengthOf(g);
  const barsPerLine = bar <= 8 ? 4 : 2;
  const lines: string[] = [];
  let line = "";

  for (let start = 0; start < len; start += bar) {
    let step = start;
    for (const size of beatGroups(g)) {
      const hits: number[] = [];
      for (let i = step; i < step + size; i++) if (rows.some((k) => g[k]![i] !== ".")) hits.push(i);

      if (!hits.length) line += (opts.hideEmptyBeats ? "x" : "z") + duration(size);
      else if (hits[0] > step) line += "z" + duration(hits[0] - step);

      hits.forEach((i, n) => {
        const playing = rows.filter((k) => g[k]![i] !== ".");
        const symbols = playing.map((k) => g[k]![i]);
        const notes = playing.map(
          (k) => (k === "hh" && g[k]![i] === "o" ? OPEN_HIHAT : INSTRUMENTS[k]).abc,
        );

        let prefix = "";
        if (opts.stick && g.stick && g.stick[i] !== ".") prefix += `"_${g.stick[i]}"`;
        if (symbols.includes("X")) prefix += `"^>"`;
        if (symbols.includes("g")) prefix += `"<(" ">)"`;
        if (symbols.includes("o")) prefix += "!open!";
        if (symbols.includes("f")) prefix += `{/${notes[symbols.indexOf("f")]}}`;

        const chord = notes.length > 1 ? `[${notes.join("")}]` : notes[0];
        line += prefix + chord + duration((hits[n + 1] ?? step + size) - i);
      });
      line += " ";
      step += size;
    }
    line += "| ";
    const barNumber = start / bar + 1;
    if (barNumber % barsPerLine === 0 || start + bar >= len) {
      lines.push(line.trim());
      line = "";
    }
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/\|$/, "|]");
  return lines;
}

export const PERCMAP = [...Object.values(INSTRUMENTS), OPEN_HIHAT]
  .map((d) => `%%percmap ${d.abc} ${d.midi}${"head" in d ? " " + d.head : ""}`)
  .join("\n");

/** Convert a normalized groove to ABC notation, with hands (stems up) and feet (stems down). */
export function toAbc(g: Groove, bpm = g.bpm): string {
  const { meter: m, unit, beat } = meter(g);
  const hands = HANDS.filter((k) => g[k]);
  const feet = FEET.filter((k) => g[k]);
  const twoVoices = hands.length > 0 && feet.length > 0;

  const voices = [
    hands.length && voice(g, hands, { stick: true, hideEmptyBeats: false }),
    // Empty feet beats get invisible rests so they don't collide with the sticking letters.
    feet.length && voice(g, feet, { stick: !hands.length, hideEmptyBeats: twoVoices }),
  ].filter((v): v is string[] => Array.isArray(v));

  let abc = `X:1\nM:${m}\nL:${unit}\nQ:${beat}=${bpm}\nK:C clef=perc\n${PERCMAP}\n`;
  if (twoVoices) abc += "%%score (1 2)\nV:1 stem=up\nV:2 stem=down\n";
  voices[0].forEach((_, i) => {
    voices.forEach((lines, v) => {
      abc += (twoVoices ? `[V:${v + 1}] ` : "") + lines[i] + "\n";
    });
  });
  return abc;
}

/** abcjs drum pattern for the metronome: one click per beat, accented on 1. */
export function metronome(g: Groove): string {
  const uneven = g.groups && new Set(g.groups).size > 1;
  const clicks = uneven ? stepsPerBar(g) : beatGroups(g).length;
  const sounds = [76, ...Array(clicks - 1).fill(77)];
  const volumes = [100, ...Array(clicks - 1).fill(60)];
  return `${"d".repeat(clicks)} ${sounds.join(" ")} ${volumes.join(" ")}`;
}

/** Width in pixels the score is drawn at, before it scales to the page. */
export function scoreWidth(g: Groove): number {
  const bar = stepsPerBar(g);
  const bars = Math.min(lengthOf(g) / bar, bar <= 8 ? 4 : 2);
  return Math.min(760, Math.max(300, 70 + bars * bar * (g.sub === 4 ? 21 : 34)));
}

/** The notation key: every drum with its name underneath. */
export const NOTATION_KEY = `X:1
L:1/4
K:C clef=perc
%%stretchlast 1
${PERCMAP}
"_Kick"F "_Snare"c "_Hi-hat"g "_Hi-hat foot"D |
"_Open hi-hat"!open!^g "_Ride"f "_Crash"a "_Cross-stick"_c |
"_Tom 1"e "_Tom 2"d "_Floor tom"A "_Rest"z |
"_Accent""^>"c "_Ghost note""<(" ">)"c "_Flam"{/c}c "_Two 8ths"c/c/ |]`;
