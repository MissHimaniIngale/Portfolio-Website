// ============================================================
// HIMANI PORTFOLIO — MAIN SCRIPT
// ------------------------------------------------------------
// Rough map of what lives where (search for these banners):
//
//   1. Nav links, theme/audio toggles, smooth-scroll nav clicks
//   2. Loading screen intro sequence
//   3. 3D tilt / parallax helpers used across cards
//   4. Hanging ID card — drag physics + swing pendulum
//      (the CSS animation that used to fight this was removed
//      from stayle.css — see the ".id-hanging" comment there)
//   5. Contact section — pull-cord lamp toggle + EmailJS form
//   6. Scroll-triggered reveal animations, component parallax
//      floaters (ScrollTrigger-driven)
//   7. Project & services showcase behaviour — this used to be
//      a separate project-section.js file, merged in below
//      under "PROJECT SHOWCASE BEHAVIOUR"
//   8. Gallery ("Voyage" 3D slider) — math, DOM state machine,
//      whoosh sound on slide change
//   9. Tools marquee population
// ============================================================

// Navigation and global section references
const navLinks = document.querySelectorAll(".ul-list li a");
const sections = document.querySelectorAll("section");

// Theme and audio preference keys
const THEME_STORAGE_KEY = "portfolio-theme";
const AUDIO_STORAGE_KEY = "portfolio-audio-enabled";
const themeToggleInput = document.getElementById("themeToggle");
const audioToggleInput = document.getElementById("audioToggle");
let themeAudioContext = null;

// Theme toggle sound effect
function playThemeToggleSound(isBlueTheme) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!themeAudioContext) {
    themeAudioContext = new AudioCtx();
  }

  const startTone = () => {
    const ctx = themeAudioContext;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    masterGain.connect(ctx.destination);

    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(isBlueTheme ? 980 : 520, now);
    clickOsc.frequency.exponentialRampToValueAtTime(
      isBlueTheme ? 760 : 360,
      now + 0.045,
    );
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.75, now + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(masterGain);

    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = "sine";
    chimeOsc.frequency.setValueAtTime(isBlueTheme ? 780 : 240, now + 0.018);
    chimeOsc.frequency.exponentialRampToValueAtTime(
      isBlueTheme ? 940 : 180,
      now + 0.14,
    );
    chimeGain.gain.setValueAtTime(0.0001, now + 0.018);
    chimeGain.gain.exponentialRampToValueAtTime(0.42, now + 0.03);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    chimeOsc.connect(chimeGain);
    chimeGain.connect(masterGain);

    clickOsc.start(now);
    clickOsc.stop(now + 0.06);
    chimeOsc.start(now + 0.018);
    chimeOsc.stop(now + 0.16);
  };

  if (themeAudioContext.state === "suspended") {
    themeAudioContext
      .resume()
      .then(startTone)
      .catch(() => { });
  } else {
    startTone();
  }
}

// Apply the selected visual theme to the page
function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "blue";
  document.body.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = "dark";

  if (themeToggleInput) {
    const isBlue = resolvedTheme === "blue";
    themeToggleInput.checked = isBlue;
    themeToggleInput.setAttribute("aria-checked", String(isBlue));
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  } catch (error) {
    console.warn("Theme preference could not be saved.", error);
  }

  requestAnimationFrame(() => {
    const carouselWrapper = document.getElementById("carouselWrapper");
    if (carouselWrapper && typeof layout === "function") {
      layout();
    }

    if (typeof window.updateVantaTheme === "function") {
      window.updateVantaTheme(resolvedTheme);
    }
  });
}

// Read and wire the theme toggle control
function initThemeToggle() {
  let savedTheme = "blue";

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    savedTheme = storedTheme === "light" ? "blue" : storedTheme || "blue";
  } catch (error) {
    console.warn("Theme preference could not be read.", error);
  }

  applyTheme(savedTheme);

  if (!themeToggleInput) return;

  themeToggleInput.addEventListener("change", () => {
    const nextTheme = themeToggleInput.checked ? "blue" : "dark";
    playThemeToggleSound(nextTheme === "blue");
    applyTheme(nextTheme);
  });
}

initThemeToggle();

// Header navigation active state helper
function removeActive() {
  navLinks.forEach((link) => link.parentElement.classList.remove("active"));
}

navLinks.forEach((link) => {
  link.parentElement.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").substring(1);
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
      window.scrollTo({
        top: targetSection.offsetTop - 80,
        behavior: "smooth",
      });
    }

    removeActive();
    link.parentElement.classList.add("active");
  });
});

// Sticky header visibility and active section tracking
const headerElem = document.querySelector("header");
let lastScrollHeader = window.scrollY;

// Cache each section's offset/height once instead of reading offsetTop /
// offsetHeight (which force a synchronous layout) on every single scroll
// event — this was a big contributor to scroll lag further down the page
// where there are more sections and heavier animated content.
let sectionOffsets = [];
function cacheSectionOffsets() {
  sectionOffsets = Array.from(sections).map((section) => ({
    section,
    top: section.offsetTop,
    height: section.offsetHeight,
  }));
}
cacheSectionOffsets();

let resizeTimeout;
window.addEventListener(
  "resize",
  () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(cacheSectionOffsets, 200);
  },
  { passive: true },
);

let scrollTicking = false;
function handleScrollFrame() {
  scrollTicking = false;

  const currentScroll = window.scrollY;

  // Smart Navbar: Hide on scroll down, show on scroll up
  if (headerElem) {
    if (currentScroll > lastScrollHeader && currentScroll > 100) {
      headerElem.style.transform =
        window.innerWidth <= 768 ? "translateY(150%)" : "translateY(-150%)";
    } else {
      headerElem.style.transform = "translateY(0)";
    }
    headerElem.style.transition =
      "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
  }
  lastScrollHeader = currentScroll;

  const scrollPos = currentScroll + 100;

  sectionOffsets.forEach(({ section, top, height }) => {
    if (scrollPos >= top && scrollPos < top + height) {
      removeActive();
      const activeLink = document.querySelector(
        `.ul-list li a[href="#${section.id}"]`,
      );
      if (activeLink) activeLink.parentElement.classList.add("active");
    }
  });

  backToTop.style.display = currentScroll > 500 ? "flex" : "none";
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(handleScrollFrame);
    }
  },
  { passive: true },
);

// Cursor effects and background music setup
const glow = document.querySelector(".cursor-glow");
const cursorStar = document.querySelector(".cursor-star");

// These paths must match the real file names inside the /audio folder exactly.
const BACKGROUND_TRACK_PATHS = [
  "audio/harry-potter-instrumental.mp3.mp3",
  "audio/how_to_train_your_drag.mp3",
  "audio/lord_of_the_rings.mp3",
  "audio/narnia_king_comes.mp3",
  "audio/spirited_away.mp3",
];

// Human-readable track names (shown in a small toast when track switches)
const TRACK_NAMES = [
  "Harry Potter",
  "How to Train Your Dragon",
  "Lord of the Rings",
  "Narnia – The King Comes",
  "Spirited Away",
];

let backgroundMusic = null;
let backgroundMusicStarted = false;
let backgroundTrackIndex = 0;
let backgroundMusicPendingStart = false;
let backgroundMusicEnabled = false;
let cardWasDragged = false; // tracks whether user actually pulled the card

// ===============================
// Custom Cursor (GSAP)
// ===============================

if (window.matchMedia("(pointer:fine)").matches) {
  document.body.classList.add("custom-cursor");

  const setGlowX = gsap.quickSetter(glow, "x", "px");
  const setGlowY = gsap.quickSetter(glow, "y", "px");

  const setCursorX = gsap.quickSetter(cursorStar, "x", "px");
  const setCursorY = gsap.quickSetter(cursorStar, "y", "px");

  document.addEventListener("pointermove", (e) => {
    const x = e.clientX;
    const y = e.clientY;

    // Arrow follows instantly
    setCursorX(x);
    setCursorY(y);

    // Glow stays centered
    setGlowX(x - 150);
    setGlowY(y - 150);
  });
}
// Create and cache the background audio element
function getBackgroundMusic() {
  if (backgroundMusic) return backgroundMusic;

  backgroundTrackIndex = 0;
  backgroundMusic = new Audio(BACKGROUND_TRACK_PATHS[backgroundTrackIndex]);
  backgroundMusic.loop = true;
  backgroundMusic.volume = 1.0;
  backgroundMusic.preload = "auto";

  const tryPendingStart = () => {
    if (backgroundMusicPendingStart) {
      startBackgroundMusic();
    }
  };

  backgroundMusic.addEventListener("loadeddata", tryPendingStart);
  backgroundMusic.addEventListener("canplaythrough", tryPendingStart);

  backgroundMusic.addEventListener("error", () => {
    backgroundTrackIndex += 1;

    if (backgroundTrackIndex >= BACKGROUND_TRACK_PATHS.length) {
      console.warn(
        `Background music file not found. Tried: ${BACKGROUND_TRACK_PATHS.join(", ")}`,
      );
      return;
    }

    backgroundMusic.src = BACKGROUND_TRACK_PATHS[backgroundTrackIndex];
    backgroundMusic.load();
  });

  backgroundMusic.load();

  return backgroundMusic;
}

// Show a brief toast with the current track name
function showTrackToast(name) {
  let toast = document.getElementById("track-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "track-toast";
    toast.style.cssText = [
      "position:fixed",
      "bottom:90px",
      "left:50%",
      "transform:translateX(-50%) translateY(10px)",
      "background:rgba(10,10,30,0.85)",
      "color:#fff",
      "font-family:'Syne',sans-serif",
      "font-size:13px",
      "letter-spacing:0.04em",
      "padding:8px 18px",
      "border-radius:999px",
      "border:1px solid rgba(var(--theme-accent-rgb),0.4)",
      "box-shadow:0 4px 24px rgba(var(--theme-accent-rgb),0.18)",
      "pointer-events:none",
      "z-index:9999",
      "opacity:0",
      "transition:opacity 0.35s ease, transform 0.35s ease",
    ].join(";");
    document.body.appendChild(toast);
  }
  toast.textContent = "🎵 " + name;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
  }, 2500);
}

// Switch to the next audio track (called when card is snapped back)
function switchAudioTrack() {
  if (!backgroundMusicEnabled) return; // guard: only when audio is ON

  // Advance to next track
  backgroundTrackIndex = (backgroundTrackIndex + 1) % BACKGROUND_TRACK_PATHS.length;

  if (!backgroundMusic) {
    // First time – just create with the new index already set
    getBackgroundMusic();
    startBackgroundMusic();
  } else {
    // Swap the source on the existing element
    backgroundMusic.pause();
    backgroundMusic.src = BACKGROUND_TRACK_PATHS[backgroundTrackIndex];
    backgroundMusic.currentTime = 0;
    backgroundMusic.volume = 1.0;
    backgroundMusic.load();
    backgroundMusicStarted = false;
    if (backgroundMusicEnabled) {
      backgroundMusicPendingStart = true;
      backgroundMusic.addEventListener("canplaythrough", function onReady() {
        backgroundMusic.removeEventListener("canplaythrough", onReady);
        startBackgroundMusic();
      });
    }
  }

  showTrackToast(TRACK_NAMES[backgroundTrackIndex]);
}

