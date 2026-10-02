import { describe, expect, it } from "vitest";
import { emptyProgress, nextLesson, setDone, skipTo, type Roadmap } from "./progress";

const roadmap: Roadmap = [["a", "b"], ["c"], ["d"]];

describe("progress", () => {
  it("unlocks the next lesson only when the current one is complete", () => {
    let p = setDone(emptyProgress(), roadmap, ["a"], true);
    expect(p.unlocked).toBe(0);
    p = setDone(p, roadmap, ["b"], true);
    expect(p.unlocked).toBe(1);
  });

  it("never locks a lesson again", () => {
    const p = setDone(setDone(emptyProgress(), roadmap, ["a", "b"], true), roadmap, ["a"], false);
    expect(p.unlocked).toBe(1);
    expect(p.done).toEqual(["b"]);
  });

  it("can skip ahead and unlocks through every finished lesson", () => {
    const p = skipTo(emptyProgress(), roadmap, 2);
    expect(p.unlocked).toBe(2);
    expect(nextLesson(p, roadmap)).toBe(2);
  });

  it("does not unlock past the last lesson", () => {
    expect(skipTo(emptyProgress(), roadmap, 3).unlocked).toBe(2);
  });
});
