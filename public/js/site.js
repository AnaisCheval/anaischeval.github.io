// Small progressive enhancements. The site works without this file.

// Muted looping clips (cards and figures) play only while on screen, so the
// browser downloads a video only when someone scrolls to it.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (isIntersecting && !video.dataset.userPaused) video.play().catch(() => {});
      else if (!isIntersecting && !video.paused) video.pause();
    }
  }, { rootMargin: "200px 0px" });
  for (const video of document.querySelectorAll("video[data-autoplay]")) {
    observer.observe(video);
    // Respect a pause from the video controls.
    video.addEventListener("pause", () => {
      if (document.visibilityState === "visible" && video.matches(":hover, :focus-within")) video.dataset.userPaused = "1";
    });
    video.addEventListener("play", () => delete video.dataset.userPaused);
  }
}

// Light/dark theme button. A stored choice is applied in <head> (base.liquid) before the page paints.
// Choosing the same theme as the system setting clears the choice, so the page follows the system again.
document.querySelector(".theme-toggle")?.addEventListener("click", () => {
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const nowDark = root.dataset.theme ? root.dataset.theme === "dark" : systemDark;
  const next = nowDark ? "light" : "dark";
  try {
    if ((next === "dark") === systemDark) localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch {}
  if ((next === "dark") === systemDark) delete root.dataset.theme;
  else root.dataset.theme = next;
});

document.addEventListener("click", async (event) => {
  // Abstract / BibTeX panels on the publications page.
  const toggle = event.target.closest("button.toggle");
  if (toggle) {
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    return;
  }

  // Copy BibTeX.
  const button = event.target.closest("button.copy");
  if (!button) return;
  const text = document.querySelector(button.dataset.copy).textContent;
  const label = button.querySelector("span");
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = "Copied";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(button.dataset.copy));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    label.textContent = "Press Ctrl+C";
  }
  setTimeout(() => (label.textContent = "Copy"), 2000);
});
