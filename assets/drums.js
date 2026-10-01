// Shared code for every page: drum notation (rendered by abcjs), playback, photos and videos.
//
// A groove is written as one string per instrument, one character per step:
//   "." rest   x hit   X accent   g ghost note   o open hi-hat   f flam
// sub  = steps per beat (4 = 16th notes, 3 = 12/8 feel, 2 = 8th notes, 1 = 8th-note beats for odd meters)
// bar  = steps per bar (default sub * 4)
// groups = beaming groups for sub 1, e.g. [2, 2, 3] for 7/8
// stick = optional sticking letters, one per step

// row: [ABC note, General MIDI drum sound, notehead]
const DRUMS = {
  cr: ["a", 49, "x"], rd: ["f", 51, "x"], hh: ["g", 42, "x"], ho: ["^g", 46, "x"],
  sn: ["c", 38], rs: ["_c", 37, "x"], t1: ["e", 48], t2: ["d", 45], ft: ["A", 43],
  kk: ["F", 36], hf: ["D", 44, "x"],
};
const HANDS = ["cr", "rd", "hh", "sn", "rs", "t1", "t2", "ft"];
const FEET = ["kk", "hf"];
const PERCMAP = Object.values(DRUMS).map(([n, m, h]) => `%%percmap ${n} ${m}${h ? " " + h : ""}`).join("\n");

const rowsOf = g => [...HANDS, ...FEET].filter(k => g[k]);
const lengthOf = g => g[rowsOf(g)[0]].length;
const barOf = g => g.bar || g.sub * 4;
const groupsOf = g => g.groups || Array(barOf(g) / g.sub).fill(g.sub);

function meterOf(g) {
  const bar = barOf(g);
  if (g.sub === 4) return [`${bar / 4}/4`, "1/16", "1/4"];
  if (g.sub === 2) return [`${bar / 2}/4`, "1/8", "1/4"];
  if (g.sub === 3) return [`${bar}/8`, "1/8", "3/8"];
  return [`${bar}/8`, "1/8", "1/8"];
}

function voiceAbc(g, rows, withStick, hideEmpty) {
  const len = lengthOf(g), bar = barOf(g), groups = groupsOf(g), perLine = bar <= 8 ? 4 : 2;
  const dur = n => (n === 1 ? "" : String(n));
  let out = "", lines = [];
  for (let b = 0; b < len; b += bar) {
    let s = b;
    for (const n of groups) {
      const onsets = [];
      for (let i = s; i < s + n; i++) if (rows.some(k => g[k][i] !== ".")) onsets.push(i);
      if (!onsets.length) out += (hideEmpty ? "x" : "z") + dur(n);
      else if (onsets[0] > s) out += "z" + dur(onsets[0] - s);
      onsets.forEach((i, j) => {
        const hits = rows.filter(k => g[k][i] !== ".");
        const chars = hits.map(k => g[k][i]);
        const notes = hits.map(k => (k === "hh" && g[k][i] === "o" ? DRUMS.ho : DRUMS[k])[0]);
        let deco = "";
        if (withStick && g.stick && g.stick[i] !== ".") deco += `"_${g.stick[i]}"`;
        if (chars.includes("X")) deco += '"^>"';
        if (chars.includes("g")) deco += '"<(" ">)"';
        if (chars.includes("o")) deco += "!open!";
        if (chars.includes("f")) deco += `{/${notes[chars.indexOf("f")]}}`;
        const note = notes.length > 1 ? `[${notes.join("")}]` : notes[0];
        out += deco + note + dur((onsets[j + 1] ?? s + n) - i);
      });
      out += " ";
      s += n;
    }
    out += "| ";
    if ((b / bar + 1) % perLine === 0 || b + bar >= len) { lines.push(out.trim()); out = ""; }
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/\|$/, "|]");
  return lines;
}

function toAbc(g, bpm) {
  const [meter, unit, beat] = meterOf(g);
  const hands = HANDS.filter(k => g[k]), feet = FEET.filter(k => g[k]);
  const voices = [hands, feet].filter(v => v.length);
  // Empty beats in the feet voice get invisible rests, so they don't collide with sticking.
  const lines = voices.map(v => voiceAbc(g, v, v === hands, v === feet && voices.length === 2));
  let abc = `X:1\nM:${meter}\nL:${unit}\nQ:${beat}=${bpm}\nK:C clef=perc\n${PERCMAP}\n`;
  if (voices.length === 2) abc += "%%score (1 2)\nV:1 stem=up\nV:2 stem=down\n";
  lines[0].forEach((_, i) => voices.forEach((v, j) => {
    abc += (voices.length === 2 ? `[V:${j + 1}] ` : "") + lines[j][i] + "\n";
  }));
  return abc;
}

// The notation key: every drum with its name under it.
const KEY_ABC = `X:1\nL:1/4\nK:C clef=perc\n%%stretchlast 1\n${PERCMAP}\n` +
  `"_Kick"F "_Snare"c "_Hi-hat"g "_Hi-hat foot"D |\n` +
  `"_Open hi-hat"!open!^g "_Ride"f "_Crash"a "_Cross-stick"_c |\n` +
  `"_Tom 1"e "_Tom 2"d "_Floor tom"A "_Rest"z |\n` +
  `"_Accent"\"^>\"c "_Ghost note""<(" ">)"c "_Flam"{/c}c "_Two 8ths"c/c/ |]`;