// main.js is loaded as a <script type="module">, so top-level
// declarations (functions AND `let`/`const` variables) are scoped to the
// module — they never land on `window` automatically like a classic
// script would. The ID card code further down in this file reads
// `window.switchAudioTrack` / `window.backgroundMusicEnabled` expecting
// exactly that classic-script behaviour, so without these two lines it
// silently no-ops: dragging the card never advanced the track or showed
// the toast, no matter what the audio toggle was set to.
window.switchAudioTrack = switchAudioTrack;
window.isBackgroundMusicEnabled = () => backgroundMusicEnabled;

// Persist the background music preference
function persistAudioPreference(enabled) {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("Audio preference could not be saved.", error);
  }
}

// Start background audio playback
function startBackgroundMusic() {
  if (!backgroundMusicEnabled) return;
  const audio = getBackgroundMusic();
  backgroundMusicPendingStart = true;

  if (backgroundMusicStarted && !audio.paused) return;

  audio
    .play()
    .then(() => {
      backgroundMusicStarted = true;
      backgroundMusicPendingStart = false;
    })
    .catch(() => { });
}

// Resume background audio when appropriate
function resumeBackgroundMusic() {
  if (!backgroundMusicEnabled) return;
  const audio = getBackgroundMusic();
  if ((backgroundMusicStarted || backgroundMusicPendingStart) && audio.paused) {
    startBackgroundMusic();
  }
}

// Pause background audio safely
function pauseBackgroundMusic() {
  if (!backgroundMusic) return;
  if (!backgroundMusic.paused) {
    backgroundMusic.pause();
  }
}

// Sync audio state with the top-left audio button
function setBackgroundMusicEnabled(enabled, triggeredByUser = false) {
  backgroundMusicEnabled = enabled;
  if (audioToggleInput) {
    audioToggleInput.checked = enabled;
    audioToggleInput.setAttribute("aria-checked", String(enabled));
  }

  persistAudioPreference(enabled);

  if (enabled) {
    backgroundMusicPendingStart = true;
    if (triggeredByUser) {
      startBackgroundMusic();
    }
  } else {
    backgroundMusicPendingStart = false;
    pauseBackgroundMusic();
  }
}

// Audio toggle sound effect — same synthesis approach as the theme
// toggle above, so both switches give equally loud/clear feedback.
let audioToggleAudioContext = null;
function playAudioToggleSound(isOn) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioToggleAudioContext) {
    audioToggleAudioContext = new AudioCtx();
  }

  const startTone = () => {
    const ctx = audioToggleAudioContext;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(isOn ? 660 : 330, now);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 990 : 220, now + 0.12);
    osc.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  };

  if (audioToggleAudioContext.state === "suspended") {
    audioToggleAudioContext.resume().then(startTone).catch(() => { });
  } else {
    startTone();
  }
}

// Read and wire the audio toggle control
function initAudioToggle() {
  let savedAudioEnabled = false;

  try {
    savedAudioEnabled = localStorage.getItem(AUDIO_STORAGE_KEY) === "true";
  } catch (error) {
    console.warn("Audio preference could not be read.", error);
  }

  setBackgroundMusicEnabled(savedAudioEnabled, false);

  if (!audioToggleInput) return;

  audioToggleInput.addEventListener("change", () => {
    playAudioToggleSound(audioToggleInput.checked);
    setBackgroundMusicEnabled(audioToggleInput.checked, true);
  });
}

initAudioToggle();

["pointerdown", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, () => {
    if (backgroundMusicEnabled) {
      resumeBackgroundMusic();
    }
  });
});

// Pause or resume audio based on tab visibility
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseBackgroundMusic();
  } else {
    if (backgroundMusicEnabled) {
      resumeBackgroundMusic();
    }
  }
});

// Cursor interaction states
document.addEventListener("mousedown", () => {
  if (document.body.classList.contains("custom-cursor")) {
    document.body.classList.add("cursor-pressed");
  }
});

document.addEventListener("mouseup", () => {
  document.body.classList.remove("cursor-pressed");
});

document.addEventListener("mouseover", (event) => {
  const interactiveTarget = event.target.closest(
    "a, button, input, textarea, label, .nav-btn, .service-card, .project-card, .social-link",
  );
  if (interactiveTarget) {
    document.body.classList.add("cursor-hovering");
  }
});

document.addEventListener("mouseout", (event) => {
  const interactiveTarget = event.target.closest(
    "a, button, input, textarea, label, .nav-btn, .service-card, .project-card, .social-link",
  );
  if (interactiveTarget) {
    document.body.classList.remove("cursor-hovering");
  }
});

// Back-to-top floating button
const backToTop = document.createElement("div");
backToTop.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
backToTop.id = "back-to-top";
document.body.appendChild(backToTop);

backToTop.style.cssText = `
  position: fixed;
  bottom: 40px;
  right: 40px;
  background: var(--backtotop-bg, #474af0);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.3s ease;
`;

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

backToTop.addEventListener(
  "mouseover",
  () => (backToTop.style.transform = "scale(1.2)"),
);
backToTop.addEventListener(
  "mouseout",
  () => (backToTop.style.transform = "scale(1)"),
);

// Hero typing animation
const typingElement = document.querySelector(".info-home h3");
const words = [
  "Web Designer",
  "Frontend Developer",
  "Web Enthusiast",
  "UI/UX Designer",
  "Web Developer",
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 200;

function type() {
  const currentWord = words[wordIndex];
  let displayedText = currentWord.substring(0, charIndex);

  typingElement.innerHTML = displayedText + '<span class="cursor">|</span>';
  typingElement.classList.add("gradient-glow");

  if (!isDeleting && charIndex < currentWord.length) {
    charIndex++;
    setTimeout(type, typingSpeed);
  } else if (isDeleting && charIndex > 0) {
    charIndex--;
    setTimeout(type, typingSpeed / 2);
  } else {
    isDeleting = !isDeleting;
    if (!isDeleting) {
      wordIndex = (wordIndex + 1) % words.length;
    }
    setTimeout(type, 1000);
  }
}

document.addEventListener("DOMContentLoaded", type);

// Intro loading sequence
document.addEventListener("DOMContentLoaded", () => {
  const loadingText = document.getElementById("loading-text");
  const mainIcon = document.querySelector(".main-icon");
  const subIcons = document.querySelectorAll(".sub-icons i");
  const designerText = document.getElementById("designer-text");
  const mainPage = document.getElementById("main-page");
  const loadingScreen = document.getElementById("loading-screen");

  function showElement(element, delay = 0) {
    setTimeout(() => {
      element.classList.remove("hidden");
      element.classList.add("fall");
    }, delay);
  }

  showElement(loadingText, 0);
  showElement(mainIcon, 800);
  subIcons.forEach((icon, idx) => {
    showElement(icon, 1600 + idx * 400);
  });
  showElement(designerText, 2800);

  setTimeout(() => {
    loadingScreen.classList.add("hidden");
    mainPage.classList.add("visible");

    if (typeof init3DParallax === "function") {
      init3DParallax();
    }
  }, 4000);
});
/* ============================================================
   HANGING ID CARD – idcard.js
============================================================ */

(function () {
  const { gsap, Draggable } = window;
  if (!gsap || !Draggable) return;

  gsap.registerPlugin(Draggable);

  const bc = document.getElementById("idBarcode");
  if (bc) {
    [
      3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2,
    ].forEach((w) => {
      const b = document.createElement("div");
      b.className = "id-barcode-bar";
      b.style.cssText = `width:${w}px;height:${12 + Math.random() * 18}px;`;
      bc.appendChild(b);
    });
  }

  const pivot = document.getElementById("idPivot");
  const hanging = document.querySelector(".id-hanging");
  // The clip + card move together when dragged. The cord SVG is a
  // sibling that stays put at the nail and is stretched/rotated by
  // updateCord() to visually reach whichever the group has moved to —
  // previously the cord was INSIDE the dragged element, so it moved by
  // the full drag offset as well as being stretched, which is what
  // detached it from the nail instead of anchoring one end there.
  const dragGroup = document.querySelector(".id-drag-group");
  const card = document.querySelector(".id-card");
  if (!pivot || !hanging || !dragGroup || !card) return;

  let cardWasDragged = false;

  // Read the CURRENT audio-enabled state at the moment we need it (not a
  // one-time snapshot taken when this script first ran, which is why the
  // track never used to change no matter what the toggle was set to).
  function isAudioOn() {
    return typeof window.isBackgroundMusicEnabled === "function"
      ? window.isBackgroundMusicEnabled()
      : true;
  }
  function switchAudioTrack() {
    if (typeof window.switchAudioTrack === "function") {
      window.switchAudioTrack();
    }
  }

  // 1. Setup the continuously swinging pendulum
  gsap.set(pivot, { transformOrigin: "top center" });
  let swingAnim = gsap.fromTo(
    pivot,
    { rotation: -15 },
    {
      rotation: 15,
      ease: "power1.inOut",
      duration: 6,
      repeat: -1,
      yoyo: true,
    }
  );

  const svgCord = document.querySelector(".id-cord-svg");
  if (svgCord) {
    gsap.set(svgCord, { transformOrigin: "top center" });
  }

  // Stretches/rotates the cord SVG so its fixed top stays at the nail
  // while its bottom end tracks the clip (which moves with the card).
  // FIX: negate the angle — positive xOffset (card dragged right) should
  // lean the cord to the right (clockwise from top). atan2(dx, dy) gives a
  // positive value when dx > 0, which means GSAP rotates clockwise. In the
  // SVG coordinate frame after the flex layout the angle was being applied
  // in the wrong sense, so we negate to correct the direction.
  function updateCord() {
    if (!svgCord) return;
    let xOffset = gsap.getProperty(dragGroup, "x") || 0;
    let yOffset = gsap.getProperty(dragGroup, "y") || 0;

    // Base cord height is roughly 100px.
    let dx = xOffset;
    let dy = 100 + yOffset;

    let length = Math.sqrt(dx * dx + dy * dy);
    let scaleY = Math.max(length / 100, 1); // never shrink shorter than resting length
    // Negate: atan2(dx, dy) gives clockwise angle, but the SVG pivot is the
    // element top-center, so rotating positive = bottom goes right which
    // correctly follows the card — HOWEVER the existing layout was observed
    // to move in the opposite direction, so we negate here to fix that.
    let angleDeg = -Math.atan2(dx, dy) * (180 / Math.PI);

    gsap.set(svgCord, {
      scaleY: scaleY,
      rotation: angleDeg,
    });
  }

  let isHovered = false;

  hanging.addEventListener("mouseenter", () => {
    isHovered = true;
    gsap.to(swingAnim, { timeScale: 0, duration: 0.5, ease: "power2.out" });
  });

  hanging.addEventListener("mouseleave", () => {
    isHovered = false;
    let dragInst = Draggable.get(dragGroup);
    if (!dragInst || !dragInst.isDragging) {
      gsap.to(swingAnim, { timeScale: 1, duration: 1.5, ease: "power2.in" });
    }
  });

  // 2. Make the ID Card draggable elastically — works with mouse AND touch.
  //    allowNativeTouchScrolling:false tells GSAP to take over touch input
  //    on the card itself, so dragging the card never scrolls the page.
  //    The rest of the page scrolls normally since the trigger is only the card.
  Draggable.create(dragGroup, {
    type: "x,y",
    trigger: card,
    bounds: { minX: -180, maxX: 180, minY: -50, maxY: 180 },
    edgeResistance: 0.8,
    allowNativeTouchScrolling: false,
    onDragStart: () => {
      pivot.style.cursor = "grabbing";
      cardWasDragged = true;
      gsap.to(swingAnim, { timeScale: 0, duration: 0.2 });
    },
    onDrag: updateCord,
    onRelease: function () {
      pivot.style.cursor = "";

      // Switch audio track when card is released (only if pulled and audio is on)
      if (isAudioOn() && cardWasDragged) {
        switchAudioTrack();
      }
      cardWasDragged = false;

      // Big bouncy snap back to origin
      gsap.to(dragGroup, {
        x: 0,
        y: 0,
        duration: 1.8,
        ease: "elastic.out(1, 0.4)",
        onUpdate: updateCord,
      });

      if (!isHovered) {
        gsap.to(swingAnim, { timeScale: 1, duration: 1.5, ease: "power2.out" });
      }
    },
  });

  // 3. Scroll influence — speeds up the idle swing on fast scroll
  let scrollTimeout;
  let lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      let dragInst = Draggable.get(dragGroup);
      if (isHovered || (dragInst && dragInst.isDragging)) return;

      const dy = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;

      let targetSpeed = 1 + dy * 0.08;
      targetSpeed = Math.min(targetSpeed, 4);

      gsap.to(swingAnim, { timeScale: targetSpeed, duration: 0.2 });

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!isHovered && (!dragInst || !dragInst.isDragging)) {
          gsap.to(swingAnim, {
            timeScale: 1,
            duration: 1.5,
            ease: "power2.out",
          });
        }
      }, 150);
    },
    { passive: true }
  );

  // Entrance Drop Animation
  function triggerDrop() {
    pivot.classList.add("dropped");
    pivot.addEventListener(
      "animationend",
      () => {
        pivot.style.animation = "none";
        swingAnim.play(); // Start swinging after drop completes
      },
      { once: true }
    );
  }

  const homeEl = document.getElementById("home");
  if (homeEl) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          setTimeout(triggerDrop, 300);
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(homeEl);
  } else {
    setTimeout(triggerDrop, 350);
  }
})();

