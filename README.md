<div align="center">

```
 ▚  CYBERCORE — MEMORY WORLD  ▚
    a forgotten digital world you can enter
```

**▶ [ENTER THE WORLD](https://cybercore-ten.vercel.app/) ◀**

*→ إذا فتحت هذا من جوال: الأفضل على شاشة أكبر، لكنه يعمل في كل مكان.*

</div>

---

## What is this?

Not a website *about* old technology — a place built from the life that
surrounded it. You arrive as a signal, descend through a machine, sit down
at a family computer that still works, wander night streets and Sunday
afternoons, tune static in a signal lab, and surface whenever you're ready.

Nothing here explains itself. It just leaves things where you can find them.

## The descent

| # | Chapter | What happens there |
|---|---------|--------------------|
| 01 | **Signal** | A pinned cinematic opening. Something stayed on. |
| 02 | **Object** | A small artifact that opens into an environment. |
| 03 | **Machine** | A working CRT — turn the channel knob, try standby. |
| 04 | **Silence** | Nothing happens here. That's the point. |
| 05 | **Rooms** | Three full-bleed lived-in spaces, day and night. |
| 06 | **Desk** | You sit down. The keys remember your hands. |
| ✳ | **After midnight** | A visual story in nine beats. |
| ☀ | **Sunday, 4pm** | Fourteen beats of ordinary daylight. |
| ◐ | **Past curfew** | Streets, arcade, bus, lake, city lights. |
| ◍ | **Ordinary days** | Homework, practice, cinema, the mall. |
| 07 | **Desktop** | A complete retro computer (see below). |
| 08 | **Music** | The mixtape survived. Press play. |
| 09 | **Signal Lab** | Oscilloscope, channels, drift, generated tones. |
| 10 | **Vault** | Six memory trays. Pull one. |
| — | **Interlude** | Full volume. Some rooms never log off. |
| 11 | **Finds** | A drift field of recoveries. Click to inspect. |
| 12 | **Surface** | You can log off. The room stays on. |

Plus secrets: a Konami-code basement, a hidden folder, a guestbook that
remembers you signing it.

## Inside the computer

A fully interactive retro desktop — original work, inspired by the era,
affiliated with nothing:

- draggable / minimizable / maximizable / resizable windows, taskbar, start menu
- folders with real contents: photos, music, downloads, school, videos, notebook
- a 2003-style browser: search portal → results → midnight forum → Sara's page
- a chat that types itself, a digicam with a dated roll, a brick phone
  (contacts, messages, **working calculator**, clock), Paint (**set as wallpaper**),
  Control Panel (wallpapers, about), media player, POST card, live clock
- **three real playable games**: Snake, Minesweeper, Memory Match
- system blips synthesized live — never forced, never before you touch anything

## The music

Two found songs, played only through **official YouTube embeds**
(nothing downloaded, nothing re-hosted):

1. **Beach House — “Space Song”** (Sub Pop, 2015)
2. **Mitski — “My Love Mine All Mine”** (Dead Oceans, 2023)

They live in the transmission deck, in the desktop media player, and on the
mixtape chapter. If your browser blocks autoplay, the deck opens itself with
a clear ▶ PLAY — one tap and you're in.

## How it's built

- **Zero dependencies.** One HTML file, one stylesheet, one script. No build step.
- Pinned scroll scenes driven by a single CSS variable, transform/opacity motion only.
- Lazy imagery, deferred off-screen rendering, boot that yields to your first scroll.
- Keyboard-operable throughout (lightbox trap, dialogs, every game), focus states,
  `prefers-reduced-motion` respected everywhere, semantic landmarks, alt text.
- Imagery hotlinked from the Unsplash CDN (credited below); the world degrades
  gracefully offline into gradients rather than broken boxes.

## Run it locally

```bash
# any static server works, or use the included one:
node serve.js        # → http://localhost:8471
```

## Project map

```
index.html   — the whole world (chapters, desktop shell, deck, dialogs)
styles.css   — the material system (chrome, alloy, CRT glass, plastic)
app.js       — the engine (scenes, desktop OS, games, instruments, embeds)
serve.js     — tiny local dev server (not needed in production)
```

## Credits

- Photography via **Unsplash artists** (hotlinked, © their respective owners)
- Type: Space Grotesk, IBM Plex Mono, VT323 (Google Fonts)
- Songs © their labels/artists, played via official YouTube embeds:
  [Space Song](https://www.youtube.com/watch?v=RBtlPT23PTM) ·
  [My Love Mine All Mine](https://www.youtube.com/watch?v=vx4kLgnFexo)

---

<div align="center">

*No analytics. No cookies. Only dust.*

`1998 — 2026 · CA-2001 · SIGNAL HELD`

</div>
