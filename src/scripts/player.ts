/**
 * Draws every groove on the page as drum notation and plays it on demand.
 * Scores are drawn once their element is laid out, since abcjs needs to measure text.
 */
import abcjs, { type CursorControl, type SynthObjectController, type TuneObject } from "abcjs";
import { metronome, NOTATION_KEY, scoreWidth, toAbc, type Groove } from "../lib/groove";

// abcjs's type definitions leave these two out, but SynthController supports them.
type Controller = SynthObjectController & { cursorControl: CursorControl | null; destroy(): void };

// Drum samples are served from this site (public/soundfont). abcjs only boosts the volume for its
// own default sound URL, so the same boost is applied here.
const sound = {
  soundFontUrl: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/soundfont/`,
  soundFontVolumeMultiplier: 3,
};

const drawOptions = {
  add_classes: true,
  responsive: "resize" as const,
  paddingleft: 0,
  paddingright: 0,
  paddingtop: 0,
};

class GroovePlayer extends HTMLElement {
  static active: GroovePlayer | null = null;

  groove!: Groove;
  controller: Controller | null = null;
  highlighted: Element[] = [];

  connectedCallback() {
    this.groove = JSON.parse(this.dataset.groove!);
    this.button.addEventListener("click", () => (this.controller ? this.stop() : this.play()));
    this.tempo.addEventListener("input", () => (this.bpmOutput.value = this.tempo.value));
    // Tempo and metronome changes apply immediately, restarting playback if needed.
    for (const input of [this.tempo, this.metronomeBox]) {
      input.addEventListener("change", () => (this.controller ? this.play() : this.draw()));
    }
    whenLaidOut(this, () => this.draw());
  }

  get button() {
    return this.querySelector<HTMLButtonElement>("[data-play]")!;
  }
  get tempo() {
    return this.querySelector<HTMLInputElement>("[data-tempo]")!;
  }
  get bpmOutput() {
    return this.querySelector<HTMLOutputElement>("output")!;
  }
  get metronomeBox() {
    return this.querySelector<HTMLInputElement>("[data-click]")!;
  }
  get score() {
    return this.querySelector<HTMLElement>("[data-score]")!;
  }

  draw(): TuneObject {
    const abc = toAbc(this.groove, Number(this.tempo.value));
    return abcjs.renderAbc(this.score, abc, {
      ...drawOptions,
      staffwidth: scoreWidth(this.groove),
    })[0];
  }

  async play() {
    GroovePlayer.active?.stop();
    if (!abcjs.synth.supportsAudio()) {
      this.button.textContent = "No audio in this browser";
      return;
    }
    GroovePlayer.active = this;
    const controller = new abcjs.synth.SynthController() as Controller;
    controller.cursorControl = { onEvent: (event) => this.highlight(event.elements?.flat() ?? []) };
    this.controller = controller;
    this.button.textContent = "Loading";

    const click = this.metronomeBox.checked ? { drum: metronome(this.groove), drumBars: 1 } : {};
    await controller.setTune(this.draw(), true, { ...sound, ...click });
    if (this.controller !== controller) return controller.destroy(); // stopped while loading
    controller.toggleLoop();
    controller.play();
    this.button.textContent = "Stop";
  }

  stop() {
    this.controller?.pause();
    this.controller?.destroy();
    this.controller = null;
    this.highlight([]);
    this.button.textContent = "Play";
    if (GroovePlayer.active === this) GroovePlayer.active = null;
  }

  highlight(elements: Element[]) {
    this.highlighted.forEach((e) => e.classList.remove("playing"));
    elements.forEach((e) => e.classList.add("playing"));
    this.highlighted = elements;
  }
}

class NotationKey extends HTMLElement {
  connectedCallback() {
    whenLaidOut(this, () =>
      abcjs.renderAbc(this, NOTATION_KEY, { ...drawOptions, staffwidth: 760 }),
    );
  }
}

/**
 * Run as soon as the element is laid out. Inside a closed <details> it isn't, so wait for the
 * <details> to open. Drawing early (not on scroll) keeps the page from jumping as scores appear.
 */
function whenLaidOut(el: HTMLElement, run: () => void) {
  if (el.getClientRects().length) return run();
  const details = el.closest("details");
  details?.addEventListener("toggle", () => details.open && el.getClientRects().length && run(), {
    once: true,
  });
}

customElements.define("groove-player", GroovePlayer);
customElements.define("notation-key", NotationKey);
