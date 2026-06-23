/* ============================================================
   THE DRIFT HOUSE — interactions
   ============================================================ */
(function () {
  "use strict";

  const nav = document.getElementById("nav");
  const skyDusk = document.querySelector(".sky-dusk");
  const skyNight = document.querySelector(".sky-night");
  const stars = document.querySelector(".stars");

  /* ---------- Scroll: nav state + sun sets as you scroll ---------- */
  function onScroll() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = docH > 0 ? y / docH : 0; // 0 (top) -> 1 (bottom)

    nav.classList.toggle("scrolled", y > 60);

    // Sunset -> dusk -> night across the page scroll.
    // Dusk fades in over the first ~55% of the page, peaks mid.
    const dusk = clamp((p - 0.05) / 0.45, 0, 1);
    // Night fades in over the last ~55%.
    const night = clamp((p - 0.45) / 0.5, 0, 1);
    skyDusk.style.opacity = dusk.toFixed(3);
    skyNight.style.opacity = night.toFixed(3);
    stars.style.opacity = clamp((p - 0.55) / 0.4, 0, 1).toFixed(3);
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    // small stagger for grouped elements
    el.style.transitionDelay = (Math.min(i % 6, 5) * 0.06) + "s";
    io.observe(el);
  });

  /* ---------- 3D tilt cards (cocktails + gift card) ---------- */
  const tiltEls = document.querySelectorAll("[data-tilt]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    tiltEls.forEach((card) => {
      const inner = card.querySelector(".tilt-inner") || card.querySelector(".gift-card-face") || card.firstElementChild;
      card.addEventListener("pointermove", (ev) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;   // 0..1
        const py = (ev.clientY - r.top) / r.height;   // 0..1
        const rotY = (px - 0.5) * 16;
        const rotX = (0.5 - py) * 16;
        if (inner) {
          inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
          inner.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          inner.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        }
      });
      card.addEventListener("pointerleave", () => {
        if (inner) inner.style.transform = "";
      });
    });
  }

  /* ---------- Gift card amount chips ---------- */
  document.querySelectorAll(".gift-amounts .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".gift-amounts .chip").forEach((c) => c.classList.remove("chip-on"));
      chip.classList.add("chip-on");
    });
  });

  /* ---------- Reservation form ---------- */
  const form = document.getElementById("reserveForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const note = document.getElementById("formNote");
      note.hidden = false;
      form.querySelector("button[type=submit]").textContent = "Reservation Requested ✓";
      form.querySelectorAll("input,select,button").forEach((el) => { if (el.type !== "submit") el.disabled = true; });
    });
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("navBurger");
  if (burger) {
    const menu = document.createElement("div");
    menu.className = "mobile-menu";
    menu.innerHTML = `
      <a href="#menu">Menu</a>
      <a href="#cocktails">Cocktails</a>
      <a href="#events">Events</a>
      <a href="#catering">Catering</a>
      <a href="#giftcard">Gift Card</a>
      <a href="#visit">Visit</a>
      <a href="#reserve" class="btn btn-beacon btn-lg">Reserve a Table</a>`;
    document.body.appendChild(menu);
    const toggle = () => menu.classList.toggle("open");
    burger.addEventListener("click", toggle);
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  /* ---------- Ambient coastal soundscape (synthesized, no files) ----------
     Web Audio: filtered noise for ocean waves with a slow swell,
     plus a soft low pad for warmth. Built only after user opt-in. */
  const soundBtn = document.getElementById("soundToggle");
  let audioCtx = null, master = null, running = false;

  function buildSoundscape(ctx) {
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    // --- Ocean: pink-ish noise through a moving low-pass ---
    const bufSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf; noise.loop = true;

    const surf = ctx.createBiquadFilter();
    surf.type = "lowpass"; surf.frequency.value = 600; surf.Q.value = 0.6;

    const surfGain = ctx.createGain(); surfGain.gain.value = 0.9;
    noise.connect(surf); surf.connect(surfGain); surfGain.connect(master);

    // Slow wave "swell": LFO modulates the filter cutoff + volume
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 380;
    lfo.connect(lfoGain); lfoGain.connect(surf.frequency);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.07;
    const lfo2Gain = ctx.createGain(); lfo2Gain.gain.value = 0.35;
    lfo2.connect(lfo2Gain); lfo2Gain.connect(surfGain.gain);

    // --- Warm low pad (muffled-room warmth) ---
    const padGain = ctx.createGain(); padGain.gain.value = 0.035;
    const padFilt = ctx.createBiquadFilter(); padFilt.type = "lowpass"; padFilt.frequency.value = 320;
    [98, 147, 196].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.5 : 0.25;
      o.connect(g); g.connect(padFilt); o.start();
    });
    padFilt.connect(padGain); padGain.connect(master);

    noise.start(); lfo.start(); lfo2.start();
    return master;
  }

  function startSound() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      buildSoundscape(audioCtx);
    }
    audioCtx.resume();
    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.setTargetAtTime(0.5, audioCtx.currentTime, 1.2);
    running = true;
    soundBtn.classList.add("on");
  }
  function stopSound() {
    if (!master) return;
    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.6);
    running = false;
    soundBtn.classList.remove("on");
  }
  if (soundBtn) {
    soundBtn.addEventListener("click", () => { running ? stopSound() : startSound(); });
  }
})();