// ---------- rendering ----------
const GROOVES = {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function grooveHTML(id, g, title) {
  GROOVES[id] = g;
  const maxBpm = Math.max(200, g.bpm * 2);
  return `<figure class="groove" data-groove="${id}">
    ${title ? `<div class="groove-title">${esc(title)}</div>` : ""}
    ${g.swing ? `<div class="groove-note">Swing feel: play each pair of 8th notes long-short.</div>` : ""}
    <div style="max-width:${scoreWidth(g) + 40}px"><div class="score"></div></div>
    <div class="player">
      <button class="play" type="button">Play</button>
      <label class="tempo">Tempo <input type="range" min="30" max="${maxBpm}" value="${g.bpm}" aria-label="Tempo in BPM"><output>${g.bpm}</output> BPM</label>
      <label class="clickbox"><input type="checkbox" checked> Metronome</label>
    </div>
  </figure>`;
}

function scoreWidth(g) {
  const bars = Math.min(lengthOf(g) / barOf(g), barOf(g) <= 8 ? 4 : 2);
  return Math.min(760, Math.max(300, 70 + bars * barOf(g) * (g.sub === 4 ? 21 : 34)));
}

function renderScore(fig) {
  const g = GROOVES[fig.dataset.groove];
  const bpm = +fig.querySelector("input[type=range]").value;
  const el = fig.querySelector(".score");
  return ABCJS.renderAbc(el, toAbc(g, bpm), {
    add_classes: true, responsive: "resize", staffwidth: scoreWidth(g), paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0,
  })[0];
}

function renderKey(el) {
  ABCJS.renderAbc(el, KEY_ABC, { add_classes: true, responsive: "resize", staffwidth: 760, paddingleft: 0, paddingright: 0 });
}

// Render every visible score inside root (scores inside closed <details> render when opened).
function renderScores(root = document) {
  root.querySelectorAll(".groove").forEach(fig => {
    if (!fig.dataset.rendered && fig.offsetParent) { renderScore(fig); fig.dataset.rendered = 1; }
  });
  root.querySelectorAll(".notation-key").forEach(el => {
    if (!el.dataset.rendered && el.offsetParent) { renderKey(el); el.dataset.rendered = 1; }
  });
}

function photoHTML(key) {
  const p = IMAGES[key];
  if (!p) return "";
  return `<figure class="photo"><img src="${p.src}" alt="${esc(p.caption)}" loading="lazy">
    <figcaption>${esc(p.caption)} <span class="credit">Photo: ${esc(p.author)}, ${esc(p.license)}, <a href="${p.page}" target="_blank" rel="noopener">Wikimedia Commons</a></span></figcaption></figure>`;
}

function videoHTML(key) {
  const v = VIDEOS[key];
  if (!v) return "";
  return `<figure class="video">
    <button class="yt" type="button" data-yt="${v.id}" aria-label="Play video: ${esc(v.title)}">
      <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play">Play video</span>
    </button>
    <figcaption>Video: <cite>${esc(v.title)}</cite> by ${esc(v.channel)}, <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">on YouTube</a></figcaption>
  </figure>`;
}

// ---------- playback ----------
let active = null; // { fig, ctl }

function clickPattern(g) {
  const n = g.groups && new Set(g.groups).size > 1 ? barOf(g) : groupsOf(g).length;
  const sounds = [76, ...Array(n - 1).fill(77)], vols = [100, ...Array(n - 1).fill(60)];
  return "d".repeat(n) + " " + sounds.join(" ") + " " + vols.join(" ");
}

function setButton(fig, label) { fig.querySelector(".play").textContent = label; }

function stop() {
  if (!active) return;
  active.ctl.pause();
  active.ctl.destroy();
  active.fig.querySelectorAll(".hl").forEach(e => e.classList.remove("hl"));
  setButton(active.fig, "Play");
  active = null;
}

async function play(fig) {
  stop();
  if (!ABCJS.synth.supportsAudio()) { setButton(fig, "No audio in this browser"); return; }
  const g = GROOVES[fig.dataset.groove];
  const visual = renderScore(fig);
  const ctl = new ABCJS.synth.SynthController();
  let last = [];
  ctl.cursorControl = {
    onEvent(ev) {
      last.forEach(e => e.classList.remove("hl"));
      last = ev.elements.flat();
      last.forEach(e => e.classList.add("hl"));
    },
  };
  const me = active = { fig, ctl };
  setButton(fig, "Loading");
  const click = fig.querySelector(".clickbox input").checked;
  await ctl.setTune(visual, true, click ? { drum: clickPattern(g), drumBars: 1 } : {});
  if (active !== me) return ctl.destroy();
  ctl.toggleLoop();
  await ctl.play();
  setButton(fig, "Stop");
}

function videoClick(btn) {
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
  f.title = btn.getAttribute("aria-label").replace("Play video: ", "");
  f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  f.allowFullscreen = true;
  btn.replaceWith(f);
}

document.addEventListener("click", e => {
  const pb = e.target.closest(".groove .play");
  if (pb) { const fig = pb.closest(".groove"); active?.fig === fig ? stop() : play(fig); return; }
  const yt = e.target.closest(".yt");
  if (yt) videoClick(yt);
});

document.addEventListener("input", e => {
  if (e.target.matches(".tempo input")) e.target.nextElementSibling.textContent = e.target.value;
});

// Tempo or metronome changes take effect immediately: re-render and restart if this groove is playing.
document.addEventListener("change", e => {
  const fig = e.target.closest(".groove");
  if (!fig) return;
  if (active?.fig === fig) play(fig); else renderScore(fig);
});

document.addEventListener("toggle", e => { if (e.target.open) renderScores(e.target); }, true);