// ============================================================
// Education timeline — short "vibration" buzz sound on hover
// ============================================================
(function () {
  const cards = document.querySelectorAll(".tl-card");
  if (!cards.length) return;

  let buzzCtx = null;
  function playTimelineBuzz() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!buzzCtx) buzzCtx = new AC();
      if (buzzCtx.state === "suspended") buzzCtx.resume();

      const now = buzzCtx.currentTime;
      const osc = buzzCtx.createOscillator();
      const gain = buzzCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(85, now);

      // Quick pulsing amplitude to read as a "vibration" rather than a tone
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc.connect(gain).connect(buzzCtx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      /* never break the page over a hover sound */
    }
  }

  cards.forEach((card) => {
    card.addEventListener("mouseenter", playTimelineBuzz);
  });
})();

/* ============================================================
   PROJECT SHOWCASE BEHAVIOUR (formerly project-section.js)
   Merged in here so the whole site is just 3 files: index.html,
   stayle.css, main.js. Drives the full-screen project section:
   renders project data, handles next/prev nav + keyboard + swipe,
   the pointer-tilt parallax on the image stage, and the
   synthesized whoosh/tick sounds (see project-section CSS in
   stayle.css for the matching visuals).
   ============================================================ */
// ============================================================
// PROJECT SHOWCASE — full-screen, one-project-at-a-time
// Replaces the old card carousel. Keeps the same data shape
// you already had (title, desc, tags, img, github, demo).
// ============================================================

const projects = [
  {
    title: "ATM-Simulator",
    desc: "ATM Simulator which manages ATM operations, generating PIN numbers, card numbers, and handling ATM transactions.",
    tags: ["HTML", "JavaSwing", "AWT", "MySQL"],
    img: "images/ATM Simulator.jpeg",
    github: "https://github.com/MissHimaniIngale/ATM-Simulator.git",
    demo: "demo/ATM Simulator.mp4",
  },
  {
    title: "Portfolio Website",
    desc: "Built an Apple website clone using React and Material UI with reusable components, replicating Apple's minimal design and layout.",
    tags: ["HTML", "CSS", "JavaScript"],
    img: "images/Porfolio.jpeg",
    github: "https://github.com/MissHimaniIngale/Portfolio-Website",
    demo: "demo/Himani-Portfolio.mp4",
  },
  {
    title: "Apple Clone App",
    desc: "Built an Apple website clone using React and Material UI with a reusable, component-based design, replicating Apple's minimal UI and layout structure.",
    tags: ["HTML", "CSS", "ReactJS"],
    img: "images/Apple clone app (1).png",
    github: "https://github.com/MissHimaniIngale/Apple-Clone",
    demo: "demo/apple clone app.mp4",
  },
  {
    title: "Binge ur ब्या",
    desc: "Developed the frontend of a role-based wedding booking platform with real-time features using Django and MongoDB.",
    tags: ["HTML", "CSS", "JS", "Django", "Python", "MongoDB"],
    img: "images/Binge ur Bya.png",
    github: "https://github.com/MissHimaniIngale/Binge-Ur-Bya",
    demo: "demo/Binge ur ब्या.mp4",
  },
];

