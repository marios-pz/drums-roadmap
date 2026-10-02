# Drums Roadmap

A free, step-by-step roadmap for drummers, inspired by roadmap.sh. Twelve lessons from first beat
to odd time, plus a genre library and a guide to drumsticks. Every groove is shown in standard drum
notation and plays in the browser.

Live site: https://marios-pz.github.io/drums-roadmap/

## Running it

```sh
npm install
npm run dev      # http://localhost:4321/drums-roadmap/
npm test         # unit tests for notation and progress logic
npm run build    # type check and build to dist/
```

Pushing to `master` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

A pre-commit hook (husky and lint-staged, installed by `npm install`) runs Prettier on staged
code, Markdown, YAML and JSON, so commits are always formatted. Dependabot opens weekly pull
requests for npm packages and GitHub Actions.

## Where things live

```
src/
  content/
    lessons/       one YAML file per lesson; the number prefix sets the order
    genres/        one Markdown file per genre (front matter + description)
  data/
    images.json    photos from Wikimedia Commons
    videos.json    YouTube lessons
  content.config.ts  schemas: the build fails on a broken groove or a missing image/video
  lib/
    groove.ts      groove format, validation and conversion to ABC notation
    progress.ts    unlock rules and saved progress
    lessons.ts     loads lessons in order
  scripts/
    player.ts      draws notation and plays it (abcjs)
    roadmap.ts     ticking exercises, unlocking lessons
  components/      Groove, Exercise, Contents, Photo, Video, ...
  pages/           home, lessons/[slug], genres, sticks
```

## Adding an exercise

Add an entry to a lesson's `tasks` list:

```yaml
- id: rock # unique across all lessons; it's the key for saved progress
  title: The basic rock beat
  text: Hi-hat on every 8th note, snare on 2 and 4, kick on 1 and 3.
  goal: Two minutes at 80 BPM without stopping.
  groove:
    sub: 4 # steps per beat
    bpm: 70
    hh: x.x. x.x. x.x. x.x.
    sn: .... x... .... x...
    kk: x... .... x... ....
  image: kit-photo # optional, a key in src/data/images.json
  video: rock # optional, a key in src/data/videos.json
```

Don't change the `id` of an existing exercise, or people lose that exercise's progress.

## Writing grooves

One row per instrument, one character per step. Spaces and `|` are ignored, so split rows into
beats and bars however reads best.

| Symbol | Meaning                       |
| ------ | ----------------------------- |
| `.`    | rest                          |
| `x`    | hit                           |
| `X`    | accent                        |
| `g`    | ghost note                    |
| `o`    | open hi-hat (hi-hat row only) |
| `f`    | flam                          |

Rows: `cr` crash, `rd` ride, `hh` hi-hat, `sn` snare, `rs` cross-stick, `t1` `t2` toms, `ft` floor
tom, `kk` kick, `hf` hi-hat foot. `stick` adds sticking letters under the notes.

| `sub` | Steps per beat | Written as                                                 |
| ----- | -------------- | ---------------------------------------------------------- |
| 4     | 16th notes     | 4/4 (or `bar: 20` for 5/4, `bar: 12` for 3/4)              |
| 3     | triplets       | 12/8                                                       |
| 2     | 8th notes      | 4/4; add `swing: true` for swung 8ths                      |
| 1     | 8th-note beats | odd meters, e.g. `bar: 7` with `groups: [2, 2, 3]` for 7/8 |

## Adding photos and videos

Photos must come from Wikimedia Commons with a public domain, CC0, CC BY or CC BY-SA license. Copy
the author, license and file page into `images.json`; the credit is shown under the photo.

Before adding a video, check it exists and allows embedding:

```sh
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"
```

A JSON response is fine; 401 or 404 means it can't be embedded. Videos are lessons, not
promotions: no sponsored content, brand channels, or paid-course platforms.

## Drum sounds

Playback uses the General MIDI percussion samples from the Fluid R3 GM SoundFont by Frank Wen (CC
BY 3.0), the default sounds of abcjs. They are stored in `public/soundfont/` and served from this
site; see the license note in that folder.
