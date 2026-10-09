document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches; // mouse/trackpad/pen available

  // ===== Cinematic welcome intro → reveal the existing portfolio =====
  const ensureWelcomeOverlay = () => {
    let welcomeOverlay = document.getElementById("welcomeOverlay");
    if (!welcomeOverlay) {
      welcomeOverlay = document.createElement("div");
      welcomeOverlay.id = "welcomeOverlay";
      welcomeOverlay.className = "welcome-overlay";
      welcomeOverlay.setAttribute("aria-live", "polite");
      welcomeOverlay.setAttribute("aria-label", "Welcome");
      welcomeOverlay.innerHTML = `
        <span class="welcome-orb orb-1" aria-hidden="true"></span>
        <span class="welcome-orb orb-2" aria-hidden="true"></span>
        <span class="welcome-orb orb-3" aria-hidden="true"></span>
        <div class="welcome-word" aria-label="Welcome">Welcome.</div>
      `;
      document.body.insertBefore(welcomeOverlay, document.body.firstChild);
    }
    return welcomeOverlay;
  };

  const welcomeOverlay = ensureWelcomeOverlay();
  document.body.classList.add("is-loading"); // locks scrolling while the intro plays

  // Sequence (ms): welcome in -> brief hold -> exit -> portfolio reveal.
  // Reduced motion keeps the welcome screen but shortens it and drops movement (see CSS).
  const T = reducedMotion
    ? { exit: 1100, reveal: 1400 }
    : { exit: 1700, reveal: 2100 };
  const FAILSAFE_MS = 4000; // portfolio always becomes accessible, even if something fails
  const introTimers = [];
  let revealed = false;
  let onReady = null; // set below: reveals anything already in/above the viewport
  const isReady = () => document.body.classList.contains("ready");

  const exitIntro = () => welcomeOverlay.classList.add("hidden"); // fades overlay + word out

  const revealPortfolio = () => {
    if (revealed) return; // idempotent: no duplicate reveals
    revealed = true;
    introTimers.forEach(clearTimeout);
    exitIntro();
    document.body.classList.remove("is-loading"); // scrolling returns; nav + main fade in (CSS)
    document.body.classList.add("ready");         // hero stagger starts
    if (onReady) onReady();                       // deep links / restored scroll positions
    setTimeout(() => welcomeOverlay.remove(), 800);
  };

  introTimers.push(setTimeout(exitIntro, T.exit));
  introTimers.push(setTimeout(revealPortfolio, T.reveal));
  introTimers.push(setTimeout(revealPortfolio, FAILSAFE_MS));

  // ===== Projects (render before observers so cards are included) =====
  renderProjects();
  document.querySelectorAll("#projectList .project").forEach((card, i) => {
    card.style.setProperty("--d", `${(i * 0.08).toFixed(2)}s`); // staggered entrance
  });

  // ===== Stagger index for skill/technology pills =====
  document.querySelectorAll(".pills").forEach((ul) => {
    [...ul.children].forEach((li, i) => li.style.setProperty("--i", i));
  });

  // ===== One rAF-throttled scroll handler: progress bar, nav state, timeline line =====
  const progressFill = document.getElementById("scrollProgressFill");
  const backToTop = document.getElementById("backToTop");
  const nav = document.querySelector(".nav");
  const timeline = document.querySelector(".timeline");
  let scrollScheduled = false;
  const updateOnScroll = () => {
    scrollScheduled = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    progressFill.style.transform = `scaleX(${progress.toFixed(4)})`; // compositor-only
    backToTop.classList.toggle("visible", window.scrollY > 320);
    nav.classList.toggle("scrolled", window.scrollY > 12);
    if (onReady && isReady()) onReady();
    // Timeline line "draws" itself while the section passes through the viewport
    if (timeline && !reducedMotion) {
      const rect = timeline.getBoundingClientRect();
      const fill = (window.innerHeight * 0.8 - rect.top) / rect.height;
      timeline.style.setProperty("--fill", Math.min(Math.max(fill, 0), 1).toFixed(4));
    }
  };
  const scheduleScrollUpdate = () => {
    if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateOnScroll); }
  };
  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener("resize", scheduleScrollUpdate);
  updateOnScroll();

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ===== Mobile menu =====
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  const setMenu = (open) => {
    navLinks.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
  };
  burger.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ===== Scroll reveal (group stagger via --d set in HTML/above) =====
  // Track pending elements in Sets so the safety sweep below can bail out instantly
  // once everything is revealed (it used to re-query the whole DOM every scroll frame).
  const pendingReveals = new Set(document.querySelectorAll("[data-reveal]"));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && isReady()) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
        pendingReveals.delete(e.target);
      }
    });
  }, { threshold: 0.15 });
  pendingReveals.forEach((el) => revealObserver.observe(el));

  // ===== Timeline: nodes + cards activate one by one while scrolling =====
  // (also used with reduced motion: CSS strips the movement, leaving a simple fade)
  const tItems = document.querySelectorAll(".t-item");
  const pendingItems = new Set(tItems);
  const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && isReady()) {
        e.target.classList.add("in");
        timelineObserver.unobserve(e.target);
        pendingItems.delete(e.target);
      }
    });
  }, { threshold: 0.35 });
  tItems.forEach((item) => timelineObserver.observe(item));

  // ===== Safety net: observers only report threshold *crossings*, so anything skipped by a fast
  // scroll, anchor jump, refresh mid-page or resize would stay hidden. Reveal whatever is in or
  // above the viewport. Throttled to 180ms and skipped entirely once nothing is pending, so it
  // never competes with the scroll timeline for frame budget.
  let lastSweep = 0;
  const sweepReveals = (force = false) => {
    if (!pendingReveals.size && !pendingItems.size) { onReady = null; return; }
    const now = performance.now();
    if (!force && now - lastSweep < 180) return;
    lastSweep = now;
    const edge = window.innerHeight - 80;
    const passed = (el) => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top < edge; };
    pendingReveals.forEach((el) => {
      if (passed(el)) { el.classList.add("visible"); revealObserver.unobserve(el); pendingReveals.delete(el); }
    });
    pendingItems.forEach((el) => {
      if (passed(el)) { el.classList.add("in"); timelineObserver.unobserve(el); pendingItems.delete(el); }
    });
  };
  onReady = () => sweepReveals(true);
  if (isReady()) sweepReveals(true);

  // ===== Active nav link + sliding indicator + per-section background mood =====
  const links = [...navLinks.querySelectorAll('a[href^="#"]')];
  const navInd = document.createElement("li");
  navInd.className = "nav-ind";
  navInd.setAttribute("aria-hidden", "true");
  navLinks.prepend(navInd);
  let activeLink = null;
  const moveIndicator = () => {
    if (!activeLink || activeLink.offsetWidth === 0) { navInd.classList.remove("on"); return; }
    navInd.style.width = `${activeLink.offsetWidth}px`;
    navInd.style.height = `${activeLink.offsetHeight}px`;
    navInd.style.transform = `translate(${activeLink.offsetLeft}px, ${activeLink.offsetTop}px)`;
    navInd.classList.add("on");
  };
  const setActive = (id) => {
    const next = links.find((l) => l.getAttribute("href") === `#${id}`) || null;
    if (next === activeLink) return;
    links.forEach((l) => l.classList.toggle("active", l === next));
    activeLink = next;
    moveIndicator();
  };
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      setActive(e.target.id);
      if (e.target.id === "home") delete document.body.dataset.mood;
      else document.body.dataset.mood = e.target.id; // shifts ambient glow colors
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));
  window.addEventListener("resize", moveIndicator);
  // Font loading can shift link widths after first paint — re-align the pill once fonts settle.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

  // ===== Desktop-only pointer effects =====
  if (hasFinePointer && !reducedMotion) {
    // Single pointermove listener drives BOTH the ambient glow and the magnetic buttons,
    // inside one rAF loop. The glow eases toward its target with a lerp (buttery trailing
    // motion with no CSS transition fighting it), and the loop stops when it settles —
    // no competing animation loops, no work while the pointer is idle.
    const root = document.documentElement;
    const magnets = [...document.querySelectorAll(".btn-primary, .nav-gh")];

    let mx = 0, my = 0;              // raw pointer position
    let tx = 0, ty = 0;              // glow target (pointer-derived)
    let cx = 0, cy = 0;              // glow current (eased)
    let magnetsDirty = false;        // pointer moved since magnets were last applied
    let rafId = 0;

    const applyMagnets = () => {
      magnets.forEach((btn) => {
        const r = btn.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const range = Math.max(r.width, r.height) / 2 + 36;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < range) {
          const pull = (1 - dist / range) * 5;
          btn.style.setProperty("--mx", `${((dx / dist) * pull).toFixed(1)}px`);
          btn.style.setProperty("--my", `${((dy / dist) * pull).toFixed(1)}px`);
        } else {
          btn.style.setProperty("--mx", "0px");
          btn.style.setProperty("--my", "0px");
        }
      });
    };

    const frame = () => {
      rafId = 0;
      // Ease the glow toward the pointer target; 0.14/frame ≈ soft, premium trailing.
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      root.style.setProperty("--px", cx.toFixed(2));
      root.style.setProperty("--py", cy.toFixed(2));
      if (magnetsDirty) { magnetsDirty = false; applyMagnets(); }
      const settled = Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05 && !magnetsDirty;
      if (!settled) rafId = requestAnimationFrame(frame); // idle = zero rAF work
    };

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      mx = event.clientX;
      my = event.clientY;
      tx = (mx / window.innerWidth - 0.5) * 10;
      ty = (my / window.innerHeight - 0.5) * 8;
      magnetsDirty = true;
      if (!rafId) rafId = requestAnimationFrame(frame);
    }, { passive: true });

    // Subtle 3D tilt (max ~4deg) on the portrait + featured project cards.
    // Each card applies its transform at most once per frame, so rapid pointer
    // movement never queues more writes than the compositor can consume.
    document.querySelectorAll(".tilt-card").forEach((card) => {
      let raf = 0, nx = 0, ny = 0;
      const apply = () => {
        raf = 0;
        card.style.setProperty("--ry", `${(nx * 8).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${(-ny * 8).toFixed(2)}deg`);
      };
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const r = card.getBoundingClientRect();
        nx = (event.clientX - r.left) / r.width - 0.5;
        ny = (event.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      const reset = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      };
      card.addEventListener("pointerleave", reset);
      card.addEventListener("pointercancel", reset);
    });
  }

  // ===== Profile image fallback (shows an initial if the image is missing) =====
  const img = document.getElementById("profileImg");
  const portrait = document.getElementById("portrait");
  const showFallback = () => portrait.classList.add("no-img");
  img.addEventListener("error", showFallback);
  if (img.complete && img.naturalWidth === 0) showFallback();

  // ===== UI-only contact form =====
  document.getElementById("demoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("formNote").style.color = "var(--cyan)";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
});

