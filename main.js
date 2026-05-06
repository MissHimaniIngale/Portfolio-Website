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
let scrollTimeout;

window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);

  let currentScroll = window.scrollY;

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

  let scrollPos = currentScroll + 100;

  sections.forEach((section) => {
    if (
      scrollPos >= section.offsetTop &&
      scrollPos < section.offsetTop + section.offsetHeight
    ) {
      removeActive();
      const activeLink = document.querySelector(
        `.ul-list li a[href="#${section.id}"]`,
      );
      if (activeLink) activeLink.parentElement.classList.add("active");
    }
  });

  if (window.scrollY > 500) {
    backToTop.style.display = "flex";
  } else {
    backToTop.style.display = "none";
  }
}, { passive: true });

// Cursor effects and background music setup
const glow = document.querySelector(".cursor-glow");
const cursorStar = document.querySelector(".cursor-star");
const BACKGROUND_TRACK_PATHS = [
  "audio/harry-potter-instrumental.mp3.mp3",
];
let backgroundMusic = null;
let backgroundMusicStarted = false;
let backgroundTrackIndex = 0;
let backgroundMusicPendingStart = false;
let backgroundMusicEnabled = false;

if (window.matchMedia("(pointer:fine)").matches) {
  document.body.classList.add("custom-cursor");
}

let cursorX = 0, cursorY = 0;
let ticking = false;

function updateCursorPosition() {
  glow.style.left = cursorX + "px";
  glow.style.top = cursorY + "px";

  if (cursorStar) {
    cursorStar.style.left = cursorX + "px";
    cursorStar.style.top = cursorY + "px";
  }
  ticking = false;
}

document.addEventListener("pointermove", (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;

  if (!ticking) {
    requestAnimationFrame(updateCursorPosition);
    ticking = true;
  }
});

// Create and cache the background audio element
function getBackgroundMusic() {
  if (backgroundMusic) return backgroundMusic;

  backgroundTrackIndex = 0;
  backgroundMusic = new Audio(BACKGROUND_TRACK_PATHS[backgroundTrackIndex]);
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.5;
  backgroundMusic.preload = "auto";

  backgroundMusic.addEventListener("ended", () => {
    if (backgroundMusicEnabled) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(() => { });
    }
  });

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
   Before </body>: <script src="idcard.js" defer></script>

   HOW THE PHYSICS WORKS
   ─────────────────────
   The card is a pendulum. Its state is one number: `angle` (degrees
   from vertical). The pivot is the nail at the top of .id-pivot.

   DRAG:
     We compute the nail's screen position every frame.
     On mousemove we measure the vector from nail → cursor,
     convert that to an angle (atan2), and set the pendulum angle
     directly. This means the card physically follows the cursor
     as if you were holding the bottom of the cord — true cord-pull.

   RELEASE:
     We record the last two angles to get instantaneous angular
     velocity at release. The pendulum then integrates freely with
     gravity + damping, overshooting the center multiple times
     (rubber-band effect) before settling.

   IDLE:
     Very slow sine-wave sway. Low amplitude, very low frequency.
============================================================ */

