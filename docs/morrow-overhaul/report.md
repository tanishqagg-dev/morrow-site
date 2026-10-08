# Morrow: voice-first consumer overhaul

> Voice-native revision, 24 September 2026: the app navigation and history suggestions below are superseded by the [voice-native research and state map](voice-native-research/report.md). Use that document for the consumer app UI. This older report remains background for the website and technical audit.

Research and build plan, 24 September 2026. This document recommends a new experience; it does not describe a shipped redesign. Audience: ordinary people using a Mac, including people who have never used an AI agent. Voice is the main way in. Text remains available in every conversation for accessibility, privacy, and precision.

**Login, voice, and payment correction:** Read the [exact Codex-based flow](codex-subscription-exact-flow.md) first. Morrow's current voice uses the authenticated bundled Codex app-server's realtime WebRTC session. It does not need a separate speech provider or AI inference account. The recommended customer order is Codex sign-in, one real trial conversation, then browser payment for Morrow and automatic return to the app.

## The product decision

**Morrow should be the easiest way to say what you need, understand what happened, and decide what happens next on your Mac.** One conversation handles a question, a draft, or a task. The user should not pick a Talk mode and a Work mode. They should not see words such as Codex, entitlement, activation, agent, or API key in the first run.

The first useful exchange should be small: ask Morrow aloud to explain a letter, plan an errand, or draft a reply. Morrow speaks briefly, shows readable text, and offers the next step. The user can stop, correct, type, or inspect sources at any time. If a task would change a file, contact a service, spend money, or send a message, the app shows exactly what it intends to do and waits for an on-screen approval.

This recommendation assumes the commercial setup the founder chose: a separate Morrow subscription and an eligible ChatGPT account supplied by the customer. That creates real friction. The site and checkout must explain two accounts and two possible bills plainly. **Do not promise public paid access until Morrow's intended account-based inference route is commercially authorized and works in a signed build.** [OpenAI's ChatGPT sign-in documentation](https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt) says partner sign-in shares identity details, not AI tokens or subscription inference rights. Its [Codex plan guide](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) describes eligibility and limits, not Morrow's distribution rights.

## What I inspected

- The live local homepage at `http://localhost:8796/` on 24 September leads with "You say it. Your Mac gets to work," targets founders and solo operators, makes "Book a personal demo" the main action, has a Talk/Work selector, and requests a work email in a preview-only form. The form itself says requests are not accepted yet. The page is visually well developed, but its story is for a different customer.
- The live local `/subscribe` page is a polished yellow/black plan selector. It presents Personal and Business, one Mac versus company seats, with a Personal preview of ₹3,499/month or ₹35,690/year before tax. It says checkout is not open because Razorpay plans are unpublished. That price and seat language conflict with a simple consumer offer.
- The installed Morrow Pilot initially showed a sparse Home view with a large Speak control, "Type instead," Home/Library/Settings navigation, conversation history, and a technical account status. During inspection it moved to a Keychain activation error (`macOS status -25244`) and demanded reactivation, so I could not verify later native screens live. Source inspection shows activation code, ChatGPT browser sign-in, introduction, microphone, optional Google and computer control, profile, and voice test in [OnboardingFlow.tsx](../../../src/ui/OnboardingFlow.tsx). The four named phases in [onboarding-model.ts](../../../src/onboarding-model.ts) put activation first.
- The source already has a useful foundation: Tauri 2, React, TypeScript, Rust, local history, secure credential storage, Next.js site, Clerk account, Supabase billing functions, and Razorpay integration. Preserve and simplify that foundation. The repo has many unrelated uncommitted changes; this plan does not alter product code.

The existing [consumer-flow document](../MORROW-CONSUMER-FLOW.md) treated voice as optional and files as the first product job. That part is superseded by this decision. Selected files remain a valuable task input, but a user should be able to begin by speaking without selecting a file.

## What the competitors actually teach

