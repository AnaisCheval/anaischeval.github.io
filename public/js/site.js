// Small progressive enhancements. The site works without this file.

// Muted looping clips (cards and figures) play only while on screen, so the
// browser downloads a video only when someone scrolls to it.
// On touch screens, the browser shows the controls over a clip most of the time: there they appear
// only after a tap on the video (or if the browser blocks autoplay, as an iPhone in Low Power Mode).
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none)").matches;
if (!reducedMotion && "IntersectionObserver" in window) {
  const showControls = (video) => { if (video.dataset.tapControls) video.controls = true; };
  const observer = new IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (isIntersecting && !video.dataset.userPaused) {
        video.play().catch((error) => { if (error.name === "NotAllowedError") showControls(video); });
      } else if (!isIntersecting && !video.paused) video.pause();
    }
  }, { rootMargin: "200px 0px" });
  for (const video of document.querySelectorAll("video[data-autoplay]")) {
    if (touch && video.controls) {
      video.controls = false;
      video.dataset.tapControls = "1";
      video.addEventListener("click", () => showControls(video), { once: true });
    }
    observer.observe(video);
    // Respect a pause from the video controls.
    video.addEventListener("pause", () => {
      if (document.visibilityState === "visible" && video.matches(":hover, :focus-within")) video.dataset.userPaused = "1";
    });
    video.addEventListener("play", () => delete video.dataset.userPaused);
  }
}

// Homepage: a small satellite orbits the photo, in front of it on the near half of the orbit.
// The orbit (in % of the photo) comes from index.html. Without JavaScript, there is only the orbit line.
const satellite = document.querySelector(".satellite[data-orbit]");
if (satellite) {
  const [cx, cy, rx, ry, tiltDeg] = satellite.dataset.orbit.split(" ").map(Number);
  const tilt = (tiltDeg * Math.PI) / 180;
  const period = 16000; // ms per orbit
  const place = (t) => {
    const x = rx * Math.cos(t), y = ry * Math.sin(t); // y > 0: near half
    satellite.style.setProperty("--x", cx + x * Math.cos(tilt) - y * Math.sin(tilt));
    satellite.style.setProperty("--y", cy + x * Math.sin(tilt) + y * Math.cos(tilt));
    satellite.style.setProperty("--scale", 1 + 0.12 * Math.sin(t));
    satellite.classList.toggle("behind", y < 0);
  };
  satellite.style.setProperty("--tilt", `${tiltDeg}deg`);
  place(0.3 * Math.PI);
  satellite.hidden = false;
  // It moves only while on screen (and not with reduced motion).
  if (!reducedMotion && "IntersectionObserver" in window) {
    let frame = 0;
    const step = (now) => {
      place(0.3 * Math.PI + (2 * Math.PI * now) / period);
      frame = requestAnimationFrame(step);
    };
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) frame = requestAnimationFrame(step);
    }).observe(satellite.parentElement);
  }
}

// The header logo's satellite (an SVG animation) stands still with reduced motion, on the near side.
if (reducedMotion) {
  for (const logo of document.querySelectorAll("svg.logo")) {
    logo.pauseAnimations();
    logo.setCurrentTime(1);
  }
}

// Light/dark theme button. Dark is the default, whatever the system setting. Choosing light is
// stored and applied in <head> (base.liquid) before the page paints; going back to dark clears it.
document.querySelector(".theme-toggle")?.addEventListener("click", () => {
  const root = document.documentElement;
  const light = root.dataset.theme !== "light";
  try {
    if (light) localStorage.setItem("theme", "light");
    else localStorage.removeItem("theme");
  } catch {}
  if (light) root.dataset.theme = "light";
  else delete root.dataset.theme;
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
