(function () {
  if (typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mm = gsap.matchMedia();

  mm.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      isCompact: "(max-width: 640px)",
    },
    (context) => {
      const { reduceMotion, isCompact } = context.conditions;
      if (reduceMotion) return;

      const y = isCompact ? 12 : 20;
      const dur = isCompact ? 0.35 : 0.5;

      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .from(".site-header", { autoAlpha: 0, y: -8, duration: dur * 0.8 })
        .from(".hero-eyebrow", { autoAlpha: 0, y, duration: dur }, "-=0.2")
        .from(".hero h1", { autoAlpha: 0, y, duration: dur }, "-=0.32")
        .from(".hero-sub", { autoAlpha: 0, y, duration: dur }, "-=0.32")
        .from(".hero-buttons .btn", { autoAlpha: 0, y, duration: dur, stagger: 0.08 }, "-=0.3");

      // Each step reveals as a small internal sequence (number, icon, heading,
      // body) instead of one flat block fade — reads as more deliberate.
      gsap.utils.toArray(".step").forEach((el) => {
        const tl = gsap.timeline({
          defaults: { ease: "power2.out", duration: dur * 0.85 },
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        tl.from(el.querySelector(".step-num"), { autoAlpha: 0, x: -6 })
          .from(el.querySelector(".step-icon"), { autoAlpha: 0, scale: 0.85 }, "-=0.2")
          .from(el.querySelector("h3"), { autoAlpha: 0, y: y * 0.6 }, "-=0.25")
          .from(el.querySelector("p"), { autoAlpha: 0, y: y * 0.6 }, "-=0.3");
      });

      const whyTl = gsap.timeline({
        defaults: { ease: "power2.out", duration: dur },
        scrollTrigger: { trigger: ".why-main", start: "top 82%", once: true },
      });
      whyTl
        .from(".why-icon", { autoAlpha: 0, scale: 0.85 })
        .from(".why-main h2", { autoAlpha: 0, y }, "-=0.25")
        .from(".why-main p", { autoAlpha: 0, y }, "-=0.3")
        .from(".why-link", { autoAlpha: 0, y }, "-=0.3");

      gsap.from(".why-list li", {
        autoAlpha: 0,
        y: isCompact ? 8 : 14,
        duration: dur,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: { trigger: ".why-list", start: "top 82%", once: true },
      });

      gsap.from(".tool-intro", {
        autoAlpha: 0,
        y,
        duration: dur,
        ease: "power2.out",
        scrollTrigger: { trigger: ".tool-intro", start: "top 88%", once: true },
      });
    }
  );

  // Precise micro hover: a 1-2px lift, nothing bouncy.
  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".hero-buttons .btn, .why-link, .header-link").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        gsap.to(el, { y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { y: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      });
    });
  }

  // In-page anchor links (e.g. "Aracı Kullan") glide to their target instead
  // of jumping. A long inOut ease reads as a gentle gust rather than a
  // mechanical snap; the grid backdrop dips slightly in the same breath.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      const target = targetId.length > 1 ? document.querySelector(targetId) : null;
      if (!target) return;
      e.preventDefault();

      if (reduceMotionQuery.matches) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }

      gsap.to(window, {
        duration: 1.15,
        ease: "power3.inOut",
        scrollTo: { y: target, offsetY: 16 },
      });
      const grid = document.querySelector(".bg-grid");
      if (grid) {
        gsap
          .timeline()
          .to(grid, { autoAlpha: 0.45, duration: 0.5, ease: "power2.inOut" })
          .to(grid, { autoAlpha: 1, duration: 0.65, ease: "power2.inOut" });
      }
    });
  });

  // ffmpeg.wasm's encode pass is single-threaded and CPU-heavy; free up the
  // main thread by pausing all decorative tweening and ScrollTrigger's
  // scroll listeners for the duration of the encode.
  const progressWrap = document.getElementById("progress-wrap");
  if (progressWrap) {
    const setEncoding = (encoding) => {
      if (encoding) {
        gsap.globalTimeline.pause();
        ScrollTrigger.getAll().forEach((st) => st.disable(false));
      } else {
        gsap.globalTimeline.resume();
        ScrollTrigger.getAll().forEach((st) => st.enable());
      }
    };
    new MutationObserver(() => setEncoding(!progressWrap.hidden)).observe(progressWrap, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }
})();
