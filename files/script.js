document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

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

  const revealPortfolio = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("ready");
    if (welcomeOverlay) {
      welcomeOverlay.classList.add("hidden");
      setTimeout(() => welcomeOverlay.remove(), 900);
    }
  };

  if (reducedMotion) revealPortfolio();
  else setTimeout(revealPortfolio, 1800);

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
    progressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    backToTop.classList.toggle("visible", window.scrollY > 320);
    nav.classList.toggle("scrolled", window.scrollY > 12);
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
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

  // ===== Timeline: nodes + cards activate one by one while scrolling =====
  const tItems = document.querySelectorAll(".t-item");
  if (tItems.length && !reducedMotion) {
    const timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); timelineObserver.unobserve(e.target); } });
    }, { threshold: 0.35 });
    tItems.forEach((item) => timelineObserver.observe(item));
  } else {
    tItems.forEach((item) => item.classList.add("in"));
  }

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

  // ===== Desktop-only pointer effects =====
  if (!coarsePointer && !reducedMotion) {
    // Mouse-reactive ambient glow (very small offsets; CSS eases the motion)
    let glowX = 0, glowY = 0, glowScheduled = false;
    window.addEventListener("pointermove", (event) => {
      glowX = (event.clientX / window.innerWidth - 0.5) * 10;
      glowY = (event.clientY / window.innerHeight - 0.5) * 8;
      if (!glowScheduled) {
        glowScheduled = true;
        requestAnimationFrame(() => {
          glowScheduled = false;
          document.documentElement.style.setProperty("--px", glowX.toFixed(2));
          document.documentElement.style.setProperty("--py", glowY.toFixed(2));
        });
      }
    }, { passive: true });

    // Magnetic pull on primary CTAs (max ~5px, smooth return via CSS transition)
    const magnets = [...document.querySelectorAll(".btn-primary, .nav-gh")];
    let mx = 0, my = 0, magnetScheduled = false;
    const applyMagnets = () => {
      magnetScheduled = false;
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
    window.addEventListener("pointermove", (event) => {
      mx = event.clientX; my = event.clientY;
      if (!magnetScheduled) { magnetScheduled = true; requestAnimationFrame(applyMagnets); }
    }, { passive: true });

    // Subtle 3D tilt (max ~4deg) on the portrait + featured project cards
    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const r = card.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width;
        const py = (event.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${((px - 0.5) * 8).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - py) * 8).toFixed(2)}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
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
        ${p.image ? `<img src="${p.image}" alt="${p.name} preview" onerror="this.remove()">` : ""}
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
