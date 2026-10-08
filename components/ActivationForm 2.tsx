"use client";

import { useState } from "react";
import { ArrowDown, CheckCircle, Key, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import type { LicenseCheckResponse } from "@/lib/contracts";
import { formatActivationCodeInput } from "@/lib/activation-code";
import { activationCheckRequest, edgeErrorMessage, parseLicenseCheckResponse } from "@/lib/license-check";
import { licensingFunctionsBase } from "@/lib/supabase-browser";

export function ActivationForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<LicenseCheckResponse | null>(null);

  const checkCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setResult(null);

    try {
      const requestBody = activationCheckRequest(code);
      if (!requestBody) {
        setResult({
          eligible: false,
          status: "unavailable",
          message: "Enter the complete activation code supplied by Skills4U.",
        });
        setState("error");
        return;
      }
      const base = licensingFunctionsBase();
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      if (!base || !publishableKey) {
        setResult({
          eligible: false,
          status: "unavailable",
          message: "Activation checking is not connected on this deployment. Contact Skills4U for your pilot build.",
        });
        setState("error");
        return;
      }
      const response = await fetch(`${base}/check-license`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify(requestBody),
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = parseLicenseCheckResponse(payload, {
        expectedSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      });
      if (!data) {
        setResult({
          eligible: false,
          status: "unavailable",
          message: edgeErrorMessage(payload) || "The activation service returned an unreadable response.",
        });
        setState("error");
        return;
      }
      setResult(data);
      setState(response.ok && data.eligible && data.status === "recognized" ? "success" : "error");
    } catch {
      setResult({
        eligible: false,
        status: "unavailable",
        message: "The activation service could not be reached. Please try again in a moment.",
      });
      setState("error");
    }
  };

  const downloadUrl = result?.downloadUrl;

  return (
    <div className="activation-panel">
      <form className="activation-form" onSubmit={checkCode}>
        <div className="form-heading">
          <span className="form-icon" aria-hidden="true"><Key weight="duotone" /></span>
          <div>
            <h1>Check your invitation</h1>
            <p>Use the code supplied by Skills4U. This check does not bind a device.</p>
          </div>
        </div>

        <label htmlFor="activation-code">Activation code</label>
        <input
          id="activation-code"
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          placeholder="J4U-XXXXX-XXXXX-XXXXX-XXXXX"
          value={code}
          onChange={(event) => setCode(formatActivationCodeInput(event.target.value))}
          minLength={27}
          required
        />

        <button className="button button-primary button-wide" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <SpinnerGap className="spin" aria-hidden="true" /> : <Key aria-hidden="true" weight="fill" />}
          {state === "loading" ? "Checking securely" : "Check activation"}
        </button>
      </form>

      <div className={`activation-result ${state}`} aria-live="polite">
        {state === "idle" && (
          <>
            <span className="result-icon" aria-hidden="true"><CheckCircle weight="duotone" /></span>
            <strong>What happens next</strong>
            <p>Download Jarvis, enter the same code in the app, then sign in through the official ChatGPT page.</p>
          </>
        )}
        {state === "loading" && (
          <>
            <span className="result-skeleton wide" />
            <span className="result-skeleton" />
            <span className="result-skeleton short" />
          </>
        )}
        {state === "error" && result && (
          <>
            <span className="result-icon error" aria-hidden="true"><WarningCircle weight="fill" /></span>
            <strong>We could not verify this code</strong>
            <p>{result.message}</p>
          </>
        )}
        {state === "success" && result && (
          <>
            <span className="result-icon success" aria-hidden="true"><CheckCircle weight="fill" /></span>
            <strong>Your invitation is ready.</strong>
            <p>{result.message}</p>
            {downloadUrl ? (
              <a className="button button-primary" href={downloadUrl}>
                Download Jarvis
                <ArrowDown aria-hidden="true" weight="bold" />
              </a>
            ) : (
              <p className="release-pending">The private installer could not be prepared. Check the code again or contact Skills4U.</p>
            )}
            <p className="release-pending">This private download link expires in a few minutes. Check the code again if needed.</p>
          </>
        )}
      </div>
    </div>
  );
}
