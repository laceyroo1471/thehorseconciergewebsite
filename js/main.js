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
