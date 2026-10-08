"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  Check,
  FilePdf,
  Microphone,
  Pause,
  Sparkle,
} from "@phosphor-icons/react";
import { AestrumCharacter, type AestrumMode } from "./AestrumCharacter";
import { AestrumMark } from "./AestrumMark";

type DemoStep = "ready" | "listening" | "working" | "artifact";

const status: Record<DemoStep, { mode: AestrumMode; title: string; detail: string }> = {
  ready: { mode: "ready", title: "Ready when you are", detail: "Try the board brief below." },
  listening: { mode: "listening", title: "Listening", detail: "Prepare my board brief and open the PDF." },
  working: { mode: "working", title: "Working", detail: "Finding the latest numbers and shaping the brief." },
  artifact: { mode: "complete", title: "Board brief ready", detail: "Opened inside Aestrum, ready to present." },
};

export function VoiceDemo() {
  const [step, setStep] = useState<DemoStep>("ready");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  const runDemo = () => {
    clearTimers();
    setStep("listening");
    timers.current.push(window.setTimeout(() => setStep("working"), 1400));
    timers.current.push(window.setTimeout(() => setStep("artifact"), 3500));
  };

  useEffect(() => clearTimers, []);

  const current = status[step];
  const artifactOpen = step === "artifact";

  return (
    <div className={`product-demo ${artifactOpen ? "artifact-is-open" : ""}`}>
      <div className="demo-sidebar" aria-label="Aestrum preview navigation">
        <div className="demo-brand">
          <AestrumMark />
          <strong>aestrum</strong>
        </div>
        <span className="demo-nav-current">Today</span>
        <span>History</span>
        <span>Work</span>
        <span>Settings</span>
      </div>

      <div className="demo-stage">
        <div className="demo-assistant">
          <AestrumCharacter mode={current.mode} compact={artifactOpen} />
          <div className="demo-status" aria-live="polite">
            <span className="semantic-state" aria-hidden="true" />
            <div>
              <strong>{current.title}</strong>
              <p>{current.detail}</p>
            </div>
          </div>
        </div>

        <div className="artifact-preview" aria-hidden={!artifactOpen}>
          <div className="artifact-toolbar">
            <FilePdf aria-hidden="true" weight="fill" />
            <strong>Board brief.pdf</strong>
            <span>6 pages</span>
          </div>
          <article className="brief-page">
            <p>Quarterly board brief</p>
            <h3>Decisions, not data dumps.</h3>
            <div className="brief-metric">
              <span>Priority</span>
              <strong>Protect delivery margin</strong>
            </div>
            <div className="brief-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="brief-ready">
              <Check aria-hidden="true" weight="bold" />
              Ready to present
            </div>
          </article>
        </div>
      </div>

      <div className="demo-command">
        {step === "ready" ? (
          <button className="button button-primary" onClick={runDemo} type="button">
            <Microphone aria-hidden="true" weight="fill" />
            Try the voice flow
          </button>
        ) : step === "artifact" ? (
          <button className="button button-secondary" onClick={() => setStep("ready")} type="button">
            <ArrowCounterClockwise aria-hidden="true" />
            Replay
          </button>
        ) : (
          <button className="button button-secondary" onClick={() => setStep("artifact")} type="button">
            {step === "listening" ? <Pause aria-hidden="true" weight="fill" /> : <Sparkle aria-hidden="true" weight="fill" />}
            {step === "listening" ? "Finish request" : "Show result"}
          </button>
        )}
      </div>
    </div>
  );
}
