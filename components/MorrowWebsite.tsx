"use client";

import { useRef, useState, type FormEvent } from "react";
import { MorrowScrollStory, MotionControl, useMorrowMotion } from "./MorrowMotion";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, FileText, Folder, Microphone, Monitor, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import styles from "./MorrowWebsite.module.css";

const workflows = [
  { name: "The Monday brief", ask: "Turn these notes into a weekly brief. Flag anything that needs my decision.", input: "Meeting notes + roadmap", action: "Read, compare, pull out decisions", output: "A brief you can actually use", description: "Give Morrow the context. Get a document to review, not another list of instructions to do yourself.", lines: ["The three priorities", "Decisions waiting on you", "A clear next step for each"] },
  { name: "The proposal pile", ask: "Compare these proposals. Show me the differences in price, scope and risk.", input: "The proposals you choose", action: "Compare the details side by side", output: "A clearer decision", description: "Bring the options into one place. See what is included, what is missing, and what to ask before you commit.", lines: ["Price and scope, side by side", "Gaps worth asking about", "Sources to check yourself"] },
  { name: "The messy folder", ask: "Help me organise this project folder. Show me the plan before moving anything.", input: "A folder you grant access to", action: "Inspect files and propose a structure", output: "Less hunting. More finding.", description: "Start with one folder. Review the proposed changes before asking Morrow to carry them out within your chosen access settings.", lines: ["A proposed folder structure", "Files grouped by purpose", "Your review before the next step"] },
];

const faqs = [
  ["What is Morrow, in one sentence?", "Morrow is a voice-first Mac workspace that uses your connected ChatGPT account through Codex to help with files and actions in supported apps."],
  ["Can it control my whole computer?", "Morrow can work with files and supported apps when the required tools and macOS permissions are available. It is not unrestricted access to every app. Computer control depends on your setup, enabled tools and access mode. We will show the supported workflows in your personal demo."],
  ["Why use Morrow instead of Codex directly?", "You can use Codex directly. Morrow adds a voice-led interface, a file workspace and a library of work for people who do not want to start with a developer tool. It is a different way to use the underlying capabilities, not a separate AI model."],
  ["Do I need another AI subscription or API key?", "Morrow uses ChatGPT sign-in for the account-based flow, rather than asking you for an OpenAI API key. OpenAI plan eligibility, feature availability and usage limits still apply. Morrow's pilot access is separate from your ChatGPT account."],
  ["Does a paid ChatGPT plan mean my data is never used for training?", "Not automatically. Personal Plus and Pro accounts have training controls you should check; business plans have different defaults. See the account selector and linked OpenAI policy above for details."],
  ["Is Morrow available to download today?", "Morrow is in a small Mac pilot. Book a personal demo first so we can check your setup and show what works today. There is no public, production-ready download on this page."],
];

function Brand() {
  return <img className={styles.wordmark} src="/morrow/wordmark.png" alt="morrow" width="150" height="50" />;
}

function DemoForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "preview">("idle");
  const enabled = process.env.NEXT_PUBLIC_DEMO_FORM_ENABLED === "true";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    if (!enabled || local) { setState("preview"); return; }
    const body = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => body.append(key, String(value)));
    setState("sending");
    try {
      const response = await fetch("/__forms.html", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Submission failed");
      setState("sent");
    } catch { setState("error"); }
  }
  return <div className={styles.formBox}>
    {state === "sent" ? <div className={styles.formSuccess} role="status"><Check size={36} /><h3>Request received.</h3><p>We will reply by email to arrange a time. Your demo is not booked until we confirm it with you.</p></div> :
      <form name="morrow-demo" method="POST" action="/__forms.html" data-netlify="true" data-netlify-honeypot="bot-field" onSubmit={submit}>
        <input type="hidden" name="form-name" value="morrow-demo" />
        <p hidden><label>Leave this empty<input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
        <div className={styles.formPair}>
          <label>Your name<input name="name" autoComplete="name" required maxLength={100} placeholder="Alex" /></label>
          <label>Work email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="alex@company.com" /></label>
        </div>
        <label>What would you hand over to Morrow?<textarea name="workflow" rows={3} maxLength={1500} placeholder="The files, admin or repeat work taking up your day…" /></label>
        <p className={styles.formNotice}>We use these details to arrange your demo. Please do not include passwords or confidential work. <a href="/privacy#demo-requests">How we handle this request</a></p>
        <button className={styles.darkButton} type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending request…" : "Request my demo"}<ArrowRight size={18} /></button>
        {!enabled && <p className={styles.previewNote}>Local preview. This form is not accepting requests yet.</p>}
        <p className={state === "error" ? styles.formError : styles.formStatus} role="status" aria-live="polite">{state === "preview" ? "Nothing was sent. Demo requests will be enabled when this website is published and the form has been verified." : state === "error" ? "We could not confirm your request. Your details are still here. Please try again." : ""}</p>
      </form>}
  </div>;
}

