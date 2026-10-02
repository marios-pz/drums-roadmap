/**
 * Client side of the roadmap: shows saved progress in the contents list and, on lesson pages,
 * handles ticking exercises, unlocking lessons and skipping ahead.
 */
import {
  completedIn,
  isComplete,
  load,
  nextLesson,
  save,
  setDone,
  skipTo,
  type Progress,
  type Roadmap,
} from "../lib/progress";

const roadmap: Roadmap = JSON.parse(document.getElementById("roadmap-data")!.textContent!);
const lessonPage = document.querySelector<HTMLElement>("[data-lesson]");
const lesson = lessonPage ? Number(lessonPage.dataset.lesson) : null;
let progress = load();

function update(next: Progress) {
  if (next.unlocked > progress.unlocked) toast(`Lesson ${next.unlocked + 1} unlocked`);
  progress = next;
  save(progress);
  render();
}

function render() {
  document.querySelectorAll<HTMLAnchorElement>("[data-lesson-link]").forEach((link) => {
    const i = Number(link.dataset.lessonLink);
    const ids = roadmap[i];
    const locked = i > progress.unlocked;
    const complete = isComplete(progress, ids);
    link.classList.toggle("locked", locked);
    link.classList.toggle("complete", complete);
    link.querySelector("[data-status]")!.textContent = complete
      ? "done"
      : locked
        ? "locked"
        : `${completedIn(progress, ids)}/${ids.length}`;
  });

  const total = roadmap.flat().length;
  document
    .querySelectorAll("[data-total]")
    .forEach((el) => (el.textContent = `${progress.done.length} of ${total} exercises complete`));

  const next = nextLesson(progress, roadmap);
  document.querySelectorAll<HTMLAnchorElement>("[data-continue]").forEach((link) => {
    link.href = document.querySelector<HTMLAnchorElement>(`[data-lesson-link="${next}"]`)!.href;
    link.textContent = progress.done.length ? `Continue with lesson ${next + 1}` : "Start lesson 1";
  });

  if (lesson === null) return;
  const ids = roadmap[lesson];
  const locked = lesson > progress.unlocked;
  const done = completedIn(progress, ids);

  document.querySelectorAll<HTMLInputElement>("[data-done]").forEach((box) => {
    box.checked = progress.done.includes(box.dataset.done!);
    box.disabled = locked;
    box.closest("li")!.classList.toggle("done", box.checked);
  });
  query("[data-progress-text]").textContent = `${done} of ${ids.length} complete`;
  query("[data-meter]").style.width = `${(done / ids.length) * 100}%`;
  query("[data-know]").hidden = locked || done === ids.length;
  query("[data-locked]").hidden = !locked;
  query("[data-unlocks-after]").textContent = String(progress.unlocked + 1);
}

const query = (selector: string) => document.querySelector<HTMLElement>(selector)!;

document.addEventListener("change", (event) => {
  const box = event.target as HTMLInputElement;
  if (box.dataset.done) update(setDone(progress, roadmap, [box.dataset.done], box.checked));
});

document.addEventListener("click", (event) => {
  const target = (event.target as Element).closest("[data-know], [data-skip], [data-reset]");
  if (!target || (lesson === null && !target.matches("[data-reset]"))) return;
  if (target.matches("[data-know]")) update(setDone(progress, roadmap, roadmap[lesson!], true));
  if (target.matches("[data-skip]")) update(skipTo(progress, roadmap, lesson!));
  if (target.matches("[data-reset]") && confirm("Reset all progress?"))
    update({ done: [], unlocked: 0 });
});

let toastTimer: number | undefined;
function toast(message: string) {
  const el = query("[data-toast]");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2600);
}

render();
