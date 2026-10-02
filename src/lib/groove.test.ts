import { describe, expect, it } from "vitest";
import { metronome, normalize, toAbc, validate, type Groove } from "./groove";

const rock = normalize({
  sub: 4,
  bpm: 80,
  hh: "x.x. x.x. x.x. x.x.",
  sn: ".... x... .... x...",
  kk: "x... .... x... ....",
});

describe("normalize", () => {
  it("removes beat spaces and bar lines", () => {
    expect(normalize({ sub: 4, bpm: 60, sn: "x... x... | x... x..." }).sn).toBe("x...x...x...x...");
  });
});

describe("validate", () => {
  it("accepts a correct groove", () => {
    expect(validate(rock)).toEqual([]);
  });

  it("reports rows of different lengths", () => {
    expect(validate({ ...rock, kk: "x......." })).toContain("kk has 8 steps, expected 16");
  });

  it("reports unknown symbols and misplaced open hi-hats", () => {
    const errors = validate({ ...rock, sn: "....x.......o..?" });
    expect(errors).toContain('sn has an unknown symbol "?"');
    expect(errors).toContain('sn: "o" (open) is only for the hi-hat');
  });

  it("reports partial bars and wrong beat groups", () => {
    expect(validate({ sub: 4, bpm: 60, sn: "x...x..." })).toContain(
      "8 steps is not a whole number of 16-step bars",
    );
    expect(validate({ sub: 1, bpm: 60, bar: 7, groups: [2, 2], sn: "x......" })).toContain(
      "groups must add up to 7",
    );
  });
});

describe("toAbc", () => {
  it("writes hands with stems up and feet with stems down", () => {
    const abc = toAbc(rock);
    expect(abc).toContain("M:4/4\nL:1/16\nQ:1/4=80");
    expect(abc).toContain("[V:1] g2g2 [gc]2g2 g2g2 [gc]2g2 |]");
    expect(abc).toContain("[V:2] F4 x4 F4 x4 |]");
  });

  it("marks accents, ghost notes, open hi-hats, flams and sticking", () => {
    const abc = toAbc(
      normalize({ sub: 4, bpm: 60, bar: 4, sn: "Xg.f", hh: "...o", stick: "RL.L" }),
    );
    expect(abc).toContain(`"_R""^>"c"_L""<(" ">)"c2"_L"!open!{/c}[^gc] |]`);
  });

  it("uses 12/8 for triplet grooves and keeps one voice when there are no feet", () => {
    const abc = toAbc(normalize({ sub: 3, bpm: 70, sn: "xxx xxx xxx xxx" }));
    expect(abc).toContain("M:12/8\nL:1/8\nQ:3/8=70");
    expect(abc).not.toContain("%%score");
    expect(abc).toContain("ccc ccc ccc ccc |]");
  });

  it("beams odd meters by their groups", () => {
    const g: Groove = normalize({ sub: 1, bpm: 160, bar: 7, groups: [2, 2, 3], hh: "xx xx xxx" });
    expect(toAbc(g)).toContain("M:7/8");
    expect(toAbc(g)).toContain("gg gg ggg |]");
  });

  it("starts a new line every two bars", () => {
    const g = normalize({ sub: 4, bpm: 60, sn: "x... ".repeat(12) });
    expect(toAbc(g).trim().split("\n").slice(-2)).toEqual([
      "c4 c4 c4 c4 | c4 c4 c4 c4 |",
      "c4 c4 c4 c4 |]",
    ]);
  });
});

describe("metronome", () => {
  it("clicks once per beat, or once per 8th note in uneven meters", () => {
    expect(metronome(rock)).toBe("dddd 76 77 77 77 100 60 60 60");
    expect(metronome({ sub: 1, bpm: 160, bar: 7, groups: [2, 2, 3], hh: "x" })).toMatch(/^d{7} /);
  });
});