// Hero hanging ID card interaction
(function () {
  const { gsap, Draggable } = window;
  if (!gsap || !Draggable) return;

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
  const card = document.querySelector(".id-card");
  if (!pivot || !hanging || !card) return;

  // 1. Setup the continuously swinging pendulum (±45 deg)
  gsap.set(pivot, { transformOrigin: "top center" });
  let swingAnim = gsap.fromTo(
    pivot,
    { rotation: -15 },
    {
      rotation: 15,
      ease: "power1.inOut", // Smooth sine-like ease
      duration: 6, // Greatly slowed down the swing movement
      repeat: -1,
      yoyo: true,
    },
  );

  const svgCord = document.querySelector(".id-cord-svg");
  if (svgCord) {
    gsap.set(svgCord, { transformOrigin: "top center" });
  }

  function updateCord() {
    if (!svgCord) return;
    let xOffset = gsap.getProperty(hanging, "x") || 0;
    let yOffset = gsap.getProperty(hanging, "y") || 0;

    // Base cord height is roughly 100px.
    let dx = xOffset;
    let dy = 100 + yOffset;

    let length = Math.sqrt(dx * dx + dy * dy);
    let scaleY = length / 100;
    let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);

    // Anchor the top to the nail by undoing the hanging's translation,
    // then scale and point it appropriately towards the clip.
    gsap.set(svgCord, {
      x: -xOffset,
      y: -yOffset,
      scaleY: scaleY,
      rotation: -angleDeg,
    });
  }

  let isHovered = false;

  hanging.addEventListener("mouseenter", () => {
    isHovered = true;
    gsap.to(swingAnim, { timeScale: 0, duration: 0.5, ease: "power2.out" }); // Stop swinging
  });

  hanging.addEventListener("mouseleave", () => {
    isHovered = false;
    let dragInst = Draggable.get(hanging);
    if (!dragInst || !dragInst.isDragging) {
      gsap.to(swingAnim, { timeScale: 1, duration: 1.5, ease: "power2.in" }); // Resume swinging
    }
  });

  // 2. Make the ID Card draggable from any side elastically.
  Draggable.create(hanging, {
    type: "x,y",
    trigger: card,
    bounds: { minX: -180, maxX: 180, minY: -50, maxY: 180 }, // gives enough string stretch
    edgeResistance: 0.8, // huge resistance to feel like strong elastic tension
    onDragStart: () => {
      pivot.style.cursor = "grabbing";
      gsap.to(swingAnim, { timeScale: 0, duration: 0.2 }); // Ensure it stops swinging while dragging
    },
    onDrag: updateCord,
    onRelease: function () {
      pivot.style.cursor = "";
      // Big bouncy snap back to origin
      gsap.to(hanging, {
        x: 0,
        y: 0,
        duration: 1.8,
        ease: "elastic.out(1, 0.4)", // Snappy elastic effect
        onUpdate: updateCord,
      });
      // Return swing speed back to normal ONLY if not still hovering
      if (!isHovered) {
        gsap.to(swingAnim, { timeScale: 1, duration: 1.5, ease: "power2.out" });
      }
    },
  });

  // 3. Scroll influence
  let scrollTimeout;
  let lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      let dragInst = Draggable.get(hanging);
      if (isHovered || (dragInst && dragInst.isDragging)) return; // Don't act up if user interacts

      const dy = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;

      // Speed up the swing slightly if scrolling fast
      let targetSpeed = 1 + dy * 0.08;
      targetSpeed = Math.min(targetSpeed, 4); // Max 4x speed

      gsap.to(swingAnim, { timeScale: targetSpeed, duration: 0.2 });

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // return back to slow normal speed if not interacted with
        if (!isHovered && (!dragInst || !dragInst.isDragging)) {
          gsap.to(swingAnim, {
            timeScale: 1,
            duration: 1.5,
            ease: "power2.out",
          });
        }
      }, 150);
    },
    { passive: true },
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
      { once: true },
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
      { threshold: 0.25 },
    );
    obs.observe(homeEl);
  } else {
    setTimeout(triggerDrop, 350);
  }
})();
// Project carousel data
const projects = [
  {
    title: "ATM-Simulator",
    desc: "ATM Simulator which manages ATM operatons ,generating PIN numbers,Card numbers and Handling ATM transactons.",
    tags: ["HTML", "JavaSwing", "AWT", "MySQL"],
    img: "images/ATM Simulator.jpeg",
    github: "https://github.com/MissHimaniIngale/ATM-Simulator.git",
    demo: "demo/ATM Simulator.mp4"
  },
  {
    title: "Portfolio Website",
    desc: "Built an Apple website clone using React and Material UI with reusable components, replicating Apple’s minimal design and layout.",
    tags: ["HTML", "CSS", "JavaScript"],
    img: "images/Porfolio.jpeg",
    github: "https://github.com/MissHimaniIngale/Portfolio-Website.git",
    demo: "demo/Himani-Portfolio.mp4"
  },
  {
    title: "Apple Clone App",
    desc: "Built an Apple website clone using React and Material UI with a reusable, component-based design, replicating Apple’s minimal UI and layout structure.",
    tags: ["HTML", "CSS", "ReactJS"],
    img: "images/Apple clone app (1).png",
    github: "https://github.com/MissHimaniIngale/Apple-Clone.git",
    demo: "demo/apple clone app.mp4"
  },
  {
    title: "Binge ur ब्या ",
    desc: "Developed the frontend of a role-based wedding booking platform with real-time features using Django and MongoDB.",
    tags: ["HTML", "CSS", "JS", "Django", "Python", "MongoDB"],
    img: "images/Binge ur Bya.png",
    github: "https://github.com/MissHimaniIngale/Binge-Ur-Bya.git",
    demo: "demo/Binge ur ब्या.mp4"
  },
];

// Project carousel elements and state
const track = document.getElementById("carouselTrack");
const dotsEl = document.getElementById("navDots");
const wrapper = document.getElementById("carouselWrapper");
let current = 0,
  autoTimer = null,
  isPaused = false;