// ===== PROJECT DATA — add another project by adding another object =====
// image: path to a preview image (optional). repo: GitHub link (optional, button hidden if empty).
const projects = [
  {
    name: "Candy Brand",
    description: "A live brand website, built and deployed as one of my first real projects.",
    live: "https://candybrand.netlify.app/",
    repo: "",
    image: "images/candybrand.png",
    tags: [] // add tags only when known, e.g. ["HTML", "CSS"]
  }
];

// Build a project card from one project object (arrow wrapped in .arrow so it animates on hover)
function renderProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = projects.map((p) => `
    <article class="project glass tilt-card" data-reveal>
      <div class="preview">
        <div class="mock" aria-hidden="true"><i></i><i></i><i></i><div></div></div>
        ${p.image ? `<img src="${p.image}" alt="${p.name} preview" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
      </div>
      <div class="p-body">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        ${p.tags && p.tags.length ? `<div class="p-tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>` : ""}
        <div class="p-actions">
          ${p.live ? `<a class="btn btn-primary" href="${p.live}" target="_blank" rel="noopener">Live Project <span class="arrow">↗</span></a>` : ""}
          ${p.repo ? `<a class="btn btn-ghost" href="${p.repo}" target="_blank" rel="noopener">GitHub</a>` : ""}
        </div>
      </div>
    </article>`).join("");
}