export function MorrowWebsite() {
  const root = useRef<HTMLDivElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  useMorrowMotion(root, motionPaused);
  const [workflow, setWorkflow] = useState(0);
  const [mode, setMode] = useState<"talk" | "work">("work");
  const [plan, setPlan] = useState<"personal" | "business">("personal");
  const active = workflows[workflow];
  return <div className={styles.site} ref={root}>
    <MotionControl paused={motionPaused} onToggle={() => setMotionPaused(value => !value)} />
    <header className={styles.header}>
      <a href="#" aria-label="Morrow home"><Brand /></a>
      <nav aria-label="Primary navigation"><a href="#experience">What it does</a><a href="#trust">Your data</a><a href="/subscribe">Plans</a><a href="#questions">Questions</a></nav>
      <a className={styles.smallButton} href="#demo">Book a personal demo <ArrowUpRight size={17} /></a>
    </header>
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow} data-hero-enter><span className={styles.pilotDot} /> MEET MORROW · MAC PILOT</p>
          <h1 id="hero-heading" data-hero-enter>You say it.<br />Your Mac gets to work.</h1>
          <p className={styles.heroSummary} data-hero-enter>An assistant that goes beyond the chat. Talk through what you need, work across files and supported apps, and come back to something ready to review.</p>
          <div className={styles.heroActions} data-hero-enter><a className={styles.darkButton} href="#demo">Book a personal demo <ArrowUpRight size={19} /></a><a className={styles.textButton} href="#experience">See what that looks like <ArrowDown size={17} /></a></div>
          <p className={styles.heroFootnote}>Your ChatGPT account. Morrow’s workspace. Your say on access.</p>
        </div>
        <figure className={styles.heroFigure} data-hero-visual>
          <div className={styles.spokenRequest}><Microphone size={19} weight="fill" /><span>“Turn my notes into a brief for Monday.”</span><span className={styles.requestLabel}>A LITTLE LESS BUSYWORK</span></div>
          <img className={styles.workspaceImage} src="/morrow/workspace.webp" alt="Illustrative Morrow workspace showing a weekly brief alongside the yellow Morrow character and a follow-up action." width="1536" height="1024" fetchPriority="high" />
          <figcaption>Illustrative workflow. Availability depends on your tools, permissions and account.</figcaption>
        </figure>
      </section>

      <MorrowScrollStory />

      <section className={`${styles.section} ${styles.workflows}`} id="experience" aria-labelledby="work-heading">
        <div className={styles.sectionHeading} data-reveal><p className={styles.eyebrow}>01 / FROM ASKING TO DOING</p><h2 id="work-heading">The work behind<br />“I’ll get to it.”</h2><p>The scattered notes. The proposals you still need to compare. The folder you keep meaning to sort. Start there.</p></div>
        <div className={styles.workflowChoices} aria-label="Choose an example workflow">{workflows.map((item, index) => <button key={item.name} aria-pressed={index === workflow} onClick={() => setWorkflow(index)}><span>0{index + 1}</span>{item.name}<ArrowUpRight size={18} /></button>)}</div>
        <div className={styles.workflowContent} aria-live="polite" key={workflow}>
          <div className={styles.prompt}><span className={styles.promptLabel}><Microphone size={20} /> YOU MIGHT ASK</span><blockquote>“{active.ask}”</blockquote><p>{active.description}</p></div>
          <div className={styles.outcome}><div className={styles.outcomeTop}><span>THE RESULT TO REVIEW</span><FileText size={28} /></div><h3>{active.output}</h3><ul>{active.lines.map(line => <li key={line}><Check size={17} />{line}</li>)}</ul><div className={styles.outputFoot}><span>Example outcome</span><span>Always worth a human look <ArrowUpRight size={14} /></span></div></div>
        </div>
        <ol className={styles.workflowSteps}><li><span>1</span><div><strong>Bring the context</strong><p>{active.input}</p></div></li><li><span>2</span><div><strong>Give it the job</strong><p>{active.action}</p></div></li><li><span>3</span><div><strong>Review what comes back</strong><p>Check the result. Ask for a change.</p></div></li></ol>
      </section>

      <section className={styles.modeSection} aria-labelledby="mode-heading">
        <div className={styles.modeVisual} data-reactive-scene data-reveal>
          <div className={styles.modeSwitch} aria-label="Explore Morrow modes"><button aria-pressed={mode === "talk"} onClick={() => setMode("talk")}><Microphone size={17} />Talk</button><button aria-pressed={mode === "work"} onClick={() => setMode("work")}><Folder size={17} />Work</button></div>
          <div className={styles.mascotScene} data-mode={mode}><div data-reactive-mascot><img src="/morrow/mark-small.png" alt="Morrow, a yellow sunburst character with two black eyes" width="300" height="300" loading="lazy" /></div><div className={styles.wave} data-wave aria-hidden="true">{Array.from({ length: 29 }, (_, i) => <i key={i} style={{ height: `${Math.round(8 + Math.sin(i * 1.1) ** 2 * (1 - Math.abs(i - 14) / 16) * 36)}px` }} />)}</div></div>
          <div className={styles.modeCaption} aria-live="polite"><strong>{mode === "talk" ? "A thought. A question. A fresh angle." : "A file. A task. A next step."}</strong><p>{mode === "talk" ? "Talk it through before you get to work." : "Bring the context and put Morrow to work."}</p></div>
          <span className={styles.exampleLabel}>Interactive illustration · microphone is off</span>
        </div>
        <div className={styles.modeCopy}><p className={styles.eyebrow}>02 / A MORE HUMAN INTERFACE</p><h2 id="mode-heading">Think out loud.<br />Then make it happen.</h2><p>You should not need to think like a developer to use a capable assistant. Morrow puts voice, files and actions in one place.</p><div className={styles.modeNotes}><div><strong>Talk when you’re thinking.</strong><p>Ask a question or work through an idea in conversation.</p></div><div><strong>Work when you’re doing.</strong><p>Give a task its files and context. Review the output in the workspace and return to it in your library.</p></div></div><a className={styles.underlinedLink} href="#demo">See the two modes in a personal demo <ArrowUpRight size={17} /></a></div>
      </section>

      <section className={`${styles.section} ${styles.accountSection}`} id="setup" aria-labelledby="account-heading">
        <p className={styles.eyebrow}>03 / BRING YOUR ACCOUNT</p><div className={styles.accountHeading}><h2 id="account-heading">A new way to work.<br />Not another AI model.</h2><p>Morrow connects to your existing ChatGPT account through Codex. OpenAI provides the AI. Morrow gives you a voice-led place to use it.</p></div>
        <div className={styles.accountFlow} data-account-flow data-stagger><div><span className={styles.flowIcon}><Monitor size={28} /></span><strong>Your Mac</strong><p>Your files and chosen access</p></div><span className={styles.flowLine} aria-hidden="true"><i data-flow-packet /></span><div><img src="/morrow/mark-small.png" alt="" width="68" height="68" loading="lazy" /><strong>Morrow</strong><p>Your voice and work, together</p></div><span className={styles.flowLine} aria-hidden="true"><i data-flow-packet /></span><div><span className={styles.flowIcon}><Sparkle size={28} /></span><strong>Your ChatGPT account</strong><p>Cloud AI through Codex</p></div></div>
        <div className={styles.accountFineprint}><span>Sign in through the official OpenAI flow.</span><span>No OpenAI API key for this account-based setup.</span><span>Your plan’s eligibility and usage limits apply.</span></div>
      </section>

      <section className={styles.privacySection} id="trust" aria-labelledby="privacy-heading">
        <div className={styles.privacyHeading} data-reveal><p className={styles.eyebrow}>04 / CLEAR ABOUT ACCESS</p><ShieldCheck size={32} weight="regular" /><h2 id="privacy-heading">Your computer.<br />Not a blank cheque.</h2><p>Computer access is powerful. You should know what you’re allowing, where information goes, and which controls still matter.</p></div>
        <div className={styles.dataMap}><div><span className={styles.dataNumber}>01</span><h3>Stored on your Mac</h3><p>Morrow’s local history, saved work and preferences live on your computer.</p><span className={styles.dataTag}>Local storage</span></div><div><span className={styles.dataNumber}>02</span><h3>Processed in the cloud</h3><p>Requests and relevant context go to OpenAI for AI processing. That can include file content, screenshots or voice data used for a task.</p><span className={styles.dataTag}>Not fully offline</span></div><div><span className={styles.dataNumber}>03</span><h3>Access you configure</h3><p>Choose your access mode and macOS permissions. Broader access allows more actions with fewer prompts. Connected services have their own controls.</p><span className={styles.dataTag}>Start with limited access</span></div></div>
        <div className={styles.training}><div><h3>And what about training?</h3><p>The answer depends on your OpenAI account, not just whether you pay.</p></div><div><div className={styles.planSwitch} aria-label="OpenAI account type"><button aria-pressed={plan === "personal"} onClick={() => setPlan("personal")}>Personal Plus / Pro</button><button aria-pressed={plan === "business"} onClick={() => setPlan("business")}>Business / Enterprise / Edu</button></div><p aria-live="polite">{plan === "personal" ? "Conversations may be used to improve models unless training is disabled in ChatGPT data controls. Check your settings before sharing sensitive information." : "OpenAI does not use Business, Enterprise or Edu data for training by default. Your organisation’s policies and connected services still apply."}</p><a href="https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan" target="_blank" rel="noreferrer">Read OpenAI’s current policy <ArrowUpRight size={15} /></a></div></div>
        <p className={styles.privacyFootnote}>Morrow is not a security guarantee. Review important outputs and start with the smallest scope needed. Activation also uses a licensing service. <a href="/privacy">Read the full data summary <ArrowRight size={14} /></a></p>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`} id="questions" aria-labelledby="faq-heading"><div><p className={styles.eyebrow}>THE PRACTICAL QUESTIONS</p><h2 id="faq-heading">Before you<br />hand it a task.</h2></div><div className={styles.faqs}>{faqs.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>

      <section className={styles.demoSection} id="demo" aria-labelledby="demo-heading"><div className={styles.demoCopy}><p className={styles.eyebrow}>A PERSONAL WALKTHROUGH</p><h2 id="demo-heading">Bring one task.<br />Meet Morrow.</h2><p>Tell us what keeps eating into your day. We’ll show you the workflow, explain the access it needs, and be clear about what the pilot can and cannot do.</p><div className={styles.demoMeta}><span>For Mac users</span><span>No payment details</span><span>A person, not a sales bot</span></div><img src="/morrow/mark.png" width="110" height="110" loading="lazy" alt="" /></div><DemoForm /></section>
    </main>
    <footer className={styles.footer}><div><a href="#" aria-label="Back to Morrow home"><Brand /></a><p>Make room for tomorrow.</p></div><nav aria-label="Footer navigation"><a href="/subscribe">Plans & account</a><a href="/activate">Activate</a><a href="/privacy">Privacy</a><a href="/open-source">Source & licences</a><a href="https://aestrum.in" target="_blank" rel="noreferrer">Made by Aestrum <ArrowUpRight size={14} /></a></nav><p className={styles.disclaimer}>Independent product. Not affiliated with or endorsed by OpenAI. ChatGPT and Codex are OpenAI products. Product illustrations show example workflows.</p></footer>
  </div>;
}