| Product | Verified current pattern | Decision for Morrow |
| --- | --- | --- |
| [Wispr Flow](https://docs.wisprflow.ai/articles/3152211871) | Download, browser sign-in, required permissions, mic check, shortcut, then practice dictation. Its [first-dictation guide](https://docs.wisprflow.ai/articles/6409258247) calls out moving bars, stop/cancel, and a short first utterance. Its [pricing](https://wisprflow.ai/pricing) offers a free start and paid unlimited dictation. | Borrow the confidence-building first spoken success, live recording cue, and recovery. Morrow must then *respond and help finish a task*; merely transcribing is Wispr's job. |
| [ChatGPT Work and Codex](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex) | Voice can start and steer tasks in eligible experiences, with live text and on-screen approvals for actions. Access varies by plan and workspace. | Morrow cannot claim voice or agent tasks as unique. Win on first-run clarity, a calm review view, and language ordinary users understand. |
| [Claude voice](https://support.claude.com/en/articles/11101966-use-voice-mode) and [new Claude experience](https://support.claude.com/en/articles/16761823-claude-cowork-and-chat-are-one-claude) | Voice and text can share conversation context. Claude is merging chat and task selection for some users. | Remove the Talk/Work choice. A request should move from answer to task in the same thread. Include push-to-talk for noise and interruption. |
| [Raycast](https://www.raycast.com/changelog/macos/0-57) | A hotkey and floating dictation pill bring speech into any app; live waveform and history confirm what happened. Raycast also offers bring-your-own API key for AI use. | Put Morrow one shortcut away, but make its small panel a gateway to a full, inspectable result. Do not copy dictation as the core promise. |
| [Granola](https://www.granola.ai/pricing) | A focused meeting job has a free taste, clear history limits, and paid depth. | Show one real before/after task on the site. Avoid a catalog of imagined integrations. |
| [Apple Siri AI](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/) | Apple's September 2026 beta brings more conversational Mac help, personal context, onscreen awareness, app actions, and a dedicated history app on supported hardware and languages. | Assume the built-in Mac assistant is the default comparison. Morrow needs a clearer first outcome and review flow, not a broad claim to control the computer. |

**Strategic conclusion.** Wispr owns "speak instead of type." ChatGPT and Claude can speak and act. Morrow's opportunity is a gentler *voice-to-useful-outcome* loop for people who find the big tools overwhelming. This is a hypothesis to test with users, not a proven competitive advantage.

## Design read and visual system

Reading this as: a consumer product demo and a calm Mac tool interface for new AI users, with a warm editorial language driven by the feeling of talking to a helpful presence. The site should tell a short product story; the app should reduce choices at the moment of use.

- Keep Morrow's existing yellow character, black eyes, yellow/ink/cream palette, and recognizable wordmark. Use the character to show listening, thinking, and done through pose, scale, or restrained motion. Do not add a mouth, limbs, exaggerated emotions, or a human persona.
- Site: a full-width interactive voice stage, then a visibly changed result. Large readable type, a few short lines, real product captures, and one persistent download or pilot action. No standard split hero, logo parade, bento grid, or fake testimonial.
- App: a focused central conversation, compact recent work, one prominent Speak action. The same transcript and result remain visible when the user types. Larger text, strong contrast, and generous targets are functional here, not decoration.
- Motion: waveform responds while recording; processing becomes a quiet progress state; the result sheet appears only after actual completion. All content exists without animation, and reduced-motion users see clear static state changes.
- No automatic hot microphone. Tap/shortcut to start; explicit stop/cancel. Offer hold-to-talk when noisy. The system microphone indicator and Morrow's listening label must agree.

Concept art: [site voice story](assets/site-voice-story-concept.png) and [app voice states](assets/app-voice-states-concept.png). They are directional mockups. The result letter, dates, and examples in the images are illustrative, not product output or verified claims. Build the UI in code with real data and accessibility checks.

## New customer journey, end to end

| Moment | What appears | What happens behind it | Exit and recovery |
| --- | --- | --- | --- |
| Discover | A short, playable **real** voice-to-result example. "Try Morrow on Mac" or an honest pilot join action. "Bring your own eligible ChatGPT account; billed separately." | Site records anonymous view and demo engagement only with consent. | Requirements, privacy, price, and FAQ available without sign-in. |
| Download | Mac version, compatibility, signed installer, release notes. | Signed/notarized app; update and rollback path. | Unsupported system gets clear requirement, not a broken installer. |
| First open | "Connect ChatGPT to use Codex with Morrow." No manual activation code. | Issue a limited trial Morrow entitlement so Codex login can start; today's native login otherwise requires an active license. | Resume after quit or crash. |
| Connect Codex | Official OpenAI sign-in opens in the default browser. | Bundled app-server `account/login/start` and `account/read` verify the customer's account. | Wrong account, timeout, unavailable access, and usage limit each have a distinct fix. |
| First speak | "Press Speak and tell Morrow what you need." Mac microphone permission appears on first use. | Existing Codex realtime WebRTC voice session, with transcript and spoken response. | Denied mic gets "Open microphone settings" and full typing path. |
| First response | Morrow speaks a short answer; exact answer remains as text. "Want me to make a draft?" | One conversation stores user utterance, transcript correction, response, source, and task status. | Stop speech, replay, slow it down, copy, type follow-up. |
| Do a task | User accepts an offered next step or asks directly. Request a file/folder/app permission only at that point. | Show plan, current step, selected scope, output, and stop control. | Cancellation preserves work and identifies what, if anything, changed. |
| Review | Source alongside output, factual uncertainty marked, file diff/action preview when relevant. | Approval is enforced by the host before irreversible or external action. | Approve, edit, reject, or ask for a revision. |
| Return | Recent conversations and completed outcomes, searchable by ordinary title. | Local task state and artifacts persist; account sync only for explicitly supported metadata. | Reopen a result and continue in the same thread. |
| Subscribe | After the real trial conversation or trial limit: one consumer plan, clear renewal/tax/ChatGPT-account split. | Open the existing Clerk and Razorpay site in the default browser; link payment to this app installation and return automatically after verified entitlement. | Closing checkout preserves history; delayed webhook shows "Checking payment." |
| Manage | Plan status, next renewal, invoices, payment method, cancel, sign out, disconnect provider. | Signed webhook updates, reconciliation, grace period, and local cache with expiry. | Cancel retains access through paid term; expired user can open and export local history. |

**Do not promise a free trial duration or subscription price yet.** Implement the limited real conversation and test its cost and conversion. The earlier ₹499/month idea is a hypothesis, while ₹3,499/month is today's site preview, not a validated consumer price. The effective Morrow plus OpenAI cost must be shown before checkout.

## Site: page by page

**Home `/`.** Slim navigation: How it works, Pricing, Questions, Download/Join pilot. First scene shows a real spoken request, live transcript, Morrow's short response, and the next choice. The visitor can replay, mute, read captions, and jump to the result. Then show two more everyday tasks with actual captured outputs: explain a document and draft something. Use one vertical voice-to-result story, not a wall of features. End with the real release state: download if verified, otherwise "Join the pilot" with a working form. Put the separate ChatGPT-account note next to the primary action.

**How it works `/how-it-works`.** Three events: press Speak, see what Morrow understood, review what it makes. Show actual controls for Stop, Type instead, review, and approval. A short "What Morrow can do today" table must distinguish live, pilot, and planned capabilities. No simulated interaction should look like a live AI task.

**Pricing `/pricing` or `/subscribe`.** One consumer plan at launch. Explain Morrow fee, whether a trial exists, taxes, renewal date, cancellation, Mac/device limits, ChatGPT plan requirement, and what happens when OpenAI limits are reached. Put the ChatGPT cost split above the buy button. Publish payment only after full verification. Keep Business on a separate waitlist or contact page, not beside the consumer choice.

**Download `/download`.** Supported OS/CPU, installer version/date, signed publisher, size, first-run steps, update policy, and support link. If the app is still a pilot, the page says so and gates download honestly.

**Trust `/privacy` and Help `/help`.** A plain map of what stays on Mac, what goes to OpenAI, what minimal account/billing data goes to Morrow, and how to delete/export. Specific help for mic denied, provider account mismatch, Keychain failure, cancellation, and restore. Preserve source/licence notices in the footer.

**Account `/account`.** Billing and device state only. Do not make the public site a second task workspace unless cross-device sync is really supported. Remove `/activate` from consumer navigation once entitlement is account linked.

## Mac app: screen inventory and behavior

1. **Welcome.** Morrow character and one action, "Connect ChatGPT." Explain that Codex powers Morrow's voice and that Morrow billing is separate. "Already subscribed to Morrow? Restore access" is secondary. No carousel or setup tour.
2. **Codex connection.** Existing official OpenAI browser sign-in and app-server account check. Return and retry, account status, usage-limit guidance. A user must not enter a password inside Morrow.
3. **Microphone permission.** On the first Speak press, show one task-specific panel with input meter and mic selector. Permission status always readable in text. Retry path opens System Settings. Typing stays usable.
4. **Home/ready.** One conversation area and a lightweight "Recent" drawer. Large Speak control at the point of use; Type instead next to it. Do not make Library a separate mental model for the first session.
5. **Listening.** Live waveform and transcript, obvious Stop and Cancel. Explicit "Morrow is listening" label. Space/shortcut behavior shown in Help. After stopping, allow correction before send if transcription confidence is low or user requests it.
6. **Thinking/working.** Short status in plain words: "Looking at your letter," "Making a draft." Show elapsed progress without fake percentages. Allow Stop and a text follow-up that queues only when understood.
7. **Answer.** Spoken summary capped for comfort; readable full transcript; controls for replay, voice speed, mute, copy, source. Follow-up input is always present.
8. **Task proposal and progress.** A compact plan, exact inputs, current step, cancel. Ask for additional folder, screen, Accessibility, or service access only when the task reaches it.
9. **Review and approval.** Draft/output first, source/diff on demand, explicit affected file names or recipients, Approve and Keep as is. Never use a vague "Continue" for consequential changes. External send and destructive changes require their own review.
10. **Recent work.** Conversation title, last action, artifact, status, and resumption. Search. One click to reopen and continue. Distinguish a conversation from a finished file within one record.
11. **Settings.** Voice and playback, mic, push-to-talk shortcut, language, text size, captions, reduced motion, history, permissions, provider connection, plan and billing, support. Organize by user intent rather than internal subsystems.
12. **Plan and billing.** Current Morrow plan, renewal, invoices, cancel, restore; clear provider status beside but separate from Morrow entitlement. Never imply paying Morrow will raise a ChatGPT usage limit.

### The voice state machine

`ready → requesting_mic → listening → transcript_review? → submitting → speaking/result → ready`.

`submitting → working → approval_required → applying → done` for a task. Every state can reach `cancelled`, `recoverable_error`, or `provider_limited` without losing the request. The transcript is the common record for speech and typing. Voice output may be interrupted or muted without cancelling the underlying task. Microphone capture stops when the UI says it stops. A separate `background_listening` state is out of scope for launch.

### Accessibility is a first-class path

Every action works without a microphone. Keyboard access, screen reader names, visible focus, logical reading order, captions for every spoken output, adjustable voice speed and text size, high contrast, reduced motion, and no color-only status. A 44px-class target is a useful design baseline for primary controls. Test VoiceOver on macOS, keyboard-only use, mic-denied use, and noisy-room push-to-talk with real people. Captions are not a buried feature; text is always alongside speech.

## Subscription, identities, and technical architecture

There are **two identities**, but only one visible journey. ChatGPT provides eligible inference under its own terms and limits; Morrow account handles payment, license, devices, and support. Browser-based connections return to the same pending task. Avoid manual activation codes for consumers. Keep a private operator override for support if needed, outside normal onboarding.

| Layer | Keep from repo | Build or change |
| --- | --- | --- |
| Mac shell | Tauri 2, React, TypeScript, Rust | One durable conversation/task store; accessible voice state machine; quick-entry window or shortcut after core reliability. |
| Codex voice | Bundled app-server realtime WebRTC path using the customer's ChatGPT sign-in | Verify this exact path on supported plans and signed builds; show live transcript, playback, interrupt, and meaningful failure states. Do not replace it with a separate speech stack. |
| Codex account | Existing app-server `account/login/start` and `account/read` | Trial entitlement before login, session refresh, plan/limit handling, user-visible connection status. No API key or Morrow-owned OpenAI credentials. |
| Local data | Existing conversation and artifact facilities | Encrypted or OS-protected secrets; atomic task saves; source/output/approval records; export; crash recovery. |
| Site and identity | Next.js 16, existing brand, Clerk | Consumer story and truthful release state; one account at purchase/restore; deep link back to preserved app task. |
| Billing | Supabase functions/tables, Razorpay | One server-owned entitlement; verified checkout, signed and idempotent webhooks, periodic reconciliation, failed-payment grace, cancellation, refund, receipt. Use user-scoped access and server-only secrets per [Supabase guidance](https://supabase.com/docs/guides/database/secure-data); follow [Razorpay event documentation](https://razorpay.com/docs/payments/subscriptions/plugins/magento/webhook-events/). |
| Permissions | macOS mic, file picker, scoped computer access | Just-in-time request, plain reason, minimal scope, revocation view. Never pre-ask for Google or whole-computer control. |
| Telemetry | Existing diagnostics if any | Opt-in or privacy-conscious event metrics: first Speak, first completed response, task success, provider failure, checkout return. No raw audio or document text in analytics. |

**Entitlement states:** `installation_trial → account_link_pending → checkout_pending → active → payment_retry / cancelling_at_period_end → expired`. The backend is authoritative; a checkout success screen is provisional until verified. The app can cache a signed short-lived entitlement to cope with brief network loss, while offline limits are stated clearly.

**Data boundaries:** Keep local history and selected files on Mac by default. The actual Codex realtime session sends voice and task-relevant context to OpenAI under the customer's authenticated account. Supabase stores account, entitlement, device, and minimal operational metadata, not every document by default. Make delete/export behavior explicit and test it.

## Build order and release checks

| Phase | Scope | Exit proof |
| --- | --- | --- |
| 0. Clear blockers | OpenAI commercial path for bundled Codex realtime, name, release signing, actual Razorpay merchant readiness | Written integration decision, product claims adjusted, clean signed install works, cost model exists. |
| 1. First voice result | Ready/listening/transcript/answer/typing fallback; one real everyday question | A novice says a request, sees the correct transcript, hears and reads the answer, recovers from mic denial and provider timeout. |
| 2. One task | Selected document → explanation or draft → review/export; task state and history | Task survives stop, crash, restart; output opens; approval is enforced for file changes. |
| 3. Account and payment | One consumer plan, app-to-browser account link, verified entitlement | Real test purchase, renew, failure, cancel, refund, restore, and expired export on clean Macs. No activation code in customer path. |
| 4. Public site | Real product capture, clear price and AI-account split, working support | Every CTA reaches a functioning destination; mobile/desktop, reduced motion, captions, and legal copy checked. |
| 5. Habit | Shortcut, recent search, repeated tasks, optional connections | Returning user resumes a task in seconds; connections are only added for proven jobs. |

Measure: first-voice-start rate; median time to first **useful** response; transcript correction rate; permission-denial recovery; completed and reopened task rate; week-two return; trial-to-paid conversion after first success; support requests per 100 installs. Count "useful" through a short user rating plus an opened or exported result, not mere model completion. Run moderated tests with at least 10 novice Mac users before deciding that the flow is easy. Compare the same task against ChatGPT Work and Claude to see whether Morrow's extra subscription is justified.

## Decisions that still need evidence

- A ChatGPT account may support Codex in OpenAI's products while Morrow's third-party commercial distribution remains unconfirmed. This is the main launch gate.
- Paid ChatGPT plans and limits vary. An ineligible or rate-limited account cannot be fixed by buying Morrow.
- The customer's Codex plan supplies the intended realtime voice use; Morrow still has licensing, support, payment, and distribution costs. Price after measured economics and user tests.
- The installed Pilot's Keychain error is a fresh observation, not proof every build is broken. It must pass on a clean signed customer machine before public download.
- The visual concepts are mockups; generated text and example outputs require real implementation and user testing. The current local site and billing preview are not a completed public purchase flow.

## Method

I inspected the current local homepage and subscription page in Chrome, the installed Morrow Pilot until its activation/Keychain gate, and the relevant repository source and manifests. I read official product pages and help docs for Wispr Flow, OpenAI, Anthropic, Raycast, Granola, Apple, Razorpay, and Supabase on 24 September 2026. The [question map](question-map.md), [source ledger](sources.jsonl), and [open evidence queue](open-queue.md) preserve the boundary between observed behavior and recommendations. Competitor pricing and rollout details can change.
