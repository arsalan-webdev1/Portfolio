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

// Build a project card from one project object
function renderProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = projects.map((p) => `
    <article class="project glass" data-reveal>
      <div class="preview">
        <div class="mock" aria-hidden="true"><i></i><i></i><i></i><div></div></div>
        ${p.image ? `<img src="${p.image}" alt="${p.name} preview" onerror="this.remove()">` : ""}
      </div>
      <div class="p-body">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        ${p.tags && p.tags.length ? `<div class="p-tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>` : ""}
        <div class="p-actions">
          ${p.live ? `<a class="btn btn-primary" href="${p.live}" target="_blank" rel="noopener">Live Project ↗</a>` : ""}
          ${p.repo ? `<a class="btn btn-ghost" href="${p.repo}" target="_blank" rel="noopener">GitHub</a>` : ""}
        </div>
      </div>
    </article>`).join("");
}
renderProjects();

// ===== Mobile menu =====
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
function setMenu(open) {
  navLinks.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
}
burger.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// ===== Scroll reveal =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

// ===== Active nav link =====
const links = [...navLinks.querySelectorAll('a[href^="#"]')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

// ===== Profile image fallback (shows an initial if images/image.png is missing) =====
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
