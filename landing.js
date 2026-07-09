(function () {
  if (typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

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
        .from(".hero-eyebrow", { autoAlpha: 0, y, duration: dur })
        .from(".hero h1", { autoAlpha: 0, y, duration: dur }, "-=0.32")
        .from(".hero-sub", { autoAlpha: 0, y, duration: dur }, "-=0.32")
        .from(".hero-buttons .btn", { autoAlpha: 0, y, duration: dur, stagger: 0.08 }, "-=0.3");

      gsap.utils.toArray(".step").forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y,
          duration: dur,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      gsap.from(".why-icon, .why-main h2, .why-main p, .why-link", {
        autoAlpha: 0,
        y,
        duration: dur,
        stagger: 0.07,
        ease: "power2.out",
        scrollTrigger: { trigger: ".why-main", start: "top 82%", once: true },
      });

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
