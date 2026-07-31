const cursor = document.getElementById("cursor");
const ring = document.getElementById("cursor-ring");
if (cursor && ring) {
  document.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
    setTimeout(() => {
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
    }, 60);
  });
}

const nav = document.getElementById("mainNav");
if (nav) {
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });

  function setNavOpen(open) {
    nav.classList.toggle("nav-open", open);
    document.body.classList.toggle("nav-menu-open", open);
    const toggle = nav.querySelector(".nav-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }

  if (!nav.querySelector(".nav-toggle")) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "main-nav-links");
    toggle.innerHTML =
      '<span class="nav-toggle__box" aria-hidden="true">' +
      '<span class="nav-toggle__bar"></span>' +
      '<span class="nav-toggle__bar"></span>' +
      '<span class="nav-toggle__bar"></span>' +
      "</span>";

    const links = nav.querySelector(".nav-links");
    if (links && !links.id) links.id = "main-nav-links";

    const logo = nav.querySelector(".nav-logo");
    if (logo && logo.nextSibling) {
      nav.insertBefore(toggle, logo.nextSibling);
    } else {
      nav.appendChild(toggle);
    }

    toggle.addEventListener("click", () => {
      setNavOpen(!nav.classList.contains("nav-open"));
    });

    nav.querySelectorAll(".nav-links a, .nav-cta").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNavOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) setNavOpen(false);
    });
  }
}

function initReveal() {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      });
    },
    { threshold: 0.12 }
  );
  reveals.forEach((el) => observer.observe(el));
}
initReveal();

function animateNumbers() {
  document.querySelectorAll(".stat-num").forEach((el) => {
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.transition = "opacity 0.5s ease";
      el.style.opacity = "1";
    }, 400);
  });
}
animateNumbers();
