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
})();