const cards = projects.map((p, i) => {
  const card = document.createElement("div");
  card.className = "project-card";
  card.innerHTML = `
    <img class="card-img" src="${p.img}" alt="${p.title}">
    <div class="card-body">
      <div class="card-title">${p.title}</div>
      <div class="card-desc">${p.desc}</div>
      <div class="card-tags">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="card-btns">
        ${p.github ? `<a href="${encodeURI(p.github)}" target="_blank" class="cbtn cbtn-gh">GitHub</a>` : ""}
        ${p.demo ? `<a href="${encodeURI(p.demo)}" target="_blank" class="cbtn cbtn-live">Live Demo</a>` : ""}
      </div>
    </div>`;
  card.addEventListener("mouseenter", () => {
    isPaused = true;
    clearInterval(autoTimer);
  });
  card.addEventListener("mouseleave", () => {
    isPaused = false;
    startAuto();
  });
  card.addEventListener("click", (e) => {
    if (e.target.closest("a")) return; // let native link click happen
    if (i !== current) goTo(i);
  });
  track.appendChild(card);
  return card;
});

const dots = projects.map((_, i) => {
  const d = document.createElement("div");
  d.className = "dot";
  d.addEventListener("click", () => goTo(i));
  dotsEl.appendChild(d);
  return d;
});

const TILT_DEG = 28;
const TILT_RAD = (TILT_DEG * Math.PI) / 180;

// Position project cards in the circular carousel
function layout() {
  const n = projects.length;
  const ww = wrapper.offsetWidth;
  const cx = ww / 2;
  const cy = 210;
  const rx = Math.min(ww * 0.48);
  const ry = 90;
  const cardW = 370,
    cardH = 370;
  const themeAccentRgb =
    getComputedStyle(document.body)
      .getPropertyValue("--theme-accent-rgb")
      .trim() || "0,229,255";

  cards.forEach((card, i) => {
    const rel = (i - current + n) % n;
    const angle = (rel / n) * 2 * Math.PI - Math.PI / 2;
    const ex = Math.cos(angle);
    const ey = Math.sin(angle);

    const tiltShift = (cx - (cx + rx * ex)) * Math.tan(TILT_RAD) * 0.55;
    const finalX = cx + rx * ex - cardW / 2;
    const finalY = cy + ry * ey - tiltShift - cardH / 2;

    const isActive = rel === 0;
    const isSide = rel === 1 || rel === n - 1;
    const scale = isActive ? 1 : isSide ? 0.8 : 0.62;
    const blur = isActive ? 0 : isSide ? 3 : 7;
    const opacity = isActive ? 1 : isSide ? 0.58 : 0.28;
    const rotateY = isActive ? 0 : rel <= n / 2 ? -20 : 20;

    card.style.cssText = `
      left:${finalX}px; top:${finalY}px; width:${cardW}px;
      transform:scale(${scale}) rotateY(${rotateY}deg);
      filter:blur(${blur}px); opacity:${opacity};
      z-index:${isActive ? 10 : isSide ? 5 : 1};
      box-shadow:0 0 ${isActive ? 35 : 10}px rgba(${themeAccentRgb},${isActive ? 0.4 : 0}),inset 0 0 20px rgba(${themeAccentRgb},0.03);
      border-color:rgba(${themeAccentRgb},${isActive ? 0.55 : 0.15});
      transition:all 0.65s cubic-bezier(0.25,0.8,0.25,1);
    `;
    card.classList.toggle("active", isActive);
    dots[i].classList.toggle("active", isActive);
  });
}

// Carousel navigation helpers
function goTo(idx) {
  current = ((idx % projects.length) + projects.length) % projects.length;
  layout();
}
document
  .getElementById("prevBtn")
  .addEventListener("click", () => goTo(current - 1));
document
  .getElementById("nextBtn")
  .addEventListener("click", () => goTo(current + 1));
function startAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (!isPaused) goTo(current + 1);
  }, 2800);
}
layout();
startAuto();

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(layout, 150);
});
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
    function playClick() {
      if (!clickAudio) clickAudio = new Audio(CLICK_SRC);
      clickAudio.currentTime = 0;
      clickAudio.play().catch(() => { }); // silently ignore autoplay block
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
        set(".lamp__eye", { rotate: STATE.ON ? 0 : 180 });

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

    // ── Draggable cord interaction ──
    if (window.Draggable) {
      let startX, startY;

      Draggable.create(PROXY, {
        trigger: HIT,
        type: "x,y",

        onPress(e) {
          startX = e.x;
          startY = e.y;
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
    { sel: ".carousel-wrapper", speed: -12 }, // Project carousel floats up
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

  galleryChange = (direction) => updateGallery(currentIndex + direction);

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