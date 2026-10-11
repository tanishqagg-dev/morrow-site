"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ArrowRight, Check, FileText, ChartBar, ChatCircleText, CalendarBlank, Pause, Play } from "@phosphor-icons/react";
import styles from "./MorrowMotion.module.css";

gsap.registerPlugin(ScrollTrigger);

export function MotionControl({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return <><div className={styles.readingProgress} data-reading-progress aria-hidden="true" /><button className={styles.motionControl} onClick={onToggle} aria-pressed={paused} aria-label={paused ? "Resume animations" : "Pause animations"}>{paused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}<span>{paused ? "Motion off" : "Pause motion"}</span></button></>;
}

const papers = [
  { title: "Meeting notes", type: "THE CONVERSATIONS", Icon: ChatCircleText, text: "What we heard. What comes next.", color: "peach" },
  { title: "Product roadmap", type: "THE BIG PICTURE", Icon: ChartBar, text: "Launch dates. Loose ends. Decisions.", color: "blue" },
  { title: "Monday, sorted.", type: "THE NEXT STEPS", Icon: CalendarBlank, text: "A little more room for the real work.", color: "green" },
];

export function MorrowScrollStory() {
  return <section className={styles.story} data-scroll-story aria-labelledby="story-title">
    <div className={styles.storyStage} data-story-stage>
      <div className={styles.storyHeading}><span>A LITTLE CONTEXT GOES A LONG WAY</span><h2 id="story-title">Loose ends in.<br /><em>A clear next step out.</em></h2></div>
      <div className={styles.storyCanvas}>
        <div className={styles.orbit} aria-hidden="true" data-orbit /><div className={styles.orbitInner} aria-hidden="true" data-orbit />
        <div className={styles.storyMascot} data-story-mascot><img src="/morrow/mark-small.png" width="240" height="240" alt="Morrow brings the selected context together" /><span>Leave the busywork here.</span></div>
        {papers.map(({ title, type, Icon, text, color }, index) => <div key={title} data-story-paper className={`${styles.paper} ${styles[color]}`} style={{ "--canvas-index": index } as React.CSSProperties}><div className={styles.paperTop}><Icon size={23} /><span>{type}</span></div><h3>{title}</h3><p>{text}</p><div className={styles.paperLines} aria-hidden="true"><i /><i /><i /></div><span className={styles.paperBottom}>Your chosen context <ArrowRight size={14} /></span></div>)}
        <div className={styles.finishedBrief} data-story-result><div className={styles.briefTop}><FileText size={23} /><span>READY FOR YOUR REVIEW</span><img src="/morrow/mark-small.png" width="34" height="34" alt="" /></div><h3>Your week.<br />A little clearer.</h3><p>The priorities, the decisions, the next steps.</p><ul><li><Check size={17} />What needs your attention</li><li><Check size={17} />The context behind each decision</li><li><Check size={17} />A next step you can act on</li></ul><div className={styles.briefFooter}>Weekly brief <span>Example outcome</span></div></div>
      </div>
      <div className={styles.storyBottom}><div className={styles.storySteps}><span data-story-step>01 &nbsp; Bring your files</span><span data-story-step>02 &nbsp; Say what you need</span><span data-story-step>03 &nbsp; Review the result</span></div><p>Illustrative sequence, not a live task. You choose the context and access.</p></div>
    </div>
  </section>;
}

/** All animation lives outside React rendering; teardown restores a readable static page. */
export function useMorrowMotion(root: RefObject<HTMLDivElement | null>, paused: boolean) {
  useEffect(() => {
    if (!root.current) return;
    const element = root.current;
    const media = gsap.matchMedia();
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    element.dataset.motion = paused ? "paused" : "enabled";
    if (!paused) media.add("(prefers-reduced-motion: no-preference)", () => {
      const select = gsap.utils.selector(element);
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: { offset: -28 }, prevent: node => ["TEXTAREA", "SELECT"].includes(node.tagName) });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.fromTo(select("[data-reading-progress]"), { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });

      gsap.from(select("[data-hero-enter]"), { y: 27, opacity: 0, duration: .85, stagger: .11, ease: "power3.out" });
      gsap.from(select("[data-hero-visual]"), { y: 65, scale: .94, opacity: .4, duration: 1.1, delay: .22, ease: "power3.out" });
      select("[data-reveal], #setup h2, #questions h2, #demo h2, #mode-heading").forEach((node: HTMLElement) => gsap.from(node, { y: 36, opacity: .18, duration: .85, ease: "power3.out", scrollTrigger: { trigger: node, start: "top 94%", once: true } }));
      select("[data-stagger]").forEach((group: HTMLElement) => gsap.from(group.children, { y: 23, opacity: .25, stagger: .12, duration: .7, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 91%", once: true } }));

      const waves = select("[data-wave] i");
      const voice = gsap.to(waves, { scaleY: .25, duration: .45, stagger: { each: .045, repeat: -1, yoyo: true }, ease: "sine.inOut", paused: true });
      ScrollTrigger.create({ trigger: "[data-wave]", start: "top bottom", end: "bottom top", onToggle: self => self.isActive ? voice.play() : voice.pause() });
      const packets = gsap.to(select("[data-flow-packet]"), { xPercent: 1100, duration: 1.9, stagger: .55, repeat: -1, ease: "power1.inOut", paused: true });
      ScrollTrigger.create({ trigger: "[data-account-flow]", start: "top bottom", end: "bottom top", onToggle: self => self.isActive ? packets.play() : packets.pause() });

      const desktop = gsap.matchMedia();
      desktop.add("(min-width: 800px)", () => {
        const stage = select("[data-story-stage]")[0];
        const papers = select("[data-story-paper]");
        const result = select("[data-story-result]");
        const steps = select("[data-story-step]");
        gsap.set(result, { autoAlpha: 0, y: 80, scale: .88 });
        gsap.set(steps.slice(1), { opacity: .35 });
        const story = gsap.timeline({ scrollTrigger: { trigger: stage, start: "top top", end: "+=1150", scrub: .7, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
        story.to(papers, { x: (_, node) => stage.getBoundingClientRect().width / 2 - (node.offsetLeft + node.offsetWidth / 2), y: (_, node) => 175 - (node.offsetTop + node.offsetHeight / 2), rotation: 0, scale: .5, opacity: 0, stagger: .08, duration: 1.2, ease: "power2.inOut" }, .2)
          .to(select("[data-story-mascot]"), { scale: 1.15, rotation: 12, duration: .65 }, .35)
          .to(steps[0], { opacity: .35, duration: .2 }, .5).to(steps[1], { opacity: 1, duration: .2 }, .5)
          .to(select("[data-orbit]"), { scale: .6, opacity: 0, duration: .7 }, .75)
          .to(select("[data-story-mascot]"), { scale: .4, autoAlpha: 0, duration: .45 }, 1.2)
          .to(result, { autoAlpha: 1, y: 0, scale: 1, duration: .9, ease: "power3.out" }, 1.35)
          .from(select("[data-story-result] li"), { x: 18, opacity: 0, stagger: .08, duration: .4 }, 1.55)
          .to(steps[1], { opacity: .35, duration: .2 }, 1.6).to(steps[2], { opacity: 1, duration: .2 }, 1.6)
          .to({}, { duration: .6 });
        return () => {
          // Reverting a tween can restore a desktop-computed transform inline.
          // Let the mobile/static stylesheet own those transforms after a breakpoint change.
          select("[data-story-paper], [data-story-mascot], [data-story-result], [data-orbit], [data-story-result] li").forEach((node: HTMLElement) => {
            node.style.removeProperty("transform");
            node.style.removeProperty("opacity");
            node.style.removeProperty("visibility");
          });
        };
      });

      // Pointer feedback is opt-in to fine pointers; no touch interception or React updates.
      const pointerMedia = gsap.matchMedia();
      pointerMedia.add("(hover: hover) and (pointer: fine)", () => {
        const scene = select("[data-reactive-scene]")[0] as HTMLElement;
        const mascot = select("[data-reactive-mascot]")[0];
        if (!scene || !mascot) return;
        const x = gsap.quickTo(mascot, "x", { duration: .6, ease: "power3.out" });
        const y = gsap.quickTo(mascot, "y", { duration: .6, ease: "power3.out" });
        const rotation = gsap.quickTo(mascot, "rotation", { duration: .6, ease: "power3.out" });
        const move = (event: PointerEvent) => { const bounds = scene.getBoundingClientRect(); const dx = (event.clientX - bounds.left) / bounds.width - .5; x(dx * 34); y(((event.clientY - bounds.top) / bounds.height - .5) * 24); rotation(dx * 13); };
        const leave = () => { x(0); y(0); rotation(0); };
        scene.addEventListener("pointermove", move); scene.addEventListener("pointerleave", leave);
        return () => { scene.removeEventListener("pointermove", move); scene.removeEventListener("pointerleave", leave); };
      });
      const refresh = () => ScrollTrigger.refresh();
      const images = Array.from(element.querySelectorAll("img"));
      images.forEach(img => img.addEventListener("load", refresh));
      // Details change document height. Recalculate anchors and scroll scenes after expansion.
      element.addEventListener("toggle", refresh, true);
      const observer = new ResizeObserver(() => lenis.resize());
      observer.observe(element);
      const visibility = () => document.hidden ? lenis.stop() : lenis.start();
      document.addEventListener("visibilitychange", visibility);
      refresh();
      return () => { pointerMedia.revert(); desktop.revert(); observer.disconnect(); images.forEach(img => img.removeEventListener("load", refresh)); element.removeEventListener("toggle", refresh, true); document.removeEventListener("visibilitychange", visibility); gsap.ticker.remove(tick); lenis.destroy(); };
    }, element);
    return () => { media.revert(); delete element.dataset.motion; document.documentElement.style.scrollBehavior = originalScrollBehavior; };
  }, [root, paused]);
}
