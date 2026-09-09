/* ============================================================
   CYBERCORE v4 — world engine
   boot → scenes(--p) → chapters → reveal → parallax → cursor
   → vault → crt → scope/audio → finds → power
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- 0. TRUE-TOP ENTRY ----------
     Fresh loads, refreshes, new tabs and bfcache returns must all
     begin at the real beginning — never mid-world, never at a hash.
     Layered (not a single scrollTo): manual restoration set first,
     reset now, again after full load (images/fonts/layout settle),
     and on bfcache restore — but never yank a user who already
     chose to scroll. Internal anchor clicks don't reload, so they
     keep working normally. */
  try { history.scrollRestoration = "manual"; } catch { /* older browser */ }
  let userMoved = false;
  ["wheel", "touchmove", "keydown"].forEach((ev) =>
    window.addEventListener(ev, () => { userMoved = true; }, { passive: true, once: true })
  );
  function resetToTop() {
    if (userMoved) return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* file:// etc */ }
    window.scrollTo(0, 0);
  }
  resetToTop();
  window.addEventListener("load", resetToTop);
  window.addEventListener("pageshow", (e) => { if (e.persisted) resetToTop(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (!userMoved && window.scrollY < 400) window.scrollTo(0, 0); });
  }

  /* ---------- 1. BOOT (airlock) ---------- */
  const boot = $("#boot");
  const bootLog = $("#bootLog");
  const bootFill = $("#bootBarFill");
  const bootEnter = $("#bootEnter");
  const bootHint = $("#bootHint");
  const bootLines = [
    "CYBERCORE BIOS — CHECKING MEMORY . . . <span class='ok'>640K OK</span>",
    "OPENING THE WORLD . . . <span class='ok'>SEALED 1998</span>",
    "MOUNTING /dev/nostalgia . . . <span class='ok'>1.44 MB FOUND</span>",
    "TUNING CRT TO 60Hz . . . <span class='ok'>WARM</span>",
    "SIGNAL HELD. <span class='ok'>DESCEND.</span>",
  ];
  function finishBoot() {
    if (!boot || boot.classList.contains("is-done")) return;
    boot.classList.add("is-done");
    boot.setAttribute("aria-hidden", "true");
    document.body.dataset.state = "online";
    document.body.style.overflow = "";
    scheduleSongAuto();
  }
  if (boot) {
    document.body.style.overflow = "hidden";
    if (reducedMotion) {
      bootLog.innerHTML = bootLines.map((l) => `<p>${l}</p>`).join("");
      bootFill.style.width = "100%";
      bootEnter.disabled = false;
      bootHint.textContent = "ready — motion reduced, world calm.";
      const t = setTimeout(finishBoot, 600);
      bootEnter.addEventListener("click", () => { clearTimeout(t); finishBoot(); });
    } else {
      let li = 0;
      const total = bootLines.length;
      const timer = setInterval(() => {
        if (li < total) {
          const p = document.createElement("p");
          p.innerHTML = bootLines[li];
          bootLog.appendChild(p);
          li += 1;
          bootFill.style.width = `${(li / total) * 100}%`;
          if (li === total) {
            clearInterval(timer);
            bootEnter.disabled = false;
            bootHint.textContent = "the tube is warm. go down.";
            setTimeout(finishBoot, 900);
          }
        }
      }, 320);
      bootEnter.addEventListener("click", () => { clearInterval(timer); finishBoot(); });
      setTimeout(finishBoot, 6000);
    }
  }

  // The boot must never feel like a freeze: any scroll attempt,
  // touch or keypress dismisses it instantly.
  if (boot) {
    window.addEventListener("wheel", finishBoot, { passive: true, once: true });
    window.addEventListener("touchmove", finishBoot, { passive: true, once: true });
    window.addEventListener("keydown", finishBoot, { once: true });
  }

  /* ---------- 2. SCENE ENGINE (one --p var per pinned scene) ---------- */
  const scenes = $$(".scene");
  function updateScenes() {
    const vh = window.innerHeight;
    scenes.forEach((s) => {
      const rect = s.getBoundingClientRect();
      const total = s.offsetHeight - vh;
      const p = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 1;
      s.style.setProperty("--p", p.toFixed(4));
    });
  }
  function scenesActive() { return scenes.length > 0 && !reducedMotion; }

  /* ---------- 3. CHAPTER SPY (system strip readout) ---------- */
  const chapterLcd = $("#chapterLcd");
  const chapterEls = $$("[data-chapter]");
  if ("IntersectionObserver" in window && chapterLcd && chapterEls.length) {
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) chapterLcd.textContent = e.target.dataset.chapter || "";
      }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    chapterEls.forEach((el) => spy.observe(el));
  }

  /* ---------- 4. INDEX MAP ---------- */
  const indexmap = $("#indexmap");
  const indexBtn = $("#indexBtn");
  const indexClose = $("#indexClose");
  let indexReturnFocus = null;
  function openIndex() {
    if (!indexmap) return;
    indexReturnFocus = document.activeElement;
    indexmap.hidden = false;
    document.body.style.overflow = "hidden";
    indexClose?.focus();
  }
  function closeIndex() {
    if (!indexmap || indexmap.hidden) return;
    indexmap.hidden = true;
    document.body.style.overflow = "";
    if (indexReturnFocus && indexReturnFocus.focus) indexReturnFocus.focus();
  }
  indexBtn?.addEventListener("click", openIndex);
  indexClose?.addEventListener("click", closeIndex);
  indexmap?.addEventListener("click", (e) => { if (e.target.closest("[data-index-close]")) closeIndex(); });
  $$(".index-panel a").forEach((a) => a.addEventListener("click", closeIndex));
  document.addEventListener("keydown", (e) => {
    if (indexmap && !indexmap.hidden && e.key === "Escape") closeIndex();
  });

  /* ---------- 5. CLOCKS ---------- */
  const clockEl = $("#clock");
  const quietClock = $("#quietClock");
  const t0 = Date.now();
  const pad = (n) => String(n).padStart(2, "0");
  function tickClocks() {
    const d = new Date();
    if (clockEl) clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (quietClock) quietClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ---------- 6. REVEAL ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const ro = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => ro.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- 7. UNIFIED SCROLL LOOP ----------
     One rAF per scroll gesture drives everything, and every frame
     reads layout first, then writes — never interleaved — so the
     first scrolls can't stutter on forced reflows. */
  const parallaxImgs = $$("[data-parallax]");
  const parallaxVisible = new Set();
  if (parallaxImgs.length && !reducedMotion && "IntersectionObserver" in window) {
    const po = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) parallaxVisible.add(e.target);
        else parallaxVisible.delete(e.target);
      }),
      { rootMargin: "20% 0px 20% 0px" }
    );
    parallaxImgs.forEach((img) => po.observe(img));
  }
  function parallaxFrame() {
    if (!parallaxVisible.size) return;
    const vh = window.innerHeight;
    // phase 1: read
    const jobs = [];
    parallaxVisible.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      jobs.push([img, (r.top + r.height / 2 - vh / 2) / vh]);
    });
    // phase 2: write
    jobs.forEach(([img, progress]) => {
      const speed = parseFloat(img.dataset.parallax || "0.1") * 100;
      img.style.transform = `translateY(${(progress * speed).toFixed(1)}px) scale(1.1)`;
    });
  }
  if (!reducedMotion) {
    let scrollTicking = false;
    function scrollFrame() {
      scrollTicking = false;
      if (scenesActive()) updateScenes();
      parallaxFrame();
    }
    function requestScrollFrame() {
      if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(scrollFrame); }
    }
    document.addEventListener("scroll", requestScrollFrame, { passive: true });
    window.addEventListener("resize", requestScrollFrame);
    if (scenesActive()) updateScenes();
    parallaxFrame();
  }

  /* ---------- 8. CURSOR ---------- */
  if (finePointer && !reducedMotion) {
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    let mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (dot) dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      if (ring) ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest("[data-hover], a, button, input")) ring?.classList.add("is-hot");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-hover], a, button, input")) ring?.classList.remove("is-hot");
    });
  }

  /* ---------- 9. VAULT ---------- */
  function closeTray(item, instant = false) {
    const btn = $(".tray-row", item);
    const detail = $(".tray-detail", item);
    btn?.setAttribute("aria-expanded", "false");
    if (!detail || detail.hasAttribute("hidden")) return;
    detail.classList.remove("open");
    window.setTimeout(() => {
      if (!detail.classList.contains("open")) detail.setAttribute("hidden", "");
    }, instant ? 0 : 480);
  }
  function openTray(item) {
    const btn = $(".tray-row", item);
    const detail = $(".tray-detail", item);
    btn?.setAttribute("aria-expanded", "true");
    if (!detail) return;
    detail.removeAttribute("hidden");
    requestAnimationFrame(() => requestAnimationFrame(() => detail.classList.add("open")));
  }
  $$(".tray").forEach((item) => {
    $(".tray-row", item)?.addEventListener("click", () => {
      const btn = $(".tray-row", item);
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      $$(".tray").forEach((o) => { if (o !== item) closeTray(o); });
      if (isOpen) closeTray(item);
      else openTray(item);
    });
  });
  if (finePointer && !reducedMotion) {
    const preview = $("#memoryPreview");
    const pimg = preview ? $("img", preview) : null;
    let px = 0, py = 0, tx = 0, ty = 0;
    document.addEventListener("mousemove", (e) => { tx = e.clientX + 26; ty = e.clientY - 85; }, { passive: true });
    (function follow() {
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
      if (preview) { preview.style.left = `${px}px`; preview.style.top = `${py}px`; }
      requestAnimationFrame(follow);
    })();
    $$(".tray-row").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        const src = row.dataset.preview;
        if (src && pimg && preview) {
          if (pimg.getAttribute("src") !== src) pimg.setAttribute("src", src);
          preview.classList.add("is-on");
        }
      });
      row.addEventListener("mouseleave", () => preview?.classList.remove("is-on"));
      row.addEventListener("focus", () => {
        const src = row.dataset.preview;
        if (src && pimg && preview) {
          pimg.setAttribute("src", src);
          preview.classList.add("is-on");
        }
      });
      row.addEventListener("blur", () => preview?.classList.remove("is-on"));
    });
  }

  /* ---------- 10. CRT (channel knob + standby) ---------- */
  const crt = $("#heroCrt");
  const chImgs = $$(".screen-img");
  const chLabel = $("#chLabel");
  const chKnob = $("#chKnob");
  const chDial = chKnob ? $(".knob-dial", chKnob) : null;
  const standbyBtn = $("#screenStandby");
  const screenLed = $("#screenLed");
  let chIndex = 0;
  function setChannel(i) {
    chIndex = (i + chImgs.length) % chImgs.length;
    chImgs.forEach((img, k) => img.classList.toggle("is-on", k === chIndex));
    if (chLabel) chLabel.textContent = chImgs[chIndex].dataset.ch || "";
    if (chDial) chDial.style.setProperty("--rot", `${chIndex * 45}deg`);
  }
  chKnob?.addEventListener("click", () => {
    if (crt?.classList.contains("standby")) return;
    setChannel(chIndex + 1);
  });
  standbyBtn?.addEventListener("click", () => {
    const off = crt?.classList.toggle("standby") ?? false;
    standbyBtn.setAttribute("aria-pressed", String(off));
    standbyBtn.textContent = off ? "WAKE" : "STANDBY";
    if (screenLed) {
      screenLed.classList.toggle("led-green", !off);
      screenLed.classList.toggle("led-red", off);
    }
  });

  /* ---------- 11. SIGNAL LAB ---------- */
  const scope = $("#scope");
  const ctx = scope?.getContext("2d");
  const chanBtns = $$(".chan");
  const tune = $("#tuneRange");
  const scopeLabel = $("#scopeLabel");
  const scopeFreq = $("#scopeFreq");
  const scopeState = $("#scopeState");
  const logList = $("#signalLog");
  let baseFreq = 50;
  let drift = 0.28;
  let phase = 0;
  function stamp() {
    const el = Math.floor((Date.now() - t0) / 1000);
    return `${pad(Math.floor(el / 3600))}:${pad(Math.floor(el / 60) % 60)}:${pad(el % 60)}`;
  }
  function logLine(text) {
    if (!logList) return;
    const li = document.createElement("li");
    const s = document.createElement("span");
    s.textContent = stamp();
    li.appendChild(s);
    li.appendChild(document.createTextNode(text));
    logList.prepend(li);
    while (logList.children.length > 6) logList.lastChild?.remove();
  }
  chanBtns.forEach((b) => b.addEventListener("click", () => {
    chanBtns.forEach((o) => o.classList.remove("is-active"));
    b.classList.add("is-active");
    baseFreq = parseFloat(b.dataset.freq || "50");
    if (scopeLabel) scopeLabel.textContent = b.dataset.label || "";
    if (scopeFreq) scopeFreq.textContent = `${baseFreq.toFixed(1)} Hz`;
    logLine(`tuned → ${b.dataset.label}`);
    if (chanOsc) retuneOsc();
  }));
  tune?.addEventListener("input", () => {
    drift = parseInt(tune.value, 10) / 100;
    if (scopeFreq) scopeFreq.textContent = `${(baseFreq * (1 + (drift - 0.28) * 0.4)).toFixed(1)} Hz`;
  });
  function drawScope() {
    if (!scope || !ctx) return;
    const W = scope.width, H = scope.height;
    ctx.fillStyle = "#030507";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(125,216,255,0.09)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const f = baseFreq * (1 + (drift - 0.28) * 0.4);
    const noise = 6 + drift * 26;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const t = x / W;
      const wob = Math.sin(t * Math.PI * 2 * (f / 22) + phase) * (H * 0.22);
      const wob2 = Math.sin(t * Math.PI * 2 * (f / 7.3) - phase * 1.7) * (H * 0.06);
      const n = reducedMotion ? 0 : (Math.random() - 0.5) * noise;
      const y = H / 2 + wob * Math.sin(phase * 0.3 + 1) + wob2 + n;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#7dd8ff";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(125,216,255,0.8)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(140,255,158,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!reducedMotion) {
      phase += 0.045 + drift * 0.05;
      requestAnimationFrame(drawScope);
    }
  }
  drawScope();

  /* ---------- 12. AUDIO ---------- */
  let actx = null, master = null, chanOsc = null, chanGain = null;
  let chanOn = false;
  const signalSoundBtn = $("#signalSoundBtn");
  function ensureAudio() {
    if (actx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.0;
      master.connect(actx.destination);
      return true;
    } catch { return false; }
  }
  function retuneOsc() {
    if (!actx || !chanOsc) return;
    chanOsc.frequency.setTargetAtTime(baseFreq, actx.currentTime, 0.05);
  }
  function setChannelListen(on) {
    if (on && !ensureAudio()) { logLine("audio unavailable in this browser"); return; }
    chanOn = on;
    actx?.resume?.();
    const t = actx.currentTime;
    if (on) {
      chanOsc = actx.createOscillator();
      chanOsc.type = baseFreq > 500 ? "square" : "sine";
      chanOsc.frequency.value = baseFreq;
      chanGain = actx.createGain();
      chanGain.gain.value = 0.0;
      chanOsc.connect(chanGain).connect(master);
      chanOsc.start();
      chanGain.gain.setTargetAtTime(0.16, t, 0.2);
      master.gain.setTargetAtTime(0.5, t, 0.3);
    } else {
      chanGain?.gain.setTargetAtTime(0.0, t, 0.15);
      const osc = chanOsc;
      setTimeout(() => { try { osc?.stop(); } catch {} }, 600);
      master?.gain.setTargetAtTime(0.0, t, 0.3);
      chanOsc = null;
    }
    signalSoundBtn?.setAttribute("aria-pressed", String(on));
    if (signalSoundBtn) signalSoundBtn.textContent = on ? "Mute this channel" : "Listen to this channel";
    if (scopeState) scopeState.textContent = on ? "AUDIBLE · LAB TONE" : "SILENT — VISUAL ONLY";
    logLine(on ? `listening → ${baseFreq}Hz (generated)` : "channel muted");
  }
  signalSoundBtn?.addEventListener("click", () => setChannelListen(!chanOn));

  /* ---------- 12b. MUSIC DECK ---------- */
  const musicBtn = $("#musicBtn");
  const musicDeck = $("#musicDeck");

  /* generative score removed — the deck now carries transmissions only. */

  musicBtn?.addEventListener("click", () => {
    if (!musicDeck) return;
    const open = musicDeck.hidden;
    musicDeck.hidden = !open;
    musicBtn.setAttribute("aria-expanded", String(open));
  });
  document.querySelector("#deckClose")?.addEventListener("click", () => {
    if (musicDeck) { musicDeck.hidden = true; musicBtn?.setAttribute("aria-expanded", "false"); }
  });
  /* deck transport lives on the transmission block below. */

  /* ---------- 12c. TRANSMISSION: official YouTube signal ----------
     Beach House — "Space Song" (Sub Pop, 2015), video RBtlPT23PTM.
     Verified via YouTube oEmbed as an official Sub Pop upload.
     Played ONLY through YouTube's official iframe embed, which
     enforces the owner's own embedding settings. The per-video
     embedding flag cannot be checked remotely: if embedding is
     disabled, the player itself shows a notice and the generative
     ambience remains as fallback. Nothing is downloaded or ripped. */
  const SONGS = [
    { id: "RBtlPT23PTM", title: "BEACH HOUSE — \u201CSPACE SONG\u201D", sub: "SUB POP · 2015 · OFFICIAL UPLOAD · 5:20", watch: "https://www.youtube.com/watch?v=RBtlPT23PTM" },
    { id: "vx4kLgnFexo", title: "MITSKI — \u201CMY LOVE MINE ALL MINE\u201D", sub: "DEAD OCEANS · 2023 · OFFICIAL VIDEO", watch: "https://www.youtube.com/watch?v=vx4kLgnFexo" },
  ];
  const songPlay = $("#songPlay");
  const songMute = $("#songMute");
  const songVol = $("#songVol");
  const songNote = $("#songNote");
  const songLed = $("#songLed");
  const songTitle = $("#songTitle");
  const songSub = $("#songSub");
  const songWatch = $("#songWatch");
  const trackBtns = $$(".track");
  let ytPlayer = null, ytReady = false, ytApiLoading = false, songIdx = 0;

  function setTrackUI() {
    const s = SONGS[songIdx];
    if (songTitle) songTitle.textContent = s.title;
    if (songSub) songSub.textContent = s.sub;
    if (songWatch) songWatch.href = s.watch;
    trackBtns.forEach((b) => b.classList.toggle("is-active", parseInt(b.dataset.track, 10) === songIdx));
  }

  const nowPlaying = $("#nowPlaying");
  let songAutoDone = false, songStarted = false;

  function setSongUI(state) { // 1 playing, 2 paused, 3 buffering
    const playing = state === 1 || state === 3;
    if (playing) {
      songStarted = true;
      if (nowPlaying) nowPlaying.hidden = false;
    } else if (state === 2 || state === 0) {
      if (nowPlaying) nowPlaying.hidden = true;
    }
    if (songPlay) {
      songPlay.textContent = playing ? "\u275A\u275A PAUSE" : "\u25B6 PLAY";
      songPlay.setAttribute("aria-pressed", String(playing));
    }
    if (songLed) songLed.hidden = !playing;
  }

  function createYtPlayer(videoId) {
    if (ytPlayer || !window.YT || !window.YT.Player) return;
    ytPlayer = new window.YT.Player("ytPlayer", {
      host: "https://www.youtube-nocookie.com",
      videoId: videoId,
      playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
      events: {
        onReady: (e) => {
          ytReady = true;
          e.target.setVolume(songVol ? parseInt(songVol.value, 10) : 55);
          e.target.playVideo(); // runs inside the click's transient activation
        },
        onStateChange: (e) => setSongUI(e.data),
        onError: () => {
          if (songNote) songNote.textContent = "TRANSMISSION BLOCKED BY OWNER — THE ARCHIVE HUMS ON.";
          setSongUI(2);
        },
      },
    });
  }
  window.onYouTubeIframeAPIReady = () => { createYtPlayer(SONGS[songIdx].id); };

  function loadYtApi(onFail) {
    if (window.YT && window.YT.Player) return true;
    if (ytApiLoading) return false;
    ytApiLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => { ytApiLoading = false; if (onFail) onFail(); };
    document.head.appendChild(tag);
    return false;
  }

  function playTrack(i) {
    songIdx = (i + SONGS.length) % SONGS.length;
    setTrackUI();
    if (ytPlayer && ytReady) {
      try { ytPlayer.loadVideoById(SONGS[songIdx].id); } catch { /* user can press play */ }
      return;
    }
    if (songNote) songNote.textContent = "TUNING TRANSMISSION…";
    if (loadYtApi(() => {
      if (songNote) songNote.textContent = "NO SIGNAL (OFFLINE?) — THE ARCHIVE HUMS ON.";
    })) createYtPlayer(SONGS[songIdx].id);
    // otherwise onYouTubeIframeAPIReady continues after load
  }
  trackBtns.forEach((b) => b.addEventListener("click", () => {
    sysBlip(740, 0.05);
    playTrack(parseInt(b.dataset.track, 10));
  }));

  songPlay?.addEventListener("click", () => {
    if (ytPlayer && ytReady) {
      try {
        const s = ytPlayer.getPlayerState();
        if (s === 1 || s === 3) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
      } catch { /* player not ready yet; user can press again */ }
      return;
    }
    playTrack(songIdx);
  });
  songMute?.addEventListener("click", () => {
    if (!ytPlayer || !ytReady) return;
    try {
      if (ytPlayer.isMuted()) { ytPlayer.unMute(); songMute.setAttribute("aria-pressed", "false"); }
      else { ytPlayer.mute(); songMute.setAttribute("aria-pressed", "true"); }
    } catch { /* ignore */ }
  });
  songVol?.addEventListener("input", () => {
    if (!ytPlayer || !ytReady) return;
    try { ytPlayer.setVolume(parseInt(songVol.value, 10)); } catch { /* ignore */ }
  });

  /* Delayed autoplay: try ~5s after entry; browsers that block it
     (most, without a prior gesture) get the deck opened for one tap. */
  let deckAutoOpened = false;
  function openDeckAuto() {
    if (deckAutoOpened || !musicDeck) return;
    deckAutoOpened = true;
    musicDeck.hidden = false;
    musicBtn?.setAttribute("aria-expanded", "true");
  }
  function attemptSongAuto(attempts = 0) {
    if (songAutoDone || songStarted) return;
    if (ytPlayer && ytReady) {
      songAutoDone = true;
      try { ytPlayer.playVideo(); } catch { /* blocked below */ }
      window.setTimeout(() => {
        let st = -99;
        try { st = ytPlayer.getPlayerState(); } catch { /* ignore */ }
        if (st !== 1 && !songStarted) openDeckAuto();
      }, 1800);
      return;
    }
    if (attempts < 4) window.setTimeout(() => attemptSongAuto(attempts + 1), 2500);
    else openDeckAuto();
  }
  function scheduleSongAuto() {
    const wait = Math.max(0, 5000 - (Date.now() - t0));
    window.setTimeout(attemptSongAuto, wait);
  }
  nowPlaying?.addEventListener("click", () => {
    if (musicDeck) { musicDeck.hidden = false; musicBtn?.setAttribute("aria-expanded", "true"); }
  });
  loadYtApi(); // warm the player early so the delayed start is instant

  /* ---------- 13. FINDS LIGHTBOX ---------- */
  const gItems = $$(".drift-item");
  const lb = $("#lightbox");
  const lbImg = $("#lbImg");
  const lbTitle = $("#lbTitle");
  const lbMeta = $("#lbMeta");
  const lbCount = $("#lbCount");
  let lbIndex = 0;
  let lastFocus = null;
  function openLb(i) {
    lbIndex = (i + gItems.length) % gItems.length;
    const it = gItems[lbIndex];
    const full = it.dataset.full || $("img", it)?.getAttribute("src") || "";
    if (lbImg) {
      lbImg.setAttribute("src", full);
      lbImg.setAttribute("alt", $("img", it)?.getAttribute("alt") || it.dataset.title || "Archive find");
    }
    if (lbTitle) lbTitle.textContent = it.dataset.title || "";
    if (lbMeta) lbMeta.textContent = it.dataset.meta || "";
    if (lbCount) lbCount.textContent = `${lbIndex + 1} / ${gItems.length}`;
    if (lb) lb.hidden = false;
    lastFocus = document.activeElement;
    $("#lbClose")?.focus();
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    if (lb) lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  gItems.forEach((it, i) => it.addEventListener("click", () => openLb(i)));
  $("#lbClose")?.addEventListener("click", closeLb);
  $("#lbPrev")?.addEventListener("click", (e) => { e.stopPropagation(); openLb(lbIndex - 1); });
  $("#lbNext")?.addEventListener("click", (e) => { e.stopPropagation(); openLb(lbIndex + 1); });
  lb?.addEventListener("click", (e) => { if (e.target.closest("[data-lb-close]")) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (!lb || lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") openLb(lbIndex - 1);
    if (e.key === "ArrowRight") openLb(lbIndex + 1);
    if (e.key === "Tab") {
      const focusables = $$("button", lb).filter((b) => !b.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- 14. MAIN SWITCH ---------- */
  const powerBtn = $("#powerBtn");
  const powerBtnLabel = $("#powerBtnLabel");
  powerBtn?.addEventListener("click", () => {
    const down = document.body.classList.toggle("powered-down");
    powerBtn.setAttribute("aria-pressed", String(down));
    if (powerBtnLabel) powerBtnLabel.textContent = down ? "RESTORE THE GLOW" : "POWER DOWN THE GLOW";
    logLine(down ? "operator dimmed the world" : "operator restored the glow");
  });

  /* ---------- 14b. THE DESKTOP: a computer you remember ----------
     Original retro-OS-inspired environment (not any real product):
     icons, draggable windows, folders, files, browser, chat,
     snake, media bridge to the found song, and one hidden folder. */
  const pcscreen = $("#pcscreen");
  const deskIcons = $("#deskIcons");
  const deskWins = $("#deskWins");
  const deskTray = $("#deskTray");
  const startBtn = $("#startBtn");
  const startMenu = $("#startMenu");
  const deskClock = $("#deskClock");
  const deskPost = $("#deskPost");
  const deskToast = $("#deskToast");
  const netIco = $("#netIco");
  let zTop = 20;
  const openWins = {};
  const canDragWin = () => finePointer && !reducedMotion && window.innerWidth > 700;

  function sysBlip(freq = 660, dur = 0.07, type = "square", vol = 0.025) {
    try {
      if (!actx || actx.state !== "running") return; // never force sound
      const t = actx.currentTime;
      const o = actx.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch { /* silent */ }
  }

  const PHOTOS = {
    glow: { src: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=60", alt: "Television glow in a dark living room", cap: "the tv stayed on for company. 23:47." },
    desk: { src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=60", alt: "Desk with laptops served as the family computer", cap: "the coldest corner of the house. best corner." },
    first: { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=60", alt: "Early digital camera", cap: "august 2003. you forgot this day. it didn't forget you." },
  };
  const TEXTS = {
    readme: "if you're reading this, the computer still works.\n\nwater the plant.\n\n— me, 2003",
    homework: "Chapter 3.\n\nThe internet is a place. You go there after 11pm, when the rates are cheap and the house is asleep. More research needed. (Need to ask Sara what 'forum' means.)",
    tracklist: "MIXTAPE — SUMMER 2003\n\n 1. dial tone (intro)\n 2. the hum of hall C\n 3. ??? (sara's song)\n ...\n15. the one we'll never find again",
    snakehelp: "HIGH SCORES:\n\n  DAD ......... 420\n  you .........  69\n\nunbeatable. don't try.",
    ideas: "- a song about a modem falling in love\n- website for our street\n- ask dad what a 'partition' is",
    lyrics: "(verse?)\nwe met at 56k / your picture loaded line by line / i waited, i waited…",
    passwords: "Nice try.\n\n— past you",
    bin: "recycle bin is empty.\n\nlike my summer plans.",
    secret: "you said you'd delete these.\n\nyou didn't.\n\ngood.",
  };
  const CHAT_SCRIPT = [
    ["sara", "r u there??"],
    ["you", "yeah. mom's asleep, i'm on the big computer"],
    ["sara", "did u hear the new song??"],
    ["you", "downloading. 47 minutes left"],
    ["sara", "FORTY SEVEN??"],
    ["you", "don't call the house. if the line drops i'll cry"],
    ["sara", "promise. brb — dad needs the phone"],
    ["sys", "sara has gone offline"],
    ["sys", "…24 minutes later…"],
    ["sara", "BACK. did it finish??"],
    ["you", "98%... 99... IT'S DONE"],
    ["sara", "PLAY IT LOUD"],
  ];

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function focusWin(id) {
    const w = openWins[id];
    if (!w) return;
    zTop += 1;
    w.el.style.zIndex = String(zTop);
    w.el.style.display = "";
    $$(".traybtn", deskTray).forEach((b) => b.classList.toggle("active", b.dataset.win === id));
  }

  function closeWin(id) {
    const w = openWins[id];
    if (!w) return;
    if (w.cleanup) { try { w.cleanup(); } catch { /* noop */ } }
    w.el.remove();
    w.trayBtn.remove();
    delete openWins[id];
    sysBlip(330, 0.06);
  }

  function minimizeWin(id) {
    const w = openWins[id];
    if (!w) return;
    w.el.style.display = "none";
    $$(".traybtn", deskTray).forEach((b) => b.classList.toggle("active", false));
    sysBlip(440, 0.05);
  }

  function openWindow(id, title, buildBody, opts = {}) {
    if (!pcscreen || !deskWins || !deskTray) return;
    if (openWins[id]) { focusWin(id); return; }
    sysBlip(660, 0.06);
    const n = Object.keys(openWins).length;
    const win = el("div", "win");
    win.style.zIndex = String((zTop += 1));
    win.style.left = `${12 + (n % 5) * 26}px`;
    win.style.top = `${12 + (n % 5) * 24}px`;
    if (opts.wide) win.style.width = "min(560px, calc(100% - 20px))";
    const bar = el("div", "win-titlebar", `<b></b>`);
    bar.querySelector("b").textContent = title;
    const btns = el("div", "win-btns");
    const minB = el("button", "", "_"); minB.type = "button"; minB.setAttribute("aria-label", `Minimize ${title}`);
    const maxB = el("button", "", "▢"); maxB.type = "button"; maxB.setAttribute("aria-label", `Maximize or restore ${title}`);
    const xB = el("button", "", "✕"); xB.type = "button"; xB.setAttribute("aria-label", `Close ${title}`);
    btns.append(minB, maxB, xB);
    bar.append(btns);
    const menu = el("div", "win-menubar", "");
    [["File", "file — everything stays. nothing is ever deleted here."], ["Edit", "edit — the past is read-only."], ["View", "view — icons. the only view that matters."], ["Help", "help — have you tried turning it off and on again? (don't)"]].forEach(([label, msg]) => {
      const m = el("button", "", label);
      m.type = "button";
      m.addEventListener("click", () => { status.textContent = msg; sysBlip(740, 0.04); });
      menu.append(m);
    });
    const body = el("div", "win-body");
    const status = el("div", "win-statusbar", opts.status || "ready");
    win.append(bar, menu, body, status);
    deskWins.append(win);
    const trayBtn = el("button", "traybtn active", "");
    trayBtn.type = "button";
    trayBtn.dataset.win = id;
    trayBtn.textContent = title;
    deskTray.append(trayBtn);
    const rec = { el: win, trayBtn, cleanup: null };
    openWins[id] = rec;
    minB.addEventListener("click", (e) => { e.stopPropagation(); minimizeWin(id); });
    xB.addEventListener("click", (e) => { e.stopPropagation(); closeWin(id); });
    trayBtn.addEventListener("click", () => {
      if (win.style.display === "none") focusWin(id);
      else if (parseInt(win.style.zIndex, 10) === zTop) minimizeWin(id);
      else focusWin(id);
    });
    win.addEventListener("pointerdown", () => focusWin(id));
    // maximize: button or double-click on the titlebar
    let prevRect = null;
    const toggleMax = () => {
      if (win.classList.contains("maximized")) {
        win.classList.remove("maximized");
        if (prevRect) {
          win.style.left = prevRect.l; win.style.top = prevRect.t;
          win.style.width = prevRect.w; win.style.height = prevRect.h;
        }
      } else {
        prevRect = { l: win.style.left, t: win.style.top, w: win.style.width, h: win.style.height };
        win.classList.add("maximized");
      }
      sysBlip(520, 0.05);
    };
    maxB.addEventListener("click", (e) => { e.stopPropagation(); toggleMax(); });
    bar.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) toggleMax(); });
    // resize handle (desktop pointers only)
    if (canDragWin()) {
      const rz = el("div", "resizer", "");
      rz.setAttribute("aria-hidden", "true");
      win.append(rz);
      rz.addEventListener("pointerdown", (e) => {
        e.preventDefault(); e.stopPropagation();
        rz.setPointerCapture(e.pointerId);
        const r0 = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;
        const move = (ev) => {
          win.style.width = `${Math.max(240, r0.width + ev.clientX - sx)}px`;
          const h = Math.max(170, r0.height + ev.clientY - sy);
          win.style.height = `${h}px`;
          body.style.maxHeight = "none";
          body.style.flex = "1";
        };
        const up = () => {
          rz.removeEventListener("pointermove", move);
          rz.removeEventListener("pointerup", up);
          rz.removeEventListener("pointercancel", up);
        };
        rz.addEventListener("pointermove", move);
        rz.addEventListener("pointerup", up);
        rz.addEventListener("pointercancel", up);
      });
    }
    // drag by titlebar (desktop pointers only)
    bar.addEventListener("pointerdown", (e) => {
      if (!canDragWin() || e.target.closest("button")) return;
      e.preventDefault();
      const scr = pcscreen.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      const dx = e.clientX - wr.left, dy = e.clientY - wr.top;
      bar.setPointerCapture(e.pointerId);
      const move = (ev) => {
        let x = ev.clientX - scr.left - dx;
        let y = ev.clientY - scr.top - dy;
        x = Math.max(-wr.width + 80, Math.min(x, scr.width - 80));
        y = Math.max(0, Math.min(y, scr.height - 120));
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;
      };
      const up = () => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
    buildBody(body, rec, status);
    focusWin(id);
    return rec;
  }

  function fileRow(name, kind, meta, onOpen) {
    const b = el("button", "frow", `<span class="kind ${kind}">${kind.toUpperCase()}</span><span></span><small></small>`);
    b.type = "button";
    b.children[1].textContent = name;
    b.children[2].textContent = meta || "";
    b.addEventListener("click", onOpen);
    b.addEventListener("dblclick", onOpen);
    return b;
  }

  function openText(id, title, text) {
    openWindow(id, title, (body) => {
      const p = el("p", "notepad", "");
      p.textContent = text;
      body.append(p);
    }, { status: `${text.length} characters · saved 2003` });
  }

  function openPhoto(id, title, photo) {
    openWindow(id, title, (body) => {
      const v = el("div", "viewer", "");
      const img = el("img", "", "");
      img.src = photo.src; img.alt = photo.alt; img.loading = "lazy"; img.decoding = "async";
      const cap = el("p", "", "");
      cap.textContent = photo.cap;
      v.append(img, cap);
      body.append(v);
    }, { status: "1.3 MP · flash was on", wide: true });
  }

  const FOLDERS = {
    photos: { title: "my photos", status: "3 items · 4.1 MB of 16 MB card", files: [
      ["crt_glow.bmp", "img", "128 KB", () => openPhoto("ph-glow", "crt_glow.bmp", PHOTOS.glow)],
      ["my_desk.jpg", "img", "640 KB", () => openPhoto("ph-desk", "my_desk.jpg", PHOTOS.desk)],
      ["first_photo.png", "img", "1.2 MB", () => openPhoto("ph-first", "first_photo.png", PHOTOS.first)],
    ]},
    music: { title: "music", status: "15 songs · 128 kbps · perfect", files: [
      ["SPACE SONG — found.mp3", "app", "4.8 MB", () => openMedia()],
      ["tracklist.txt", "txt", "1 KB", () => openText("tx-track", "tracklist.txt", TEXTS.tracklist)],
    ]},
    games: { title: "games", status: "do not tell mom about the high scores", files: [
      ["SNAKE.EXE", "app", "64 KB", () => openSnake()],
      ["MINES.EXE", "app", "72 KB", () => openMines()],
      ["MATCH.EXE", "app", "58 KB", () => openMatch()],
      ["savegame_slot2.sav", "txt", "4 KB", () => openText("tx-save", "savegame_slot2.sav", "LEVEL 12.\n\ndad did the boss.\n\nnobody talks about how. ")],
      ["readme.txt", "txt", "1 KB", () => openText("tx-snake", "readme.txt", TEXTS.snakehelp)],
    ]},
    notebook: { title: "notebook", status: "do not read. seriously.", files: [
      ["readme.txt", "txt", "1 KB", () => openText("tx-readme", "readme.txt", TEXTS.readme)],
      ["homework_final_FINAL.doc", "txt", "32 KB", () => openText("tx-hw", "homework_final_FINAL.doc", TEXTS.homework)],
      ["ideas.txt", "txt", "1 KB", () => openText("tx-ideas", "ideas.txt", TEXTS.ideas)],
      ["lyrics_maybe.txt", "txt", "1 KB", () => openText("tx-lyr", "lyrics_maybe.txt", TEXTS.lyrics)],
      ["passwords_DO_NOT_READ.txt", "txt", "1 KB", () => openText("tx-pw", "passwords_DO_NOT_READ.txt", TEXTS.passwords)],
    ]},
    downloads: { title: "downloads", status: "47% of these finished. 100% were worth it.", files: [
      ["song_final_REAL(3).mp3", "app", "4.8 MB", () => openMedia()],
      ["funny_video.avi", "app", "700 MB", () => openText("tx-codec1", "media player", "cannot play this file.\n\na codec is missing.\n\nit has been missing since 2007.")],
      ["mystery.zip", "txt", "2 KB", () => openText("tx-zip", "mystery.zip", "it's empty.\n\nit was always empty.")],
    ]},
    school: { title: "school", status: "due monday. all of it.", files: [
      ["report_card.txt", "txt", "1 KB", () => openText("tx-rep", "report_card.txt", "conduct: talks too much about computers.\n\n— fair.")],
      ["essay_final.doc", "txt", "28 KB", () => openText("tx-ess", "essay_final.doc", "What I Did Last Summer:\n\nmostly this computer.")],
    ]},
    videos: { title: "videos", status: "filmed vertically before it was a thing", files: [
      ["birthday_2004.avi", "app", "320 MB", () => openText("tx-codec2", "media player", "cannot play this file.\n\nthe camera is in a drawer. the drawer is in another house.")],
      ["music_video.mpg", "app", "180 MB", () => openText("tx-codec3", "media player", "buffering…\n\nstill buffering.\n\nit will finish. it always finishes.")],
    ]},
    summer: { title: "summer_2003", status: "you said you'd delete this folder", files: [
      ["do_not_open.txt", "txt", "1 KB", () => openText("tx-secret", "do_not_open.txt", TEXTS.secret)],
      ["lake.png", "img", "900 KB", () => openPhoto("ph-lake", "lake.png", PHOTOS.first)],
    ]},
  };

  function openFolder(fid) {
    const f = FOLDERS[fid];
    if (!f) return;
    openWindow(`fld-${fid}`, f.title, (body) => {
      f.files.forEach(([name, kind, meta, fn]) => body.append(fileRow(name, kind, meta, fn)));
    }, { status: f.status });
  }

  function openBin() {
    openWindow("bin", "recycle bin", (body) => {
      const p = el("p", "notepad", "");
      p.textContent = TEXTS.bin;
      const b = el("button", "snake-start", "RESTORE HOMEWORK (1).doc");
      b.type = "button";
      b.style.marginTop = "12px";
      b.addEventListener("click", () => { p.textContent = "restored.\n\nyou're welcome."; sysBlip(880, 0.08); });
      body.append(p, b);
    }, { status: "0 items · 0 bytes · suspiciously clean" });
  }

  /* --- browser: three original era-inspired pages, fully clickable --- */
  const BROWSER = { hist: [], page: "portal" };
  function openBrowser() {
    openWindow("browser", "browser — dial-up", (body, rec, status) => {
      const bar = el("div", "browser-bar", "");
      const back = el("button", "", "←"); back.type = "button"; back.setAttribute("aria-label", "Back");
      const addr = el("div", "browser-addr", "http://portal.home/");
      bar.append(back, addr);
      const page = el("div", "browser-page", "");
      body.style.padding = "0";
      body.append(bar, page);
      const go = (name) => {
        if (BROWSER.page !== name) BROWSER.hist.push(BROWSER.page);
        BROWSER.page = name;
        renderBrowserPage(page, addr, status, go);
        back.disabled = !BROWSER.hist.length;
        sysBlip(520, 0.05);
      };
      back.addEventListener("click", () => {
        const prev = BROWSER.hist.pop();
        if (!prev) return;
        BROWSER.page = prev;
        renderBrowserPage(page, addr, status, go);
        back.disabled = !BROWSER.hist.length;
      });
      back.disabled = true;
      renderBrowserPage(page, addr, status, go);
    }, { status: "connected at 4.2 KB/s · do not pick up the phone", wide: true });
  }
  function renderBrowserPage(page, addr, status, go) {
    page.innerHTML = "";
    if (BROWSER.page === "portal") {
      addr.textContent = "http://portal.home/";
      status.textContent = "connected at 4.2 KB/s · do not pick up the phone";
      const d = el("div", "portal", `<p class="portal-logo">Find<em>It!</em></p>
        <form><input type="search" value="songs that feel like rain" aria-label="Search" /><button type="submit">SEARCH</button></form>
        <small>serving the whole street since 1999 · 14,203 searches today</small>`);
      d.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); go("results"); });
      page.append(d);
    } else if (BROWSER.page === "results") {
      addr.textContent = "http://portal.home/search?q=songs+like+rain";
      status.textContent = "3 results · 0.4 seconds (a personal record)";
      const d = el("div", "searchres", "");
      const add = (t, c, p, fn) => {
        const a = el("article", "", `<a href="#">${t}</a><cite>${c}</cite><p>${p}</p>`);
        a.querySelector("a").addEventListener("click", (e) => { e.preventDefault(); fn(); });
        d.append(a);
      };
      add("midnight forum — thread: what are you listening to?", "www.midnight-forum.net › threads › 8841", "47 replies. someone named sara_99 keeps recommending the same song…", () => go("forum"));
      add("sara's page ✿", "www.geocities.home/~sara_99", "under construction since 2001. guestbook works. midi plays automatically. sorry.", () => go("sara"));
      add("FindIt! — back home", "portal.home", "return to the search box. the night is young.", () => go("portal"));
      page.append(d);
    } else if (BROWSER.page === "forum") {
      addr.textContent = "http://www.midnight-forum.net/threads/8841";
      status.textContent = "logged in as guest_114 · 2:14 AM";
      const d = el("div", "forum", "");
      const post = (who, when, text) => el("div", "forum-post", `<div class="forum-head"><span>${who}</span><span>${when}</span></div><p>${text}</p>`);
      d.append(
        post("modem_dreams", "02:07", "can't sleep. the rain + the hum of the monitor is the best song ever made."),
        post("sara_99", "02:11", "listen to the song on my page. headphones on. lights off. trust me."),
        post("guest_114 (you)", "02:14", "downloading now. 47 minutes left. worth it.")
      );
      const backBtn = el("button", "snake-start", "← BACK TO RESULTS");
      backBtn.type = "button"; backBtn.style.margin = "4px 12px 8px";
      backBtn.addEventListener("click", () => go("results"));
      d.append(backBtn);
      page.append(d);
    } else if (BROWSER.page === "sara") {
      addr.textContent = "http://www.geocities.home/~sara_99";
      status.textContent = "★ you are visitor #001337 ★";
      const d = el("div", "homepage", `<div class="banner">✿ SARA'S CORNER OF THE INTERNET ✿</div>
        <h4>welcome to my page!!</h4><p>song of the week plays below (turn your speakers up, sorry mom)</p>
        <span class="counter">001337</span>
        <p style="margin-top:12px">sign the guestbook. be nice.</p>`);
      const sign = el("button", "snake-start", "SIGN GUESTBOOK");
      sign.type = "button";
      const msg = el("p", "", ""); msg.style.cssText = "font-family:var(--mono);font-size:11px;color:#2f7a4d;";
      sign.addEventListener("click", () => {
        msg.textContent = "★ you signed. she never saw it. she knows anyway. ★";
        sysBlip(880, 0.09);
      });
      const home = el("button", "snake-start", "← PORTAL");
      home.type = "button"; home.style.marginLeft = "8px";
      home.addEventListener("click", () => go("portal"));
      d.append(sign, home, msg);
      page.append(d);
    }
  }

  /* --- chat: a conversation that types itself --- */
  function openChat() {
    openWindow("chat", "messages — sara (online)", (body, rec) => {
      const log = el("div", "chatlog", "");
      const st = el("p", "chat-status", "sara is typing…");
      body.append(log, st);
      let i = 0, cancelled = false;
      rec.cleanup = () => { cancelled = true; };
      const step = () => {
        if (cancelled) return;
        if (i >= CHAT_SCRIPT.length) { st.textContent = "sara went offline · 22:42 · the song is still playing"; return; }
        const [who, text] = CHAT_SCRIPT[i];
        const line = el("div", "chatline", "");
        if (who === "sys") { line.classList.add("sys"); line.textContent = `*** ${text} ***`; }
        else {
          const b = el("b", who === "sara" ? "sara" : "you", who === "sara" ? "sara: " : "you: ");
          line.append(b, document.createTextNode(text));
          sysBlip(who === "sara" ? 990 : 740, 0.05);
        }
        log.append(line);
        body.scrollTop = body.scrollHeight;
        i += 1;
        rec.chatTimer = window.setTimeout(step, who === "sys" ? 1400 : 950);
      };
      rec.cleanup = () => { cancelled = true; window.clearTimeout(rec.chatTimer); };
      step();
    }, { status: "do not close this window. ever." });
  }

  /* --- snake: the waiting game --- */
  function openSnake() {
    openWindow("snake", "SNAKE.EXE", (body, rec) => {
      const wrap = el("div", "snake-wrap", "");
      const cv = el("canvas", "", "");
      cv.width = 20; cv.height = 20;
      cv.id = "snakeCanvas";
      const hud = el("div", "snake-hud", "<span>SCORE 0</span><span>BEST: DAD 420</span>");
      const start = el("button", "snake-start", "▶ START");
      start.type = "button";
      wrap.append(cv, hud, start);
      body.append(wrap);
      const ctx2 = cv.getContext("2d");
      let snake, dir, food, score, timer2, alive;
      const reset = () => {
        snake = [[10, 10], [9, 10], [8, 10]]; dir = [1, 0]; score = 0; alive = true;
        food = [5 + Math.floor(Math.random() * 10), 5 + Math.floor(Math.random() * 10)];
        hud.children[0].textContent = "SCORE 0";
      };
      const tick = () => {
        if (!alive) return;
        const head = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
        if (head[0] < 0 || head[1] < 0 || head[0] > 19 || head[1] > 19 || snake.some((s) => s[0] === head[0] && s[1] === head[1])) {
          alive = false; hud.children[0].textContent = `GAME OVER · ${score} PTS`;
          sysBlip(160, 0.25, "sawtooth", 0.04);
          return;
        }
        snake.unshift(head);
        if (head[0] === food[0] && head[1] === food[1]) {
          score += 10; hud.children[0].textContent = `SCORE ${score}`;
          sysBlip(880, 0.06);
          food = [Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)];
        } else snake.pop();
        ctx2.fillStyle = "#0a1410"; ctx2.fillRect(0, 0, 20, 20);
        ctx2.fillStyle = "#8cff9e";
        snake.forEach(([x, y]) => ctx2.fillRect(x, y, 1, 1));
        ctx2.fillStyle = "#ffb454";
        ctx2.fillRect(food[0], food[1], 1, 1);
      };
      const key = (e) => {
        const k = e.key;
        if (k === "ArrowUp" || k === "w") dir = [0, -1];
        else if (k === "ArrowDown" || k === "s") dir = [0, 1];
        else if (k === "ArrowLeft" || k === "a") dir = [-1, 0];
        else if (k === "ArrowRight" || k === "d") dir = [1, 0];
        else return;
        e.preventDefault();
      };
      let swipeX = null, swipeY = null;
      const tStart = (e) => { const t = e.touches[0]; swipeX = t.clientX; swipeY = t.clientY; };
      const tMove = (e) => {
        if (swipeX == null) return;
        const t = e.touches[0];
        const dx = t.clientX - swipeX, dy = t.clientY - swipeY;
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        dir = Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1];
        swipeX = t.clientX; swipeY = t.clientY;
        e.preventDefault();
      };
      start.addEventListener("click", () => {
        reset();
        window.clearInterval(timer2);
        timer2 = window.setInterval(tick, 115);
        document.addEventListener("keydown", key);
        start.textContent = "↻ RESTART";
        sysBlip(660, 0.07);
      });
      cv.addEventListener("touchstart", tStart, { passive: true });
      cv.addEventListener("touchmove", tMove, { passive: false });
      reset();
      ctx2.fillStyle = "#0a1410"; ctx2.fillRect(0, 0, 20, 20);
      rec.cleanup = () => { window.clearInterval(timer2); document.removeEventListener("keydown", key); };
    }, { status: "arrow keys / swipe · the loading took longer than the game" });
  }

  /* --- media bridge: the found song plays in the world receiver --- */
  function openMedia() {
    openWindow("media", "media player", (body) => {
      const v = el("div", "snake-wrap", "");
      const title = el("p", "notepad", "♪  SPACE SONG — found.mp3\n   4:48 · 128 kbps · 47 min well spent");
      title.style.textAlign = "left";
      const play = el("button", "snake-start", "▶ PLAY IN WORLD RECEIVER");
      play.type = "button"; play.style.marginTop = "12px";
      const note = el("p", "", "");
      note.style.cssText = "font-family:var(--mono);font-size:11px;color:#5b6360;margin-top:10px;";
      play.addEventListener("click", () => {
        if (musicDeck) { musicDeck.hidden = false; musicBtn?.setAttribute("aria-expanded", "true"); }
        songPlay?.click();
        note.textContent = "playing in the world receiver — look for the MUSIC key ↓";
        sysBlip(740, 0.08);
      });
      v.append(title, play, note);
      body.append(v);
    }, { status: "volume: respectful of sleeping parents" });
  }

  /* --- brick phone: contacts, messages, working calculator, clock, photos --- */
  function openPhone() {
    openWindow("phone", "brick — personal communicator", (body) => {
      const brick = el("div", "brick", "");
      const scr = el("div", "brick-screen", "");
      const keys = el("div", "brick-keys", "<span>1</span><span>2 abc</span><span>3 def</span><span>4 ghi</span><span>5 jkl</span><span>6 mno</span><span>7 pqrs</span><span>8 tuv</span><span>9 wxyz</span><span>*</span><span>0 +</span><span>#</span>");
      brick.append(scr, keys);
      body.append(brick);
      const backBtn = () => {
        const b = el("button", "b-back", "← BACK");
        b.type = "button";
        b.addEventListener("click", () => { sysBlip(520, 0.04); showMenu(); });
        return b;
      };
      const showMenu = () => {
        scr.innerHTML = "";
        const menu = el("div", "b-menu", "");
        [["› Contacts", showContacts], ["› Messages", showMessages], ["› Calculator", showCalc], ["› Clock", showClock], ["› Photos", showPhotos]].forEach(([label, fn]) => {
          const b = el("button", "", label);
          b.type = "button";
          b.addEventListener("click", () => { sysBlip(880, 0.04); fn(); });
          menu.append(b);
        });
        scr.append(menu);
      };
      const showContacts = () => {
        scr.innerHTML = "";
        [["mom — home", "555-0101"], ["dad — work", "555-0102"], ["sara", "555-0103 · don't call, modem!"], ["pizza hut", "555-0199"]].forEach(([n, num]) => {
          scr.append(el("div", "b-msg", `<b>${n}</b>${num}`));
        });
        scr.append(backBtn());
      };
      const showMessages = () => {
        scr.innerHTML = "";
        scr.append(
          el("div", "b-msg", "<b>mom ▲ 21:58</b>dinner's ready. PAUSE the game."),
          el("div", "b-msg", "<b>sara ▲ 22:14</b>did it finish downloading??"),
          backBtn()
        );
      };
      const showCalc = () => {
        scr.innerHTML = "";
        const disp = el("div", "calc-display", "0");
        const grid = el("div", "calc-grid", "");
        let cur = "0", acc = null, op = null, fresh = true;
        const calc = (a, b, o) => (o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b);
        const press = (k) => {
          sysBlip(700, 0.03, "square", 0.015);
          if (/[0-9]/.test(k)) { cur = fresh ? k : (cur + k).slice(0, 10); fresh = false; }
          else if (k === "C") { cur = "0"; acc = null; op = null; fresh = true; }
          else if (k === "=") {
            if (op != null && acc != null) {
              const r = calc(acc, parseFloat(cur), op);
              cur = Number.isFinite(r) ? String(Math.round(r * 1e8) / 1e8).slice(0, 10) : "E";
              acc = null; op = null; fresh = true;
            }
          } else { acc = parseFloat(cur); op = k; fresh = true; }
          disp.textContent = cur;
        };
        ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "±", "="].forEach((k) => {
          const b = el("button", "", k);
          b.type = "button";
          if ("()±.".includes(k)) b.style.opacity = "0.45";
          b.addEventListener("click", () => {
            if (k === ".") { if (!cur.includes(".")) { cur += "."; fresh = false; disp.textContent = cur; } return; }
            if (k === "±") { cur = String(-parseFloat(cur) || 0); disp.textContent = cur; return; }
            if (k === "(" || k === ")") { sysBlip(300, 0.05); return; }
            press(k);
          });
          grid.append(b);
        });
        scr.append(disp, grid, backBtn());
      };
      const showClock = () => {
        scr.innerHTML = "";
        const d = new Date();
        const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        scr.append(el("div", "", `<b style="font-size:22px">${pad(d.getHours())}:${pad(d.getMinutes())}</b><br/>${days[d.getDay()]} · battery ▂▄▆█`), backBtn());
      };
      const showPhotos = () => {
        scr.innerHTML = "";
        const img = el("img", "", "");
        img.src = PHOTOS.first.src; img.alt = PHOTOS.first.alt;
        img.style.cssText = "width:100%;border-radius:3px;filter:sepia(0.4);";
        scr.append(img, el("div", "b-msg", "<b>1/1 · aug 2003</b>16 MB card: full. obviously."), backBtn());
      };
      showMenu();
    }, { status: "battery ▂▄▆█ · signal ▂▄▆ · Snake II not included" });
  }

  /* --- digicam: dated roll, zoom, shutter click --- */
  const CAMROLL = [
    { src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=60", alt: "Bright beach on a summer afternoon", date: "AUG 2003 · OVEREXPOSED" },
    { src: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=60", alt: "Bicycle leaning against a wall", date: "JUN 2003 · ON THE WAY HOME" },
    { ...PHOTOS.first, date: "AUG 12 2003 · FLASH ON" },
    { ...PHOTOS.desk, date: "SEP 02 2003 · 21:47" },
    { ...PHOTOS.glow, date: "OCT 30 2003 · 23:47" },
  ];
  function openCamera() {
    openWindow("camera", "digicam — 16 MB card", (body) => {
      const v = el("div", "camview", "");
      const img = el("img", "", "");
      const meta = el("div", "cam-meta", "<span></span><span></span>");
      const nav = el("div", "cam-nav", "");
      const prev = el("button", "snake-start", "← PREV"); prev.type = "button";
      const zoom = el("button", "snake-start", "ZOOM"); zoom.type = "button";
      const next = el("button", "snake-start", "NEXT →"); next.type = "button";
      nav.append(prev, zoom, next);
      v.append(img, meta, nav);
      body.append(v);
      let i = 0;
      const show = () => {
        img.src = CAMROLL[i].src; img.alt = CAMROLL[i].alt;
        meta.children[0].textContent = `${i + 1} / ${CAMROLL.length}`;
        meta.children[1].textContent = CAMROLL[i].date;
        sysBlip(1200, 0.05, "square", 0.02);
      };
      prev.addEventListener("click", () => { i = (i + CAMROLL.length - 1) % CAMROLL.length; img.classList.remove("zoomed"); show(); });
      next.addEventListener("click", () => { i = (i + 1) % CAMROLL.length; img.classList.remove("zoomed"); show(); });
      zoom.addEventListener("click", () => { img.classList.toggle("zoomed"); sysBlip(700, 0.04); });
      show();
    }, { status: "1.3 MP · most of these were never meant to be seen again", wide: true });
  }

  /* --- media player: the two found songs --- */
  function openPlayer() {
    openWindow("player", "media player", (body) => {
      const now = el("p", "notepad", "♪  NOW IN THE RECEIVER:\n\n   SPACE SONG — beach house\n   MY LOVE MINE ALL MINE — mitski\n\n   picked at 2 AM. never skipped.");
      now.style.textAlign = "left";
      const row = el("div", "player-row", "");
      const s0 = el("button", "snake-start", "▶ SPACE SONG"); s0.type = "button";
      const s1 = el("button", "snake-start", "▶ MY LOVE…"); s1.type = "button";
      row.append(s0, s1);
      body.append(now, row);
      const foundSong = (i) => {
        if (musicDeck) { musicDeck.hidden = false; musicBtn?.setAttribute("aria-expanded", "true"); }
        playTrack(i);
      };
      s0.addEventListener("click", () => foundSong(0));
      s1.addEventListener("click", () => foundSong(1));
    }, { status: "two songs. both found after midnight." });
  }

  /* --- minesweeper: real game, real loss --- */
  function openMines() {
    openWindow("mines", "minesweeper", (body, rec) => {
      const N = 9, M = 10;
      const hud = el("div", "mines-hud", "<span></span><span></span>");
      const grid = el("div", "mines-grid", "");
      grid.addEventListener("contextmenu", (e) => e.preventDefault());
      const foot = el("div", "mines-foot", "");
      const restart = el("button", "snake-start", "↻ NEW GAME"); restart.type = "button";
      const flagBtn = el("button", "snake-start", "FLAG: OFF"); flagBtn.type = "button";
      foot.append(restart, flagBtn);
      body.append(hud, grid, foot);
      let board, revealed, flagged, over, won, secs, timer3, flagMode;
      const cellAt = (x, y) => grid.children[y * N + x];
      const neighbors = (x, y) => {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push([nx, ny]);
        }
        return out;
      };
      const paint = () => {
        hud.children[0].textContent = over ? "BOOM · TRY AGAIN" : won ? "CLEARED ★" : `MINES ${String(M - flagged).padStart(3, "0")}`;
        hud.children[1].textContent = `TIME ${String(Math.min(secs, 999)).padStart(3, "0")}`;
      };
      const flag = (x, y) => {
        if (over || won || revealed[y][x]) return;
        const c = cellAt(x, y);
        if (c.classList.contains("flag")) { c.classList.remove("flag"); flagged--; }
        else { c.classList.add("flag"); flagged++; sysBlip(500, 0.04); }
        paint();
      };
      const flood = (x, y) => {
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cy < 0 || cx >= N || cy >= N || revealed[cy][cx]) continue;
          const c = cellAt(cx, cy);
          if (c.classList.contains("flag")) continue;
          revealed[cy][cx] = true;
          c.classList.add("open");
          const v = board[cy][cx];
          if (v > 0) {
            c.textContent = String(v);
            c.style.color = ["", "#1c4f9c", "#2f7a4d", "#c62f2f", "#1c1c8c", "#7a1f1f", "#2f7a7a", "#111111", "#666666"][v];
          } else neighbors(cx, cy).forEach(([nx, ny]) => stack.push([nx, ny]));
        }
      };
      const dig = (x, y) => {
        if (over || won) return;
        if (flagMode) { flag(x, y); return; }
        if (revealed[y][x] || cellAt(x, y).classList.contains("flag")) return;
        if (board[y][x] === -1) {
          over = true;
          for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
            if (board[yy][xx] === -1) { const c = cellAt(xx, yy); c.classList.add("open", "boom"); c.textContent = "●"; }
          }
          paint();
          sysBlip(140, 0.3, "sawtooth", 0.05);
          return;
        }
        flood(x, y);
        sysBlip(760, 0.03, "square", 0.015);
        let open = 0;
        revealed.flat().forEach((v) => { if (v) open++; });
        if (open === N * N - M) {
          won = true;
          paint();
          sysBlip(660, 0.08); window.setTimeout(() => sysBlip(880, 0.1), 110);
        }
      };
      const newGame = () => {
        board = Array.from({ length: N }, () => Array(N).fill(0));
        revealed = Array.from({ length: N }, () => Array(N).fill(false));
        flagged = 0; over = false; won = false; secs = 0; flagMode = false;
        flagBtn.textContent = "FLAG: OFF";
        let placed = 0;
        while (placed < M) {
          const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
          if (board[y][x] !== -1) { board[y][x] = -1; placed++; }
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] === -1) continue;
          board[y][x] = neighbors(x, y).filter(([nx, ny]) => board[ny][nx] === -1).length;
        }
        grid.innerHTML = "";
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = el("button", "minecell", "");
          c.type = "button";
          c.setAttribute("aria-label", `cell ${x + 1}, ${y + 1}`);
          c.addEventListener("click", () => dig(x, y));
          c.addEventListener("contextmenu", (e) => { e.preventDefault(); flag(x, y); });
          grid.append(c);
        }
        window.clearInterval(timer3);
        timer3 = window.setInterval(() => { if (!over && !won) { secs++; paint(); } }, 1000);
        paint();
      };
      restart.addEventListener("click", () => { newGame(); sysBlip(660, 0.06); });
      flagBtn.addEventListener("click", () => {
        flagMode = !flagMode;
        flagBtn.textContent = `FLAG: ${flagMode ? "ON" : "OFF"}`;
        sysBlip(600, 0.04);
      });
      newGame();
      rec.cleanup = () => window.clearInterval(timer3);
    }, { status: "click: sweep · right-click or FLAG mode: mark · clear them all", wide: true });
  }

  /* --- memory match: pairs of small things --- */
  function openMatch() {
    openWindow("match", "MATCH.EXE — pairs", (body, rec) => {
      const hud = el("div", "mines-hud", "<span></span><span></span>");
      const grid = el("div", "match-grid", "");
      const foot = el("div", "mines-foot", "");
      const restart = el("button", "snake-start", "↻ DEAL AGAIN"); restart.type = "button";
      foot.append(restart);
      body.append(hud, grid, foot);
      const GLYPHS8 = ["♪", "☎", "⌨", "◎", "▲", "■", "●", "★"];
      let first = null, lock = false, moves = 0, found = 0, secs = 0, timer4;
      const paint = () => {
        hud.children[0].textContent = `MOVES ${moves}`;
        hud.children[1].textContent = found === 8 ? "ALL PAIRED ★" : `PAIRS ${found}/8`;
      };
      const deal = () => {
        const deck = [...GLYPHS8, ...GLYPHS8].sort(() => Math.random() - 0.5);
        grid.innerHTML = "";
        first = null; lock = false; moves = 0; found = 0; secs = 0;
        deck.forEach((g) => {
          const c = el("button", "matchcard", g);
          c.type = "button";
          c.dataset.g = g;
          c.setAttribute("aria-label", "face-down card");
          c.addEventListener("click", () => {
            if (lock || c.classList.contains("face") || c.classList.contains("done")) return;
            c.classList.add("face");
            sysBlip(700, 0.04);
            if (!first) { first = c; return; }
            moves++;
            if (first.dataset.g === c.dataset.g) {
              first.classList.add("done"); c.classList.add("done");
              first = null; found++;
              sysBlip(880, 0.07);
              if (found === 8) { paint(); sysBlip(660, 0.08); setTimeout(() => sysBlip(990, 0.12), 120); return; }
            } else {
              lock = true;
              const a = first; first = null;
              setTimeout(() => { a.classList.remove("face"); c.classList.remove("face"); lock = false; }, 650);
            }
            paint();
          });
          grid.append(c);
        });
        window.clearInterval(timer4);
        timer4 = window.setInterval(() => { secs++; }, 1000);
        paint();
      };
      restart.addEventListener("click", () => { deal(); sysBlip(660, 0.06); });
      deal();
      rec.cleanup = () => window.clearInterval(timer4);
    }, { status: "find the pairs · they were always in pairs", wide: true });
  }

  /* --- control panel: wallpaper, tone, about --- */
  const WALLPAPERS = [
    { n: "phosphor grid", u: null },
    { n: "everyone had this one", u: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=55" },
    { n: "hall C after hours", u: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=55" },
  ];
  function openControl() {
    openWindow("control", "control panel", (body) => {
      body.append(el("p", "notepad", "DISPLAY + SOUND. careful with both."));
      const wp = el("div", "", "");
      wp.append(el("p", "ctl-note", "WALLPAPER:"));
      const row = el("div", "ctl-row", "");
      WALLPAPERS.forEach((w, i) => {
        const b = el("button", "snake-start", w.n);
        b.type = "button";
        b.addEventListener("click", () => {
          const wall = document.querySelector(".wallpaper");
          if (wall) {
            wall.style.backgroundImage = w.u ? `linear-gradient(rgba(6,10,8,0.45), rgba(6,10,8,0.45)), url("${w.u}")` : "";
            wall.style.backgroundSize = "cover";
            wall.style.backgroundPosition = "center";
          }
          row.querySelectorAll("button").forEach((o) => o.classList.remove("is-active"));
          b.classList.add("is-active");
          sysBlip(740, 0.05);
        });
        if (i === 0) b.classList.add("is-active");
        row.append(b);
      });
      wp.append(row);
      const mins = Math.floor((Date.now() - t0) / 60000);
      const about = el("p", "ctl-note", `CA-2001 · FAMILY EDITION · this session: ${mins} min · uptime: 23 years · everything still works.`);
      body.append(wp, about);
    }, { status: "if it ain't broke, personalize it" });
  }

  /* --- paint: every masterpiece starts unsaved --- */
  function openPaint() {
    openWindow("paint", "untitled (3).bmp — paint", (body, rec) => {
      const tools = el("div", "paint-tools", "");
      const colors = ["#14171a", "#c62f2f", "#1c4f9c", "#2f7a4d", "#e8a13c", "#f2f4f6"];
      let color = colors[0];
      colors.forEach((c, i) => {
        const s = el("button", "swatch" + (i === 0 ? " is-active" : ""), "");
        s.type = "button";
        s.style.background = c;
        s.setAttribute("aria-label", `color ${c}`);
        s.addEventListener("click", () => {
          color = c;
          tools.querySelectorAll(".swatch").forEach((o) => o.classList.remove("is-active"));
          s.classList.add("is-active");
          sysBlip(700, 0.03, "square", 0.015);
        });
        tools.append(s);
      });
      const clear = el("button", "paint-btn", "CLEAR");
      clear.type = "button";
      const setWall = el("button", "paint-btn", "SET AS WALLPAPER");
      setWall.type = "button";
      tools.append(clear, setWall);
      const cv = el("canvas", "", "");
      cv.id = "paintCanvas";
      cv.width = 400; cv.height = 260;
      body.append(tools, cv);
      const pctx = cv.getContext("2d");
      pctx.fillStyle = "#ffffff"; pctx.fillRect(0, 0, 400, 260);
      pctx.lineCap = "round"; pctx.lineJoin = "round"; pctx.lineWidth = 4;
      let drawing = false, lx = 0, ly = 0;
      const pos = (e) => {
        const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) * (400 / r.width), (e.clientY - r.top) * (260 / r.height)];
      };
      cv.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        [lx, ly] = pos(e);
        drawing = true;
      });
      cv.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const [x, y] = pos(e);
        pctx.strokeStyle = color;
        pctx.beginPath(); pctx.moveTo(lx, ly); pctx.lineTo(x, y); pctx.stroke();
        lx = x; ly = y;
      });
      const stop = () => { drawing = false; };
      cv.addEventListener("pointerup", stop);
      cv.addEventListener("pointercancel", stop);
      clear.addEventListener("click", () => {
        pctx.fillStyle = "#ffffff"; pctx.fillRect(0, 0, 400, 260);
        sysBlip(440, 0.05);
      });
      setWall.addEventListener("click", () => {
        const wall = document.querySelector(".wallpaper");
        if (wall) {
          wall.style.backgroundImage = `url("${cv.toDataURL("image/png")}")`;
          wall.style.backgroundSize = "cover";
          wall.style.backgroundPosition = "center";
          sysBlip(880, 0.09);
        }
      });
      void rec;
    }, { status: "a masterpiece. unsaved, obviously." });
  }

  /* --- konami basement: up up down down, you knew --- */
  const FOLDERS_BASEMENT = {
    title: "basement",
    status: "you were never supposed to find this",
    files: [
      ["the_list.txt", "txt", "1 KB", () => openText("tx-list", "the_list.txt", "EVERY HIDING SPOT, RANKED:\n\n1. behind the save files\n2. inside thekonami code\n3. the lake. don't tell.")],
      ["the_spot.png", "img", "900 KB", () => openPhoto("ph-spot", "the_spot.png", { src: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=60", alt: "Still lake under a wide sky", cap: "the spot. don't tell." })],
      ["how_to_get_here.txt", "txt", "1 KB", () => openText("tx-how", "how_to_get_here.txt", "up up down down left right left right b a.\n\nyou knew.")],
    ],
  };
  let basementFound = false;
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiPos = 0;
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
    konamiPos = e.key === KONAMI[konamiPos] ? konamiPos + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      if (basementFound || !deskIcons) return;
      basementFound = true;
      FOLDERS.basement = FOLDERS_BASEMENT;
      addIcon({ id: "basement", label: "basement", kind: "hid", run: () => openFolder("basement") });
      sysBlip(523, 0.1); setTimeout(() => sysBlip(659, 0.1), 110); setTimeout(() => sysBlip(784, 0.16), 220);
      openFolder("basement");
    }
  });

  /* --- icons, start menu, clock --- */
  const ICONS = [
    { id: "photos", label: "my photos", kind: "img", run: () => openFolder("photos") },
    { id: "music", label: "music", kind: "app", run: () => openFolder("music") },
    { id: "games", label: "games", kind: "app", run: () => openFolder("games") },
    { id: "browser", label: "browser", kind: "app", run: () => openBrowser() },
    { id: "messages", label: "messages", kind: "txt", run: () => openChat() },
    { id: "notebook", label: "notebook", kind: "txt", run: () => openFolder("notebook") },
    { id: "phone", label: "brick phone", kind: "app", run: () => openPhone() },
    { id: "camera", label: "digicam", kind: "img", run: () => openCamera() },
    { id: "player", label: "media player", kind: "app", run: () => openPlayer() },
    { id: "mines", label: "minesweeper", kind: "app", run: () => openMines() },
    { id: "match", label: "pairs", kind: "app", run: () => openMatch() },
    { id: "downloads", label: "downloads", kind: "txt", run: () => openFolder("downloads") },
    { id: "school", label: "school", kind: "txt", run: () => openFolder("school") },
    { id: "videos", label: "videos", kind: "img", run: () => openFolder("videos") },
    { id: "paint", label: "paint", kind: "app", run: () => openPaint() },
    { id: "control", label: "control panel", kind: "app", run: () => openControl() },
    { id: "bin", label: "recycle bin", kind: "txt", run: () => openBin() },
    { id: "summer", label: "summer_2003", kind: "hid", run: () => openFolder("summer") },
  ];
  const GLYPHS = { img: "IMG", app: "▶", txt: "≡", hid: "?" };
  function addIcon(ic) {
    if (!deskIcons || deskIcons.querySelector(`[data-icon="${ic.id}"]`)) return;
    const b = el("button", "icon", `<span class="glyph">${GLYPHS[ic.kind] || "▤"}</span><span></span>`);
    b.type = "button";
    b.dataset.kind = ic.kind;
    b.dataset.icon = ic.id;
    b.setAttribute("role", "listitem");
    b.children[1].textContent = ic.label;
    b.addEventListener("click", ic.run);
    b.addEventListener("dblclick", ic.run);
    deskIcons.append(b);
  }
  if (deskIcons) {
    ICONS.forEach(addIcon);
  }
  const START_ITEMS = [
    ["my photos", () => openFolder("photos")],
    ["music", () => openFolder("music")],
    ["games", () => openFolder("games")],
    ["browser", () => openBrowser()],
    ["messages", () => openChat()],
    ["notebook", () => openFolder("notebook")],
    ["brick phone", () => openPhone()],
    ["digicam", () => openCamera()],
    ["media player", () => openPlayer()],
    ["paint", () => openPaint()],
    ["control panel", () => openControl()],
  ];
  if (startMenu) {
    const head = el("header", "", "you · home computer");
    startMenu.append(head);
    START_ITEMS.forEach(([label, fn]) => {
      const b = el("button", "", `▸ ${label}`);
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.addEventListener("click", () => { toggleStart(false); fn(); });
      startMenu.append(b);
    });
    const shut = el("button", "", "⏻ shut down…");
    shut.type = "button"; shut.setAttribute("role", "menuitem");
    shut.addEventListener("click", () => {
      toggleStart(false);
      sysBlip(180, 0.2, "sawtooth", 0.04);
      openText("tx-no", "system", "no.\n\nnot yet.");
    });
    startMenu.append(shut);
    const foot = el("footer", "", "uptime: 23 years · still warm");
    startMenu.append(foot);
  }
  function toggleStart(force) {
    if (!startMenu || !startBtn) return;
    const show = force != null ? force : startMenu.hidden;
    startMenu.hidden = !show;
    startBtn.setAttribute("aria-expanded", String(show));
    if (show) sysBlip(520, 0.05);
  }
  startBtn?.addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });
  document.addEventListener("click", (e) => {
    if (startMenu && !startMenu.hidden && !e.target.closest(".startmenu") && !e.target.closest(".startbtn")) toggleStart(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && startMenu && !startMenu.hidden) toggleStart(false); });
  if (deskClock) {
    const tickDesk = () => {
      const d = new Date();
      deskClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    tickDesk();
    window.setInterval(tickDesk, 5000);
  }
  // first-visit startup chord — only if audio is already unlocked by a gesture
  let deskGreeted = false;
  if ("IntersectionObserver" in window && pcscreen) {
    const go = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !deskGreeted) {
          deskGreeted = true;
          go.disconnect();
          // POST card first (click to skip), then the startup chord if audio is unlocked
          const bootChord = () => {
            try {
              if (actx && actx.state === "running") { sysBlip(523, 0.12, "sine", 0.04); setTimeout(() => sysBlip(784, 0.16, "sine", 0.04), 140); }
            } catch { /* silent */ }
          };
          if (deskPost) {
            deskPost.hidden = false;
            let postDone = false;
            const hidePost = () => {
              if (postDone) return;
              postDone = true;
              deskPost.hidden = true;
              bootChord();
            };
            deskPost.addEventListener("click", hidePost, { once: true });
            window.setTimeout(hidePost, 2600);
          } else bootChord();
          // one notification, a little later: someone is online
          window.setTimeout(() => {
            if (deskToast && deskToast.hidden) {
              deskToast.hidden = false;
              sysBlip(990, 0.07);
              window.setTimeout(() => { if (deskToast) deskToast.hidden = true; }, 14000);
            }
          }, 8000);
        }
      });
    }, { threshold: 0.3 });
    go.observe(pcscreen);
  }

  document.querySelector("#deskToastBtn")?.addEventListener("click", () => {
    if (deskToast) deskToast.hidden = true;
    openChat();
  });
  document.querySelector("#deskToastX")?.addEventListener("click", () => {
    if (deskToast) deskToast.hidden = true;
  });
  netIco?.addEventListener("click", () => {
    BROWSER.hist = [];
    BROWSER.page = "forum";
    openBrowser();
  });

  /* --- mixtape bridge --- */
  document.querySelector("#playFoundSong")?.addEventListener("click", () => {
    if (musicDeck) { musicDeck.hidden = false; musicBtn?.setAttribute("aria-expanded", "true"); }
    songPlay?.click();
  });

  /* ---------- 15. IMAGE FALLBACKS ---------- */
  $$("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.opacity = "0";
      const holder = img.closest("figure, button, .screen, .room-full");
      if (holder) holder.style.background = "linear-gradient(135deg,#1a2226,#0d1418 60%,#1a1410)";
    }, { once: true });
  });
})();