(function () {
  const root = document.getElementById("project");
  if (!root) return;

  const els = {
    counter: root.querySelector("#pvCounter"),
    title: root.querySelector("#pvTitle"),
    desc: root.querySelector("#pvDesc"),
    tags: root.querySelector("#pvTags"),
    live: root.querySelector("#pvLive"),
    gh: root.querySelector("#pvGh"),
    prev: root.querySelector("#pvPrev"),
    next: root.querySelector("#pvNext"),
    fill: root.querySelector("#pvFill"),
    stage: root.querySelector("#pvStage"),
    frame: root.querySelector("#pvFrame"),
    img: root.querySelector("#pvImg"),
    reflImg: root.querySelector("#pvReflImg"),
    particles: root.querySelector("#pvParticles"),
  };

  let current = 0;
  let animating = false;

  // ---------- audio: tiny synthesized whoosh + tick, no files needed ----------
  let actx = null;
  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    return actx;
  }

  function playWhoosh(dir) {
    const ac = ctx();
    if (!ac) return;
    const run = () => { /* move the rest of the existing function body here */ };
    if (ac.state === "suspended") { ac.resume().then(run).catch(() => { }); return; }
    run();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    osc.type = "sine";

    const startFreq = dir === "prev" ? 900 : 260;
    const endFreq = dir === "prev" ? 260 : 900;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.38);
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.38);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  function playTick() {
    const ac = ctx();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // ---------- render ----------
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render(idx) {
    const p = projects[idx];
    els.counter.textContent = `${pad(idx + 1)} / ${pad(projects.length)}`;
    els.title.textContent = p.title;
    els.desc.textContent = p.desc;
    els.tags.innerHTML = p.tags.map((t) => `<span class="pv-tag">${t}</span>`).join("");

    if (p.demo) {
      els.live.href = p.demo;
      els.live.removeAttribute("data-disabled");
    } else {
      els.live.removeAttribute("href");
      els.live.setAttribute("data-disabled", "true");
    }
    if (p.github) {
      els.gh.href = p.github;
      els.gh.removeAttribute("data-disabled");
    } else {
      els.gh.removeAttribute("href");
      els.gh.setAttribute("data-disabled", "true");
    }

    els.img.src = p.img;
    els.img.alt = p.title;
    els.reflImg.src = p.img;
    els.reflImg.alt = "";

    els.fill.style.width = `${((idx + 1) / projects.length) * 100}%`;
  }

  function goTo(nextIdx, dir) {
    if (animating || nextIdx === current) return;
    animating = true;
    playWhoosh(dir);

    const outClass = dir === "next" ? "pv-anim-out-next" : "pv-anim-out-prev";
    const inClass = dir === "next" ? "pv-anim-in-next" : "pv-anim-in-prev";

    root.classList.add(outClass);

    window.setTimeout(() => {
      root.classList.remove(outClass);
      current = nextIdx;
      render(current);
      root.classList.add(inClass);
      window.setTimeout(() => {
        root.classList.remove(inClass);
        animating = false;
      }, 520);
    }, 340);
  }

  els.next.addEventListener("click", () => goTo((current + 1) % projects.length, "next"));
  els.prev.addEventListener("click", () =>
    goTo((current - 1 + projects.length) % projects.length, "prev")
  );
  [els.next, els.prev].forEach((btn) => btn.addEventListener("mouseenter", playTick));

  // keyboard nav
  window.addEventListener("keydown", (e) => {
    const rect = root.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (e.key === "ArrowRight") els.next.click();
    if (e.key === "ArrowLeft") els.prev.click();
  });

  // touch swipe
  let touchX = null;
  els.stage.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true }
  );
  els.stage.addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) els.next.click();
        else els.prev.click();
      }
      touchX = null;
    },
    { passive: true }
  );

  // ---------- 3D parallax tilt, eased toward pointer ----------
  let targetRX = 0,
    targetRY = 0,
    curRX = 0,
    curRY = 0;

  els.stage.addEventListener("mousemove", (e) => {
    const r = els.stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    targetRY = px * 22;
    targetRX = -py * 16;
  });
  els.stage.addEventListener("mouseleave", () => {
    targetRX = 0;
    targetRY = 0;
  });

  function tick() {
    curRX += (targetRX - curRX) * 0.08;
    curRY += (targetRY - curRY) * 0.08;
    els.stage.style.transform = `rotateX(${curRX}deg) rotateY(${curRY}deg)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- floating particles, generated once ----------
  const PARTICLE_COUNT = 10;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const d = document.createElement("div");
    d.className = "pv-particle";
    d.style.left = `${8 + Math.random() * 84}%`;
    d.style.bottom = `${Math.random() * 20}%`;
    d.style.animationDuration = `${6 + Math.random() * 6}s`;
    d.style.animationDelay = `${Math.random() * 6}s`;
    els.particles.appendChild(d);
  }

  render(current);
})();

/* ============================================================
 CONTACT SECTION – JavaScript
 Paste into your main JS file, or link as a separate file.

 IMPORTANT: This script must run AFTER the GSAP scripts load.
 In your HTML <head> or before </body>, include in this order:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/MorphSVGPlugin.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Draggable.min.js"></script>
   <script src="your-script.js" defer></script>   ← this file last
============================================================ */

// Contact lamp animation and EmailJS form flow
(function () {
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLamp);
  } else {
    initLamp();
  }

  function initLamp() {
    const { gsap } = window;
    if (!gsap) {
      console.warn(
        "Contact lamp: GSAP not found. Make sure GSAP scripts are loaded before this file.",
      );
      return;
    }

    const { registerPlugin, set, to, timeline } = gsap;

    // Register plugins if available
    if (window.MorphSVGPlugin) registerPlugin(window.MorphSVGPlugin);
    if (window.Draggable) registerPlugin(window.Draggable);

    const CONTACT_DELIVERY = {
      ownerName: "Himani",
      ownerEmail: "ingale.himani.co132@gmail.com",
      portfolioTitle: "Himani Portfolio",
      autoReplySubject: "Thank you for contacting Himani",
      ownerNotificationSubject: "New portfolio enquiry from {{from_name}}",
      autoReplyMessage:
        "Thank you for reaching out through my portfolio website. I have received your message and will review it shortly. If your enquiry is about a project, freelance work, a role, or collaboration, I will get back to you as soon as possible.",
      emailjs: {
        publicKey: "TXzD1jpk_pBtwunAY",
        serviceId: "service_agfygmj",
        ownerTemplateId: "template_admin",
        autoReplyTemplateId: "template_user",
      },
    };

    // ── Elements ──
    const FORM = document.querySelector("#contactForm");
    const CORDS = gsap.utils.toArray(".cords path");
    const DUMMY_CORD = document.querySelector(".cord--dummy");
    const HIT = document.querySelector(".lamp__hit");
    const BTN_SEND = document.querySelector("#btnSend");
    const BTN_LABEL = BTN_SEND?.querySelector("span") || BTN_SEND;
    const STATUS = document.querySelector("#contactStatus");
    const NAME_INPUT = document.getElementById("contactName");
    const EMAIL_INPUT = document.getElementById("contactEmail");
    const MESSAGE_INPUT = document.getElementById("contactMessage");

    if (!FORM || !DUMMY_CORD || !HIT) {
      console.warn("Contact lamp: Required elements not found in DOM.");
      return;
    }

    if (window.emailjs && hasEmailJsConfig()) {
      window.emailjs.init({ publicKey: CONTACT_DELIVERY.emailjs.publicKey });
    }

    // ── Click sound ──
    const CLICK_SRC = "https://assets.codepen.io/605876/click.mp3";
    let clickAudio = null;
    let lampAudioCtx = null;

    // Synthesized fallback so the lamp still clicks audibly even if the
    // remote click.mp3 can't be reached (offline, blocked, slow network).
    function playSynthClick() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!lampAudioCtx) lampAudioCtx = new AC();
        const ac = lampAudioCtx;

        const click = (t) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(1400, t);
          osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          osc.connect(gain).connect(ac.destination);
          osc.start(t);
          osc.stop(t + 0.05);
        };

        const run = () => {
          const now = ac.currentTime;
          click(now);        // "click"
          click(now + 0.09);  // "clack"
        };

        if (ac.state === "suspended") { ac.resume().then(run).catch(() => { }); return; }
        run();
      } catch (e) { }
    }

    function playClick() {
      if (!clickAudio) clickAudio = new Audio(CLICK_SRC);
      clickAudio.currentTime = 0;
      clickAudio.play().catch(playSynthClick); // fall back if blocked/unavailable
    }

    // ── Draggable proxy ──
    const PROXY = document.createElement("div");
    const ENDX = DUMMY_CORD.getAttribute("x2");
    const ENDY = DUMMY_CORD.getAttribute("y2");
    const CORD_DUR = 0.1;

    function resetProxy() {
      set(PROXY, { x: ENDX, y: ENDY });
    }
    resetProxy();

    // ── State ──
    const STATE = { ON: false };
    let formSession = 0;
    const EMAIL_VALIDATION_ERROR = "Enter correct mail ID.";
    const EMAIL_VALIDATION_CACHE = new Map();
    const EMAIL_VALIDATION_ENDPOINTS = [
      "/api/validate-email",
      "/.netlify/functions/validate-email",
    ];

    // ── Initial GSAP setup ──
    gsap.set([".cords", HIT], { x: -10 });
    gsap.set(".lamp__eye", {
      rotate: 180,
      transformOrigin: "50% 50%",
      yPercent: 50,
    });
    gsap.set(".lamp", { display: "block" });

    // ── Hue randomiser — changes glow color on every pull ──
    function applyRandomHue() {
      const hue = gsap.utils.random(0, 359);
      const glowH = `hsl(${hue}, 70%, 60%)`;
      const glowDark = `hsl(${hue}, 70%, 40%)`;

      // Approximate RGB values for rgba() usage in CSS
      const r = Math.round(128 + 127 * Math.cos((hue * Math.PI) / 180));
      const g = Math.round(128 + 127 * Math.cos(((hue - 120) * Math.PI) / 180));
      const b = Math.round(128 + 127 * Math.cos(((hue + 120) * Math.PI) / 180));

      set(document.documentElement, {
        "--glow-color": glowH,
        "--glow-color-dark": glowDark,
        "--glow-rgb": `${r}, ${g}, ${b}`,
      });
    }

    // ── Cord animation timeline ──
    const CORD_TL = timeline({
      paused: true,

      onStart: () => {
        // Toggle state
        STATE.ON = !STATE.ON;

        // Pick a new random color each time
        applyRandomHue();

        // Update --on CSS variable (drives CSS transitions)
        set(document.documentElement, { "--on": STATE.ON ? 1 : 0 });

        // Animate eyes open/closed
        if (STATE.ON) {
          // Open eyes: rotate eyelid arc to upright (visible iris)
          gsap.to(".lamp__eye", { rotate: 0, duration: 0.35, ease: "back.out(1.7)" });
          // Start pupils rolling left→right repeatedly while lamp is ON
          startEyeRoll();
        } else {
          // Close eyes: flip eyelid arc back down
          gsap.to(".lamp__eye", { rotate: 180, duration: 0.25, ease: "power2.in" });
          stopEyeRoll();
        }

        // Hide hit zone + dummy cord during animation, show animated cord
        set([DUMMY_CORD, HIT], { display: "none" });
        set(CORDS[0], { display: "block" });

        // Play click sound
        playClick();

        // Refresh form content whenever the lamp is toggled
        refreshContactForm();
        FORM.classList.toggle("active", STATE.ON);
      },

      onComplete: () => {
        // Restore hit zone + dummy cord; hide animated cord
        set([DUMMY_CORD, HIT], { display: "block" });
        set(CORDS[0], { display: "none" });
        resetProxy();
      },
    });

    // Build morphing cord animation sequence
    for (let i = 1; i < CORDS.length; i++) {
      CORD_TL.add(
        to(CORDS[0], {
          morphSVG: CORDS[i],
          duration: CORD_DUR,
          repeat: 1,
          yoyo: true,
        }),
      );
    }

    // ── Eye cursor-tracking (runs while lamp is ON) ──
    // Eye socket centers in SVG viewBox space (viewBox="0 0 333 484")
    const EYE_LEFT  = { cx: 102, cy: 130 };
    const EYE_RIGHT = { cx: 228, cy: 130 };
    // How far (in viewBox px) the pupil can travel from the eye center
    const PUPIL_RANGE_X = 6.5;  // horizontal travel limit inside eye white
    const PUPIL_RANGE_Y = 3.5;  // vertical travel limit

    let eyeTrackingActive = false;
    let eyeTrackRAF = null;
    // Smoothly interpolated pupil target positions
    let pupilTarget = {
      lx: EYE_LEFT.cx,  ly: EYE_LEFT.cy,
      rx: EYE_RIGHT.cx, ry: EYE_RIGHT.cy,
    };
    let pupilCurrent = { ...pupilTarget };

    // The lamp SVG element — used to get its screen bounding rect
    const LAMP_SVG = document.querySelector(".lamp");

    function onMouseMove(e) {
      if (!LAMP_SVG) return;
      const rect   = LAMP_SVG.getBoundingClientRect();
      const svgW   = 333;  // viewBox width
      const svgH   = 484;  // viewBox height
      const scaleX = svgW / rect.width;
      const scaleY = svgH / rect.height;

      // Cursor position in SVG viewBox coordinates
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top)  * scaleY;

      // For each eye, compute direction toward cursor then clamp to socket
      function pupilOffset(eye) {
        const dx = mx - eye.cx;
        const dy = my - eye.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Normalise then scale to the allowed range (ellipse clamp)
        const nx = dx / dist;
        const ny = dy / dist;
        // Clamp inside an ellipse defined by PUPIL_RANGE_X / Y
        const scale = Math.min(1, dist / 80); // 80 viewBox px = "full" travel
        return {
          cx: eye.cx + nx * PUPIL_RANGE_X * scale,
          cy: eye.cy + ny * PUPIL_RANGE_Y * scale,
        };
      }

      const l = pupilOffset(EYE_LEFT);
      const r = pupilOffset(EYE_RIGHT);
      pupilTarget.lx = l.cx; pupilTarget.ly = l.cy;
      pupilTarget.rx = r.cx; pupilTarget.ry = r.cy;
    }

    function eyeTrackLoop() {
      if (!eyeTrackingActive) return;
      const leftPupil  = document.querySelector(".lamp__pupil--left");
      const rightPupil = document.querySelector(".lamp__pupil--right");
      if (!leftPupil || !rightPupil) { eyeTrackRAF = requestAnimationFrame(eyeTrackLoop); return; }

      // Ease current toward target (lerp factor 0.12 = smooth lag)
      const lerp = 0.12;
      pupilCurrent.lx += (pupilTarget.lx - pupilCurrent.lx) * lerp;
      pupilCurrent.ly += (pupilTarget.ly - pupilCurrent.ly) * lerp;
      pupilCurrent.rx += (pupilTarget.rx - pupilCurrent.rx) * lerp;
      pupilCurrent.ry += (pupilTarget.ry - pupilCurrent.ry) * lerp;

      leftPupil.setAttribute("cx",  pupilCurrent.lx.toFixed(2));
      leftPupil.setAttribute("cy",  pupilCurrent.ly.toFixed(2));
      rightPupil.setAttribute("cx", pupilCurrent.rx.toFixed(2));
      rightPupil.setAttribute("cy", pupilCurrent.ry.toFixed(2));

      eyeTrackRAF = requestAnimationFrame(eyeTrackLoop);
    }

    function startEyeRoll() {
      stopEyeRoll(); // clear any previous session
      // Reset interpolation start to current eye centers
      pupilCurrent = {
        lx: EYE_LEFT.cx,  ly: EYE_LEFT.cy,
        rx: EYE_RIGHT.cx, ry: EYE_RIGHT.cy,
      };
      pupilTarget = { ...pupilCurrent };
      eyeTrackingActive = true;
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      eyeTrackRAF = requestAnimationFrame(eyeTrackLoop);
    }

    function stopEyeRoll() {
      eyeTrackingActive = false;
      window.removeEventListener("mousemove", onMouseMove);
      if (eyeTrackRAF) { cancelAnimationFrame(eyeTrackRAF); eyeTrackRAF = null; }
      // Ease pupils back to center smoothly
      const leftPupil  = document.querySelector(".lamp__pupil--left");
      const rightPupil = document.querySelector(".lamp__pupil--right");
      if (leftPupil)  gsap.to(leftPupil,  { attr: { cx: EYE_LEFT.cx,  cy: EYE_LEFT.cy  }, duration: 0.4, ease: "power2.out" });
      if (rightPupil) gsap.to(rightPupil, { attr: { cx: EYE_RIGHT.cx, cy: EYE_RIGHT.cy }, duration: 0.4, ease: "power2.out" });
    }

    // ── Draggable cord interaction ──
    if (window.Draggable) {
      let startX, startY;

      Draggable.create(PROXY, {
        trigger: HIT,
        type: "x,y",

        onPress(e) {
          startX = e.x;
          startY = e.y;
          // FIX cursor lag: immediately set grabbing cursor on the whole page
          // so the OS cursor doesn't revert to default when moving fast.
          document.body.classList.add("lamp-cord-dragging");
        },

        onDrag: function () {
          set(DUMMY_CORD, {
            attr: {
              x2: this.x,
              y2: Math.max(400, this.y), // prevent cord going above lamp
            },
          });
        },

        onRelease: function (e) {
          // Remove grabbing cursor immediately on release
          document.body.classList.remove("lamp-cord-dragging");

          const dx = Math.abs(e.x - startX);
          const dy = Math.abs(e.y - startY);
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Snap cord back to resting position
          to(DUMMY_CORD, {
            attr: { x2: ENDX, y2: ENDY },
            duration: CORD_DUR,
            onComplete: () => {
              if (dist > 50) {
                CORD_TL.restart(); // trigger toggle if pulled far enough
              } else {
                resetProxy(); // just snap back if barely moved
              }
            },
          });
        },
      });
    }

    // ── Send button handler ──
    if (FORM) {
      FORM.addEventListener("submit", handleSend);
    }
    if (EMAIL_INPUT) {
      let validationTimeout;

      EMAIL_INPUT.addEventListener("input", () => {
        EMAIL_INPUT.setCustomValidity("");
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(() => {
          void validateEmailField({ checkDeliverability: false });
        }, 300);
      });

      EMAIL_INPUT.addEventListener("blur", () => {
        clearTimeout(validationTimeout);
        void validateEmailField({
          showMessage: true,
          checkDeliverability: false,
        });
      });
    }

    if (MESSAGE_INPUT && EMAIL_INPUT) {
      MESSAGE_INPUT.addEventListener("focus", (e) => {
        const emailValue = EMAIL_INPUT.value.trim();
        if (!emailValue || !isValidEmail(emailValue)) {
          EMAIL_INPUT.focus();
          setStatus("Please fill a correct email before writing a message.", "error");
        }
      });
    }

    function hasEmailJsConfig() {
      const { publicKey, serviceId, ownerTemplateId, autoReplyTemplateId } =
        CONTACT_DELIVERY.emailjs;
      return [publicKey, serviceId, ownerTemplateId, autoReplyTemplateId].every(
        (value) => value && !value.startsWith("YOUR_"),
      );
    }

    function setStatus(message, tone = "") {
      if (!STATUS) return;
      STATUS.textContent = message;
      STATUS.classList.remove("is-error", "is-success");
      if (tone) STATUS.classList.add(`is-${tone}`);
    }

    function setButtonState(label, tone = "default", disabled = false) {
      if (!BTN_SEND || !BTN_LABEL) return;

      BTN_LABEL.textContent = label;
      BTN_SEND.disabled = disabled;

      if (tone === "error") {
        BTN_SEND.style.background = "linear-gradient(135deg, #e74c3c, #c0392b)";
      } else if (tone === "success") {
        BTN_SEND.style.background = "linear-gradient(135deg, #27ae60, #1e8449)";
      } else if (tone === "loading") {
        BTN_SEND.style.background = "linear-gradient(135deg, #0fb9b1, #0652dd)";
      } else {
        BTN_SEND.style.background = "";
      }
    }

    function clearContactFormFields() {
      FORM?.reset();
      if (document.activeElement && FORM?.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      EMAIL_INPUT?.setCustomValidity("");
    }

    function refreshContactForm() {
      formSession += 1;
      clearContactFormFields();
      setStatus("");
      setButtonState("Send Message", "default", false);

      // Ensure form listeners are attached
      if (FORM && !FORM.dataset.listenerAttached) {
        FORM.addEventListener("submit", handleSend);
        FORM.dataset.listenerAttached = "true";
      }
    }

    function buildMailtoUrl(name, email, message, submittedAt) {
      const subject = CONTACT_DELIVERY.ownerNotificationSubject.replace(
        "{{from_name}}",
        name,
      );
      const body = buildOwnerEmailText(name, email, message, submittedAt);
      return `mailto:${CONTACT_DELIVERY.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function validateEmailField({
      showMessage = false,
      showAlert = false,
      checkDeliverability = false,
    } = {}) {
      if (!EMAIL_INPUT) return true;

      const emailValue = EMAIL_INPUT.value.trim();

      if (!emailValue) {
        EMAIL_INPUT.setCustomValidity(EMAIL_VALIDATION_ERROR);
        // We removed reportValidity() to prevent sticky native popups
        return false;
      }

      if (!isValidEmail(emailValue)) {
        EMAIL_INPUT.setCustomValidity(EMAIL_VALIDATION_ERROR);
        // We removed reportValidity() to prevent sticky native popups
        return false;
      }

      EMAIL_INPUT.setCustomValidity("");
      return true;
    }

    function buildOwnerEmailText(name, email, message, submittedAt) {
      return [
        `New portfolio enquiry received for ${CONTACT_DELIVERY.ownerName}.`,
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Submitted: ${submittedAt}`,
        "",
        "Message:",
        message,
      ].join("\n");
    }

    function buildOwnerEmailHtml(name, email, message, submittedAt) {
      return `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 16px;">New Portfolio Enquiry</h2>
          <p style="margin:0 0 12px;">You received a new message through your portfolio contact form.</p>
          <table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:640px;">
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;"><strong>Name</strong></td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${name}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${email}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;"><strong>Submitted</strong></td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${submittedAt}</td></tr>
          </table>
          <p style="margin:0 0 8px;"><strong>Message</strong></p>
          <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;white-space:pre-wrap;">${message}</div>
        </div>
      `;
    }

    function buildAutoReplyText(name) {
      return [
        `Hello ${name},`,
        "",
        `Thank you for contacting ${CONTACT_DELIVERY.ownerName} through ${CONTACT_DELIVERY.portfolioTitle}.`,
        CONTACT_DELIVERY.autoReplyMessage,
        "",
        `You can continue the conversation by replying to ${CONTACT_DELIVERY.ownerEmail}.`,
        "",
        "Best regards,",
        CONTACT_DELIVERY.ownerName,
        "Frontend Developer",
      ].join("\n");
    }

    function buildAutoReplyHtml(name) {
      return `
        <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;max-width:640px;margin:0 auto;padding:24px 20px;background:#ffffff;">
          <p style="margin:0 0 16px;font-size:16px;">Hi ${name},</p>
          <p style="margin:0 0 14px;font-size:15px;">
            Thank you for reaching out through <strong>${CONTACT_DELIVERY.portfolioTitle}</strong>.
          </p>
          <p style="margin:0 0 14px;font-size:15px;">
            ${CONTACT_DELIVERY.autoReplyMessage}
          </p>
          <p style="margin:0 0 14px;font-size:15px;">
            You can continue the conversation by replying directly to
            <a href="mailto:${CONTACT_DELIVERY.ownerEmail}" style="color:#2563eb;text-decoration:none;">${CONTACT_DELIVERY.ownerEmail}</a>.
          </p>
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:15px;">
            Best regards,<br>
            <strong>${CONTACT_DELIVERY.ownerName}</strong><br>
            Frontend Developer
          </p>
        </div>
      `;
    }

    async function handleSend(event) {
      event?.preventDefault();
      const activeSession = formSession;

      const name = NAME_INPUT?.value.trim() || "";
      const email = EMAIL_INPUT?.value.trim() || "";
      const message = MESSAGE_INPUT?.value.trim() || "";

      if (!name || !email || !message) {
        setButtonState("Fill all columns", "error", false);
        setStatus("Please fill all the columns.", "error");
        if (!name && NAME_INPUT) NAME_INPUT.focus();
        else if (!email && EMAIL_INPUT) EMAIL_INPUT.focus();
        else if (!message && MESSAGE_INPUT) MESSAGE_INPUT.focus();
        setTimeout(() => {
          setButtonState("Send Message");
        }, 2200);
        return;
      }

      if (
        !(await validateEmailField({
          showMessage: true,
          showAlert: false,
          checkDeliverability: false,
        }))
      ) {
        setButtonState("Invalid email", "error", false);
        setStatus(EMAIL_VALIDATION_ERROR, "error");
        EMAIL_INPUT?.focus();
        setTimeout(() => {
          setButtonState("Send Message");
        }, 2200);
        return;
      }

      // We handle missing fields and email validation manually above, 
      // preventing the need for the native FORM.reportValidity() popup.

      const submittedAt = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      if (!hasEmailJsConfig() || !window.emailjs) {
        setButtonState("Open Email Draft", "success", false);
        setStatus(
          "EmailJS is not configured yet, so an email draft has been opened with your message.",
          "success",
        );

        if (CONTACT_DELIVERY.ownerEmail) {
          window.location.href = buildMailtoUrl(
            name,
            email,
            message,
            submittedAt,
          );
        }

        clearContactFormFields();

        setTimeout(() => {
          if (activeSession !== formSession) return;
          setButtonState("Send Message", "default", false);
        }, 2600);
        return;
      }

      const ownerEmailParams = {
        owner_name: CONTACT_DELIVERY.ownerName,
        owner_email: CONTACT_DELIVERY.ownerEmail,
        from_name: name,
        from_email: email,
        reply_to: email,
        message,
        submitted_at: submittedAt,
        subject: CONTACT_DELIVERY.ownerNotificationSubject.replace(
          "{{from_name}}",
          name,
        ),
        email_body: buildOwnerEmailText(name, email, message, submittedAt),
        email_html: buildOwnerEmailHtml(name, email, message, submittedAt),
      };

      const autoReplyParams = {
        to_name: name,
        to_email: email,
        owner_name: CONTACT_DELIVERY.ownerName,
        reply_to: CONTACT_DELIVERY.ownerEmail,
        subject: CONTACT_DELIVERY.autoReplySubject,
        thank_you_message: CONTACT_DELIVERY.autoReplyMessage,
        email_body: buildAutoReplyText(name),
        email_html: buildAutoReplyHtml(name),
      };

      try {
        setButtonState("Sending...", "loading", true);
        setStatus("Sending your message...", "");

        // Only try to send the owner email first
        await window.emailjs.send(
          CONTACT_DELIVERY.emailjs.serviceId,
          CONTACT_DELIVERY.emailjs.ownerTemplateId,
          ownerEmailParams,
        );

        // Try auto-reply separately, don't fail the whole submission if it errors
        try {
          await window.emailjs.send(
            CONTACT_DELIVERY.emailjs.serviceId,
            CONTACT_DELIVERY.emailjs.autoReplyTemplateId,
            autoReplyParams,
          );
        } catch (autoReplyErr) {
          console.warn("Auto-reply template failed, but owner email was sent.");
        }

        if (activeSession !== formSession) return;

        setButtonState("Message Sent!", "success", true);
        setStatus(
          "Your message email was sent successfully.",
          "success",
        );

        clearContactFormFields();

        setTimeout(() => {
          if (activeSession !== formSession) return;
          setButtonState("Send Message", "default", false);
          setStatus(""); // Clear the message after some time
        }, 4000);
      } catch (error) {
        if (activeSession !== formSession) return;
        console.error("Contact form delivery failed:", error);
        setButtonState("Try Again", "error", false);
        setStatus(
          "The email service could not send the message. Check your EmailJS keys.",
          "error",
        );
      }
    }
  } // end initLamp
})();

/* ============================================================
   FIREFLY DOTS   
============================================================ */

(function () {
  const COUNT = 32;
  const CYAN = "0, 240, 255";

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnDots(container, count) {
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("div");
      dot.className = "firefly";

      const size = rand(2.5, 6);
      const x = rand(0, 100);
      const y = rand(2, 38);
      const dur = rand(5, 14);
      const delay = -rand(0, 14);
      const driftX = rand(-80, 80);
      const driftY = rand(-12, 12);
      const peak = rand(0.7, 1.0);

      dot.style.cssText = `
        width:${size}px;
        height:${size}px;
        left:${x}%;
        top:${y}px;
        background:#000;
        border-radius:50%;
        position:absolute;
      `;

      const id = "ffy_" + ((Math.random() * 1e9) | 0);

      const glowOn = `
        0 0 ${size * 2}px   ${size}px     rgba(${CYAN},${peak}),
        0 0 ${size * 5}px   ${size * 2.5}px rgba(${CYAN},${peak * 0.55}),
        0 0 ${size * 10}px  ${size * 5}px   rgba(${CYAN},0.18)`;

      const glowDim = `0 0 ${size}px ${size * 0.4}px rgba(${CYAN},0.07)`;

      const style = document.createElement("style");
      style.textContent = `
        @keyframes ${id} {
          0%   { transform:translate(0,0);
                 box-shadow:${glowDim}; opacity:0; }
          8%   { opacity:1; box-shadow:${glowOn}; }
          22%  { transform:translate(${driftX * 0.25}px,${driftY * -0.5}px);
                 box-shadow:${glowDim}; opacity:.5; }
          38%  { box-shadow:${glowOn}; opacity:1; }
          54%  { transform:translate(${driftX * 0.6}px,${driftY * 0.7}px);
                 box-shadow:${glowDim}; opacity:.4; }
          70%  { box-shadow:${glowOn}; opacity:1; }
          86%  { transform:translate(${driftX * 0.85}px,${driftY * -0.3}px);
                 box-shadow:${glowDim}; }
          100% { transform:translate(${driftX}px,${driftY}px);
                 box-shadow:${glowOn}; opacity:0; }
        }`;
      document.head.appendChild(style);

      dot.style.animation = `${id} ${dur}s ${delay}s linear infinite`;
      container.appendChild(dot);
    }
  }

  function initFireflies() {
    /* ── HEADER ──
       Appended directly to body as position:fixed
       top:0 = above the navbar, never scrolls               */
    const hc = document.createElement("div");
    hc.className = "header-fireflies";
    document.body.appendChild(hc);
    spawnDots(hc, COUNT);

    /* ── FOOTER ──
       Also appended to body as position:fixed
       scroll listener keeps it locked to footer top edge     */
    const footer = document.querySelector(".footer");
    if (footer) {
      const fc = document.createElement("div");
      fc.className = "footer-fireflies";
      document.body.appendChild(fc);

      function positionFooterDots() {
        const rect = footer.getBoundingClientRect();
        const fromBottom = window.innerHeight - rect.top;
        fc.style.bottom = fromBottom + "px";
      }

      positionFooterDots();
      window.addEventListener("scroll", positionFooterDots);
      window.addEventListener("resize", positionFooterDots);

      spawnDots(fc, COUNT);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFireflies);
  } else {
    initFireflies();
  }
})();
(function () {
  const skills = [
    {
      name: "HTML",
      color: "#ff8a05",
      svg: "M4 3l1.5 16.5L12 21l6.5-1.5L20 3H4zm13.1 4H7.9l.2 2.5h8.8l-.6 6.8L12 17.5l-4.3-1.2-.3-3.5h2.5l.2 1.5L12 15l1.9-.7.2-2.3H7.4L6.8 7z",
    },
    {
      name: "CSS",
      color: "#fc01d2",
      svg: "M4 3l1.5 16.5L12 21l6.5-1.5L20 3H4zm10.9 5.4H9.7l.1 1.5h4.9l-.5 5.3-2.2.6-2.2-.6-.1-1.8H8.2l.3 3.4L12 18l3.5-1.2.5-5.5.1-1H8.9L8.8 8.4h7.3l-.2-1z",
    },
    {
      name: "JavaScript",
      color: "#fff018",
      svg: "M3 3h18v18H3V3zm9.5 13.5c.4.7 1 1.2 2 1.2 1.1 0 1.7-.5 1.7-1.3 0-.9-.7-1.2-1.8-1.7l-.6-.3c-1.7-.7-2.8-1.6-2.8-3.5 0-1.7 1.3-3 3.4-3 1.5 0 2.5.5 3.3 1.8l-1.8 1.1c-.4-.7-.8-1-1.5-1-.7 0-1.1.4-1.1 1 0 .7.4 1 1.5 1.5l.6.3c2 .9 3.1 1.7 3.1 3.6 0 2.1-1.6 3.2-3.8 3.2-2.1 0-3.5-1-4.2-2.4l1.9-1.1zm-7.5.2c.3.5.6.9 1.2.9.6 0 .9-.2.9-1.1v-6h2.3v6.1c0 2.1-1.2 3-3 3-1.6 0-2.5-.8-3-2l1.6-.9z",
    },
    {
      name: "ReactJs",
      color: "#95fde3",
      svg: "M12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 6c5.8 0 10 2.4 10 6s-4.2 6-10 6S2 15.6 2 12s4.2-6 10-6zm0 0c2 0 3.5 3.8 3.5 8.5S14 23 12 23s-3.5-3.8-3.5-8.5S10 1 12 1zm0 0",
    },
    {
      name: "MySQL",
      color: "#2fff05",
      svg: "M12 3C7 3 3 5.7 3 9v6c0 3.3 4 6 9 6s9-2.7 9-6V9c0-3.3-4-6-9-6zm0 2c4.4 0 7 2.1 7 4s-2.6 4-7 4-7-2.1-7-4 2.6-4 7-4zm7 10c0 1.9-2.6 4-7 4s-7-2.1-7-4v-1.4C6.8 15.5 9.2 16 12 16s5.2-.5 7-1.4V15zm0-4c0 1.9-2.6 4-7 4s-7-2.1-7-4v-1.4C6.8 11.5 9.2 12 12 12s5.2-.5 7-1.4V11z",
    },
    {
      name: "Java",
      color: "#f10014",
      svg: "M8.5 18.5s-.8.5.6.6c1.6.2 2.5.2 4.3-.1 0 0 .5.3 1.1.5-3.9 1.7-8.8-.1-6-1zM8 16.3s-.9.7.5.8c1.8.2 3.2.2 5.6-.3 0 0 .3.3.8.5-5 1.5-10.5.1-6.9-1zM13.5 11.2c1 1.1-.3 2.2-.3 2.2s2.6-1.3 1.4-3c-1.1-1.5-2-2.3 2.7-4.9 0 0-7.3 1.8-3.8 5.7zM19.1 19.7s.6.5-.7.9c-2.4.7-10 1-12.1 0-.8-.3.7-.8.7-.8s-.7-.5-1.7-.3c-2.4.5 3.3 1.8 8.5 1 3.9-.6 5.3-2.1 5.3-2.1l-4.2 1.3H19.1zM8.8 14s-3.8.9-1.3 1.2c1 .1 3 .1 4.9-.1 1.5-.2 3.1-.5 3.1-.5s-.5.2-1 .5c-3.8 1-11.2.5-9.1-.5 1.9-1 3.4-.6 3.4-.6zm6.7 3.7c3.9-2 2.1-4 .8-3.7-.3.1-.5.2-.5.2s.1-.2.4-.3c3-1 5.3 3.1-.8 4.8 0 0 .1-.1.1-.3v-.7zM14 3s2.2 2.2-2.1 5.6c-3.4 2.7-.8 4.2 0 6-2-1.8-3.4-3.4-2.4-4.9C11 8 14.9 7.1 14 3z",
    },
  ];

  const canvas = document.getElementById("techCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const N = 5500;
  const DUR = { globe: 20, morphOut: 20, show: 20, morphIn: 20 };
  let W, H, CX, CY, GLOBE_R;
  let skillIdx = 0,
    phase = "globe",
    phaseT = 0;
  let particles = [],
    targetPts = [],
    rotY = 0,
    rotX = 0.5;
  window.techGlobeState = {
    skills,
    getSkillIndex: () => skillIdx,
  };

  function resize() {
    const box = canvas.parentElement;
    W = box.offsetWidth;
    H = box.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    CX = W / 2;
    CY = H * 0.38;
    GLOBE_R = Math.min(W, H) * 0.38;

    /* ============================================================ */
    /* TOOLS MARQUEE POPULATION SCRIPT                              */
    /* ============================================================ */
    (function () {
      const toolsList = [
        {
          name: "Codex",
          icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg" alt="Codex" style="width: 55px; height: 55px; object-fit: contain; filter: invert(1) drop-shadow(0 0 5px rgba(255,255,255,0.3));" />',
        },
        {
          name: "Antigravity",
          icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Antigravity" style="width: 55px; height: 55px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));" />',
        },
        {
          name: "Claude",
          icon: '<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/claude.svg" alt="Claude" style="width: 55px; height: 55px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));" />',
        },
        {
          name: "Eclipse",
          icon: '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/eclipse/eclipse-original.svg" alt="Eclipse" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
        {
          name: "VS Code",
          icon: '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg" alt="VS Code" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
        {
          name: "Canva",
          icon: '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/canva/canva-original.svg" alt="Canva" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
        {
          name: "Figma",
          icon: '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg" alt="Figma" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
        {
          name: "Oracle10g",
          icon: '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/oracle/oracle-original.svg" alt="Oracle" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
        {
          name: "NetBeans",
          icon: '<img src="https://upload.wikimedia.org/wikipedia/commons/9/98/Apache_NetBeans_Logo.svg" alt="NetBeans" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" />',
        },
      ];

      const toolSvgTemplate = `
  <svg xmlns="http://www.w3.org/2000/svg" height="200" width="200">
    <g style="order: -1;">
      <polygon transform="rotate(45 100 100)" stroke-width="1" stroke="#109cd3" fill="none" points="70,70 148,50 130,130 50,150" class="svg-bounce"></polygon>
      <polygon transform="rotate(45 100 100)" stroke-width="1" stroke="#109cd3" fill="none" points="70,70 148,50 130,130 50,150" class="svg-bounce2"></polygon>
      <polygon transform="rotate(45 100 100)" stroke-width="2" stroke="" fill="#414750" points="70,70 150,50 130,130 50,150"></polygon>
      <polygon stroke-width="2" stroke="" fill="url(#gradiente)" points="100,70 150,100 100,130 50,100"></polygon>
      <defs>
        <linearGradient y2="100%" x2="10%" y1="0%" x1="0%" id="gradiente">
          <stop style="stop-color: #1e2026;stop-opacity:1" offset="20%"></stop>
          <stop style="stop-color:#414750;stop-opacity:1" offset="60%"></stop>
        </linearGradient>
      </defs>
      <polygon transform="translate(20, 31)" stroke-width="2" stroke="" fill="#0f7fb7" points="80,50 80,75 80,99 40,75"></polygon>
      <polygon transform="translate(20, 31)" stroke-width="2" stroke="" fill="url(#gradiente2)" points="40,-40 80,-40 80,99 40,75"></polygon>
      <defs>
        <linearGradient y2="100%" x2="0%" y1="-17%" x1="10%" id="gradiente2">
          <stop style="stop-color: #109cd300;stop-opacity:1" offset="20%"></stop>
          <stop style="stop-color:#109cd354;stop-opacity:1" offset="100%" class="svg-animatedStop"></stop>
        </linearGradient>
      </defs>
      <polygon transform="rotate(180 100 100) translate(20, 20)" stroke-width="2" stroke="" fill="#109cd3" points="80,50 80,75 80,99 40,75"></polygon>
      <polygon transform="rotate(0 100 100) translate(60, 20)" stroke-width="2" stroke="" fill="url(#gradiente3)" points="40,-40 80,-40 80,85 40,110.2"></polygon>
      <defs>
        <linearGradient y2="100%" x2="10%" y1="0%" x1="0%" id="gradiente3">
          <stop style="stop-color: #109cd300;stop-opacity:1" offset="20%"></stop>
          <stop style="stop-color:#109cd354;stop-opacity:1" offset="100%" class="svg-animatedStop"></stop>
        </linearGradient>
      </defs>
      <polygon transform="rotate(45 100 100) translate(80, 95)" stroke-width="2" stroke="" fill="#a1d5ff" points="5,0 5,5 0,5 0,0" class="svg-particles"></polygon>
      <polygon transform="rotate(45 100 100) translate(80, 55)" stroke-width="2" stroke="" fill="#69a8cc" points="6,0 6,6 0,6 0,0" class="svg-particles"></polygon>
      <polygon transform="rotate(45 100 100) translate(70, 80)" stroke-width="2" stroke="" fill="#fff" points="2,0 2,2 0,2 0,0" class="svg-particles"></polygon>
      <polygon stroke-width="2" stroke="" fill="#292d34" points="29.5,99.8 100,142 100,172 29.5,130"></polygon>
      <polygon transform="translate(50, 92)" stroke-width="2" stroke="" fill="#1f2127" points="50,50 120.5,8 120.5,35 50,80"></polygon>
    </g>
  </svg>
  `;

      document.addEventListener("DOMContentLoaded", () => {
        const track = document.getElementById("toolsMarqueeTrack");
        if (track) {
          let innerHTML = '<div class="marquee-content">';

          const renderItem = (t, i) => {
            let svgHTML = toolSvgTemplate.replace(
              /gradiente/g,
              `gradiente_${i}`,
            );
            return `
          <div class="tool-item">
            <div class="tool-svg-box">
              ${svgHTML}
              <div class="tool-icon-float">${t.icon}</div>
            </div>
            <p class="tool-name-text">${t.name}</p>
          </div>
        `;
          };

          toolsList.forEach((t, i) => (innerHTML += renderItem(t, i)));
          innerHTML += '</div><div class="marquee-content">';
          // Duplicate for infinite effect
          toolsList.forEach(
            (t, i) => (innerHTML += renderItem(t, i + toolsList.length)),
          );
          innerHTML += "</div>";
          track.innerHTML = innerHTML;
        }
      });
    })();
    rebuildAll();
  }

  function mkGlobePts() {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      pts.push({
        sx: Math.sin(phi) * Math.cos(theta),
        sy: Math.sin(phi) * Math.sin(theta),
        sz: Math.cos(phi),
      });
    }
    return pts;
  }

  function sampleOff(cnv, count) {
    const c2 = cnv.getContext("2d");
    const { width: W2, height: H2 } = cnv;
    const d = c2.getImageData(0, 0, W2, H2).data,
      pts = [];
    for (let y = 0; y < H2; y += 1)
      for (let x = 0; x < W2; x += 1)
        if (d[(y * W2 + x) * 4 + 3] > 80)
          pts.push({
            x: CX - 400 + x, // offset to center on real canvas
            y: CY - 160 + y,
          });
    if (!pts.length)
      return Array.from({ length: count }, () => ({ x: CX, y: CY }));
    return Array.from(
      { length: count },
      () => pts[(Math.random() * pts.length) | 0],
    );
  }

  function buildTargets(sk) {
    const off = document.createElement("canvas");
    off.width = 800; // fixed small size instead of full W,H
    off.height = 500;
    const c2 = off.getContext("2d");
    const iconSize = Math.min(800, 500) * 0.18;
    const sc = iconSize / 12;
    c2.save();
    c2.translate(400 - sc * 12, 250 - sc * 15);
    c2.scale(sc, sc);
    c2.fillStyle = "#fff";
    try {
      c2.fill(new Path2D(sk.svg));
    } catch (e) { }
    c2.restore();
    const fs = Math.min(800 * 0.12, 500 * 0.16, sk.name.length > 6 ? 90 : 110);
    c2.font = `900 ${fs}px Arial Black,Impact,sans-serif`;
    c2.fillStyle = "#fff";
    c2.textAlign = "center";
    c2.textBaseline = "top";
    c2.fillText(sk.name, 400, 250 + iconSize * 0.6);
    return sampleOff(off, N);
  }

  function project(sx, sy, sz, ry, rx) {
    let x1 = sx * Math.cos(ry) - sz * Math.sin(ry);
    let z1 = sx * Math.sin(ry) + sz * Math.cos(ry);
    let y1 = sy * Math.cos(rx) - z1 * Math.sin(rx);
    let z2 = sy * Math.sin(rx) + z1 * Math.cos(rx);
    const fov = 600,
      sc = fov / (fov + z2 * GLOBE_R * 0.6 + GLOBE_R * 1.2);
    return { px: x1 * GLOBE_R * sc + CX, py: y1 * GLOBE_R * sc + CY, sc };
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const gpts = mkGlobePts();

  function rebuildAll() {
    targetPts = buildTargets(skills[skillIdx]);
    particles = [];
    for (let i = 0; i < N; i++) {
      const g = gpts[i % gpts.length];
      const { px, py, sc } = project(g.sx, g.sy, g.sz, rotY, rotX);
      particles.push({
        sx: g.sx,
        sy: g.sy,
        sz: g.sz,
        x: px,
        y: py,
        tx: targetPts[i].x,
        ty: targetPts[i].y,
        size: 0.3 + Math.random() * 0.45,
        sc,
      });
    }
  }

  function refreshTargets() {
    targetPts = buildTargets(skills[skillIdx]);
    for (let i = 0; i < N; i++) {
      particles[i].tx = targetPts[i].x;
      particles[i].ty = targetPts[i].y;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.shadowBlur = 0;

    const col = skills[skillIdx].color;
    phaseT++;
    if (phase === "globe") {
      rotY += 0.009;
      rotX += 0.0015;
      for (let i = 0; i < N; i++) {
        const p = particles[i];
        const { px, py, sc } = project(p.sx, p.sy, p.sz, rotY, rotX);
        p.x = px;
        p.y = py;
        p.sc = sc;
        ctx.globalAlpha = Math.min(1, 0.35 + sc * 0.55);
        ctx.shadowBlur = 0;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, p.size * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      if (phaseT >= DUR.globe) {
        phase = "morphOut";
        phaseT = 0;
      }
    } else if (phase === "morphOut") {
      const t = ease(Math.min(phaseT / DUR.morphOut, 1));
      rotY += 0.009 * (1 - t);
      for (let i = 0; i < N; i++) {
        const p = particles[i];
        const { px, py } = project(p.sx, p.sy, p.sz, rotY, rotX);
        const nx = lerp(px, p.tx, t),
          ny = lerp(py, p.ty, t);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = col;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(nx, ny, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (phaseT >= DUR.morphOut) {
        phase = "show";
        phaseT = 0;
      }
    } else if (phase === "show") {
      for (let i = 0; i < N; i++) {
        const p = particles[i];
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = col;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(
          p.tx + (Math.random() - 0.5) * 0.4,
          p.ty + (Math.random() - 0.5) * 0.4,
          p.size,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      if (phaseT >= DUR.show) {
        phase = "morphIn";
        phaseT = 0;
      }
    } else if (phase === "morphIn") {
      const t = ease(Math.min(phaseT / DUR.morphIn, 1));
      rotY += 0.009 * t;
      for (let i = 0; i < N; i++) {
        const p = particles[i];
        const { px, py } = project(p.sx, p.sy, p.sz, rotY, rotX);
        const nx = lerp(p.tx, px, t),
          ny = lerp(p.ty, py, t);
        ctx.globalAlpha = (1 - t * 0.3) * 0.88;
        ctx.fillStyle = col;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(nx, ny, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (phaseT >= DUR.morphIn) {
        skillIdx = (skillIdx + 1) % skills.length;
        refreshTargets();
        phase = "globe";
        phaseT = 0;
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  canvas.addEventListener("click", () => {
    phaseT = 9999;
  });
  window.addEventListener("resize", resize);
  resize();
  draw();
})();
// Tech globe skill pill highlight sync
const pills = document.querySelectorAll(".skill-pill");

function highlightPill(idx) {
  const skillState = window.techGlobeState;
  const skills = skillState?.skills || [];

  pills.forEach((p, i) => {
    const color =
      skills[i]?.color ||
      getComputedStyle(p).getPropertyValue("--c").trim() ||
      "#fff";
    p.style.transform = i === idx ? "translateY(-4px) scale(1.1)" : "";
    p.style.background = i === idx ? color : "transparent";
    p.style.color = i === idx ? "#000" : color;
    p.style.boxShadow = i === idx ? `0 0 18px ${color}, 0 0 36px ${color}` : "";
  });
}

// Poll skillIdx every 200ms to keep pill in sync with globe
if (pills.length) {
  highlightPill(window.techGlobeState?.getSkillIndex?.() ?? 0);
  setInterval(() => {
    highlightPill(window.techGlobeState?.getSkillIndex?.() ?? 0);
  }, 200);
}

// Section reveal and parallax effects
function init3DParallax() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  // 1. Deep Background Parallax
  // Instead of translating the whole div (which exposes the top edge),
  // we scroll the CSS grid lines infinitely within the div.
  // We skip #vanta-bg because its internal WebGL stars already provide deep movement.
  gsap.fromTo(
    ".grid-bg",
    { backgroundPositionY: "0px" },
    {
      backgroundPositionY: "300px",
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    },
  );

  // 2. Sections 3D Treasure Reveals
  const treasureSections = document.querySelectorAll(
    ".home-container, .about-container, .project, .services-container, .contact-content",
  );

  treasureSections.forEach((section) => {
    gsap.fromTo(
      section,
      {
        y: 38,
        scale: 0.985,
        rotationX: 5,
        opacity: 0.5,
        filter: "brightness(0.92) blur(2px)",
      },
      {
        y: 0,
        scale: 1,
        rotationX: 0,
        opacity: 1,
        filter: "brightness(1) blur(0px)",
        transformOrigin: "center center",
        transformStyle: "preserve-3d",
        duration: 0.62,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 92%",
          toggleActions: "play none none reverse",
        },
      },
    );
  });

  const serviceCards = gsap.utils.toArray(".service-card");
  if (serviceCards.length) {
    gsap.fromTo(
      serviceCards,
      {
        y: 70,
        rotationX: -18,
        rotationY: (index) => (index % 2 === 0 ? -10 : 10),
        opacity: 0,
        transformOrigin: "center center",
      },
      {
        y: 0,
        rotationX: 0,
        rotationY: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".services-container",
          start: "top 86%",
          toggleActions: "play none none reverse",
        },
      },
    );
  }

  // 3. Component-level Parallax (Forefront)
  const floaters = [
    { sel: ".id-pivot", speed: -15 }, // ID Card rises faster
    { sel: ".globe-box", speed: -10 }, // Globe rises a bit faster
    { sel: ".tl-wrap", speed: 10 }, // Timeline drags down slightly
    { sel: ".pv-stage", speed: -12 }, // Project holographic stage floats up
    { sel: ".about .container", speed: -8 }, // About photo drifts up slightly
    { sel: ".gallery .slider", speed: -6 }, // Gallery slider drifts up slightly
  ];

  floaters.forEach((obj) => {
    const el = document.querySelector(obj.sel);
    if (el) {
      gsap.fromTo(
        el,
        { yPercent: 0 },
        {
          yPercent: obj.speed,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest("section") || el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }
  });
}

console.clear();

// Gallery slider math and DOM helpers
const wrap = (n, max) => (n + max) % max;
const lerp = (a, b, t) => a + (b - a) * t;

// DOM utilities
const isHTMLElement = (el) => el instanceof HTMLElement;

const genId = (() => {
  let count = 0;
  return () => {
    return (count++).toString();
  };
})();

class Raf {
  constructor() {
    this.rafId = 0;
    this.raf = this.raf.bind(this);
    this.callbacks = [];

    this.start();
  }

  start() {
    this.raf();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  raf() {
    this.callbacks.forEach(({ callback, id }) => callback({ id }));
    this.rafId = requestAnimationFrame(this.raf);
  }

  add(callback, id) {
    this.callbacks.push({ callback, id: id || genId() });
  }

  remove(id) {
    this.callbacks = this.callbacks.filter((callback) => callback.id !== id);
  }
}

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  lerp(v, t) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
  }
}

const vec2 = (x = 0, y = 0) => new Vec2(x, y);

function tilt(node, options) {
  let { trigger, target } = resolveOptions(node, options);

  let lerpAmount = 0.06;

  const rotDeg = { current: vec2(), target: vec2() };
  const bgPos = { current: vec2(), target: vec2() };

  const update = (newOptions) => {
    destroy();
    ({ trigger, target } = resolveOptions(node, newOptions));
    init();
  };

  let rafId;

  function ticker({ id }) {
    rafId = id;

    rotDeg.current.lerp(rotDeg.target, lerpAmount);
    bgPos.current.lerp(bgPos.target, lerpAmount);

    for (const el of target) {
      el.style.setProperty("--rotX", rotDeg.current.y.toFixed(2) + "deg");
      el.style.setProperty("--rotY", rotDeg.current.x.toFixed(2) + "deg");

      el.style.setProperty("--bgPosX", bgPos.current.x.toFixed(2) + "%");
      el.style.setProperty("--bgPosY", bgPos.current.y.toFixed(2) + "%");
    }
  }

  const onMouseMove = ({ offsetX, offsetY }) => {
    lerpAmount = 0.1;

    for (const el of target) {
      const ox = (offsetX - el.clientWidth * 0.5) / (Math.PI * 3);
      const oy = -(offsetY - el.clientHeight * 0.5) / (Math.PI * 4);

      rotDeg.target.set(ox, oy);
      bgPos.target.set(-ox * 0.3, oy * 0.3);
    }
  };

  const onMouseLeave = () => {
    lerpAmount = 0.06;

    rotDeg.target.set(0, 0);
    bgPos.target.set(0, 0);
  };

  const addListeners = () => {
    trigger.addEventListener("mousemove", onMouseMove);
    trigger.addEventListener("mouseleave", onMouseLeave);
  };

  const removeListeners = () => {
    trigger.removeEventListener("mousemove", onMouseMove);
    trigger.removeEventListener("mouseleave", onMouseLeave);
  };

  const init = () => {
    addListeners();
    raf.add(ticker);
  };

  const destroy = () => {
    removeListeners();
    raf.remove(rafId);
  };

  init();

  return { destroy, update };
}

function resolveOptions(node, options) {
  return {
    trigger: options?.trigger ?? node,
    target: options?.target
      ? Array.isArray(options.target)
        ? options.target
        : [options.target]
      : [node],
  };
}

// -----------------------------------------------------

// Shared RAF instance for slider effects
const raf = new Raf();

let galleryChange = null;

// ---------- tiny synthesized "whoosh" for the gallery voyage transition ----------
// No audio file needed — this is a short frequency-swept oscillator burst.
let __galleryAudioCtx = null;
function playGalleryWhoosh(direction) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__galleryAudioCtx) __galleryAudioCtx = new AC();
    const ac = __galleryAudioCtx;

    const run = () => {
      const now = ac.currentTime;
      const bufferSize = ac.sampleRate * 0.5; // 0.5s of noise
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ac.createBufferSource();
      noise.buffer = buffer;

      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.9;
      const startFreq = direction < 0 ? 1800 : 300;
      const endFreq = direction < 0 ? 300 : 1800;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.5);

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.5);
    };

    if (ac.state === "suspended") { ac.resume().then(run).catch(() => { }); return; }
    run();
  } catch (e) { /* never break the gallery */ }
}

function setGalleryItemState(item, state) {
  if (!item) return;

  ["data-current", "data-next", "data-previous", "data-far"].forEach((attr) => {
    item.slide.removeAttribute(attr);
    item.slideInfo.removeAttribute(attr);
    item.slideBg.removeAttribute(attr);
  });

  item.slide.setAttribute(`data-${state}`, "");
  item.slideInfo.setAttribute(`data-${state}`, "");
  item.slideBg.setAttribute(`data-${state}`, "");

  item.slide.style.zIndex =
    state === "current" ? "20" : state === "previous" ? "30" : state === "next" ? "10" : "0";
  item.slideInfo.style.zIndex = state === "current" ? "70" : state === "far" ? "0" : "55";
}

// Initialize the circular gallery slider
function init() {
  const gallery = document.querySelector(".gallery");
  if (!gallery) return;

  const loader = gallery.querySelector(".loader");
  const slides = [...gallery.querySelectorAll(".slides .slide")];
  const slidesInfo = [...gallery.querySelectorAll(".slides--infos .slide-info")];
  const slideBgs = [...gallery.querySelectorAll(".slides .slide__bg")];
  const buttons = {
    prev: gallery.querySelector(".slider--btn__prev"),
    next: gallery.querySelector(".slider--btn__next"),
  };

  const totalItems = Math.min(slides.length, slidesInfo.length, slideBgs.length);
  if (!totalItems) {
    if (loader) {
      loader.style.opacity = 0;
      loader.style.pointerEvents = "none";
    }
    return;
  }

  if (slides.length !== slidesInfo.length || slides.length !== slideBgs.length) {
    console.warn("Gallery slider: slide, info, and background counts should match.");
  }

  const galleryItems = Array.from({ length: totalItems }, (_, index) => ({
    slide: slides[index],
    slideInfo: slidesInfo[index],
    slideBg: slideBgs[index],
  }));

  let currentIndex = galleryItems.findIndex((item) =>
    item.slide.hasAttribute("data-current"),
  );
  if (currentIndex < 0) currentIndex = 0;

  galleryItems.forEach((item) => {
    const slideInner = item.slide.querySelector(".slide__inner");
    const slideInfoInner = item.slideInfo.querySelector(".slide-info__inner");

    if (slideInner && slideInfoInner) {
      tilt(item.slide, { target: [slideInner, slideInfoInner] });
    }
  });

  const updateGallery = (index) => {
    currentIndex = wrap(index, galleryItems.length);
    const nextIndex = wrap(currentIndex + 1, galleryItems.length);
    const previousIndex = wrap(currentIndex - 1, galleryItems.length);

    galleryItems.forEach((item, itemIndex) => {
      let state = "far";
      if (itemIndex === currentIndex) state = "current";
      else if (itemIndex === nextIndex) state = "next";
      else if (itemIndex === previousIndex) state = "previous";

      setGalleryItemState(item, state);
    });
  };

  galleryChange = (direction) => {
    playGalleryWhoosh(direction);
    updateGallery(currentIndex + direction);
  };

  updateGallery(currentIndex);

  if (loader) {
    loader.style.opacity = 0;
    loader.style.pointerEvents = "none";
  }

  buttons.prev?.addEventListener("click", () => galleryChange?.(-1));
  buttons.next?.addEventListener("click", () => galleryChange?.(1));
}

// Preload gallery images and advance the loader
function setup() {
  const gallery = document.querySelector(".gallery");
  if (!gallery) return;

  const loader = gallery.querySelector(".loader");
  const loaderText = gallery.querySelector(".loader__text");
  const images = [...gallery.querySelectorAll(".slide--image")];

  if (!images.length) {
    init();
    return;
  }

  let loadedImages = 0;
  const progress = {
    current: 0,
    target: 0,
  };

  const markLoaded = () => {
    loadedImages += 1;
    progress.target = loadedImages / images.length;
  };

  images.forEach((image) => {
    if (image.complete) {
      markLoaded();
      return;
    }

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
  });

  raf.add(({ id }) => {
    progress.current = lerp(progress.current, progress.target, 0.08);

    if (loaderText) {
      loaderText.textContent = `${Math.round(progress.current * 100)}%`;
    }

    if (progress.current >= 0.995) {
      if (loaderText) {
        loaderText.textContent = "100%";
      }

      init();

      if (loader) {
        loader.style.opacity = 0;
        loader.style.pointerEvents = "none";
      }

      raf.remove(id);
    }
  });
}

// Start
setup();