# Morrow: consumer product flow and subscription plan

> Superseded on 24 September 2026 by the [voice-first overhaul plan](morrow-overhaul/report.md). This earlier draft treats voice as optional and selected files as the first job; those recommendations no longer reflect the product direction.

Research and product recommendation, 24 September 2026. This is a plan, not a claim that the proposed journey is live.

## The decision

Build Morrow as a friendly Mac agent for people who are new to AI tools. It should help with a task they can describe in ordinary words and return a result they can inspect and use. Chosen files are the best first workflow to prove that promise. Voice is another way to ask, not a separate mode people must learn.

The first paid product should use the customer's eligible ChatGPT account. Morrow charges for its interface, file workspace, repeatable workflows, updates, and support. Say this plainly before anyone downloads or pays. OpenAI availability and limits vary by account and can change.

Do not launch as "an AI that does everything." ChatGPT Work, Claude, and Apple's own Mac assistant already cover broad requests. A new Mac assistant earns a place by making a common job quicker to start, safer to supervise, and easier to resume.

**Recommended first job:** "Help me with these files." A person picks one or more files or a folder. Morrow suggests plain-language tasks such as "Explain this," "Compare these," or "Organise this folder." It drafts the result, shows what it used, and asks before moving, replacing, sending, or deleting anything. Start with selected files, not a demand for whole-computer access.

**First-use rule:** ask for one action at a time. The visitor should not have to understand terms like Codex, agent mode, workspace, entitlement, activation, or API key to get a result. Use the accurate technical explanation in a short "How Morrow works" link, plan details, and support material.

## What the competitors teach us

| Product | Current offer | What Morrow should learn | What Morrow cannot claim as unique |
| --- | --- | --- | --- |
| [ChatGPT Work and Codex](https://help.openai.com/en/articles/20001275/) | Desktop agent for local files and apps, voice on eligible accounts, projects, longer work. Included access across plans, with usage limits. | Give a first-time user a clear job and a result without making them pick an agent mode. | "Uses files," "does work," or "has voice." |
| [Claude](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork) | Paid Cowork starts from a task, gathers files and tools, shows an approach, and runs multi-step work. [Pro is $20/month](https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan). | Show the plan, progress, and review point. Keep connection and permission setup tied to the task. | General-purpose agent execution. |
| [Raycast](https://www.raycast.com/pricing) | Fast Mac entry point, extensions, AI, dictation, and agent actions. Individual AI plans begin at $10/month and include AI credits. | Make opening Morrow effortless, with a global shortcut and a useful recent-work view. | Shortcut access, command palette, or AI chat alone. |
| [Wispr Flow](https://wisprflow.ai/pricing) | Free dictation, paid unlimited dictation from $15/month, across apps and devices. Its [first-use guide](https://docs.wisprflow.ai/articles/3152211871) goes from install and permissions to a practice dictation. | The first voice interaction should actually work and recover when permissions fail. | Voice input as the whole product. |
| [Granola](https://www.granola.ai/pricing) | One clear meeting-notes job. Free taste; Business at $14/user/month adds history, models, and integrations. | A focused result is easier to understand and sell than a long feature list. | Meeting notes unless Morrow truly does that job better. |
| [Notion AI](https://www.notion.com/help/notion-ai-faqs) | AI sits inside an existing workspace; full access is on Business and Enterprise, with limited trials on lower plans. | Keep the output in the place where the user will use it. | Connected-workspace search and document creation. |
| [Apple Intelligence and Siri](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/) | Siri AI is moving toward personal context, onscreen awareness, and actions on Apple devices. | Treat built-in Mac assistance as the default people will compare against. | A generic "assistant for your Mac." |

There is also a [different AI product called Morrow](https://www.getmorrow.ai/) in adjacent professional work. Clear the name, trademark, and domain before a broad paid launch. This is a naming risk, not a legal conclusion.

## Where the current journey breaks

The current marketing page leads to a personal demo for founders and solo operators, while `/subscribe` presents Personal and Business plans. The native onboarding asks for a pilot activation code, then ChatGPT sign-in, then goes through microphone, Google, computer control, profile, and voice check. The customer must understand three different identities or tokens: Morrow web account, Morrow activation code, and ChatGPT account. The [current Personal preview price in code](../components/BillingPortal.tsx) is ₹3,499/month or ₹35,690/year before GST, on top of any separate OpenAI charge. The plans are not published in Razorpay, so checkout is preview-only.

For a general consumer, this is too much setup before one result. The public promise, pricing page, and app onboarding also describe different audiences and stages. Keep the systems that work, but make them feel like one account and one journey.

## Exact customer journey

```mermaid
flowchart LR
    A[See a real task and result] --> B[Download signed Mac app]
    B --> C[Choose what you need help with]
    C --> D[Connect ChatGPT when ready to run]
    D --> E[Choose the files for this task]
    E --> F[See result and approve changes]
    F --> G[Return to recent work]
    G --> H[Create Morrow account when subscribing]
    H --> I[Pay and return to the app]
```

1. **Discover.** The website shows a real 30 to 60 second capture of one task, the actual input, the actual output, and the review step. Below it, show three everyday starting points: "Explain a file," "Compare two files," and "Tidy a folder." The main action is "Try Morrow free on Mac." A separate "See plans" link stays visible. State near both: "Bring your own eligible ChatGPT account. Morrow is billed separately." No fake product screenshot or unsupported ability.
2. **Install.** Offer the build for the visitor's Mac, system requirements, version, and a verified signed and notarized installer. First launch checks compatibility and network status. Resume setup after a quit or restart. Do not ask for payment or a Morrow account before the person has seen the app.
3. **Welcome.** One screen says "What would you like help with?" with a large input, a file drop area, and three examples. A smaller "Already subscribed? Sign in" link handles returning customers. A new visitor can choose a task without signing in. This gives the next sign-in a clear purpose.
4. **Connect AI only when needed.** When the visitor presses "Start," explain in one short screen: "Morrow uses your ChatGPT account to do the thinking. Continue to ChatGPT to connect it." Add "No Morrow payment today" and a link explaining eligibility and limits. Open the supported official browser sign-in, then return to the chosen task. Show "Connected" or a specific fix if the account is ineligible, rate limited, or sign-in fails. Do not ask for an API key. "Sign in with ChatGPT" as an identity provider is not the same thing as authorization to use Codex in a third-party app.
5. **First task.** Ask the visitor to select the files needed for this request. Default to typing; keep a microphone button beside the input. A sample task using clearly labeled sample files can teach the interface, but the first actual AI result should use the person's chosen content. If they started by dropping a file, do not ask them to choose it again after sign-in.
6. **Request access at the moment of need.** File picker access comes first. Ask for microphone permission only when the person taps the mic. Ask for Accessibility or computer control only for a task that needs it. Explain the requested scope and destination in everyday words. Offer "Not now" and a typed/file-only route. Default to the narrowest access mode.
7. **Run.** Show one timeline for "reading selected files," "working," and "ready to review." Allow stop. Preserve the original prompt, attachments, draft, and task state if the app crashes or the provider fails. For long tasks, reopen into the same task rather than silently starting again.
8. **Review.** Put the source next to the output. Mark uncertain claims. Let the person edit or ask for a revision without losing the first version. Any proposed file move, overwrite, deletion, external send, or purchase appears as an explicit preview with named targets and an approve button. The app must enforce that choice, not just display it.
9. **Finish.** Save the result in a predictable folder or export it. Show "Done" only after the file exists and opens. Recent work should show the task, selected source, result, and approval record. Search and resume work should use the same underlying task, not disconnected chat and library histories.
10. **Return.** A menu-bar entry and keyboard shortcut open the same simple composer. Recent tasks and two or three saved workflows sit under it. Ask for reusable preferences only after the person repeats a job; make them visible and editable.
11. **Subscribe.** Show the paywall after the first useful completed result, or near the end of a time-limited trial. This is when a new visitor creates a Morrow account. Offer a verified one-tap Apple or Google option where supported, with an email link as the fallback; no new password. Link the trial on this Mac to that account without losing the task or files. The paywall says exactly what continues with Morrow, what OpenAI may bill separately, whether the current ChatGPT plan is eligible, the renewal date, tax, and how to cancel. Payment happens in a browser checkout, then returns to an in-app "Morrow is ready" state. Never ask for an activation code after payment.
12. **Manage or leave.** In the app: Settings → Plan & billing → view status, renewal, invoice link, payment method, and cancel. Cancellation retains paid access through the paid period and keeps the user's local files and exports. A failed payment has a visible grace/retry state. An expired subscription can still open and export prior work.

### What a first-time user actually sees

Keep this to a handful of screens. Do not expose the underlying setup checklist.

| Moment | Main copy | Primary action | Quiet alternative |
| --- | --- | --- | --- |
| First open | "Hi, I'm Morrow. What can I help you with?" | Type a request or choose a suggested task | "Already subscribed? Sign in" |
| First AI task | "I'll use your ChatGPT account to help with this. Let's connect it." | "Continue to ChatGPT" | "How does this work?" |
| Files needed | "Choose the files I should use for this task." | "Choose files" | "Go back" |
| Permission needed | "To do this, I need access to [specific app or folder]." | "Allow for this task" | "Not now" |
| Result ready | "Here's what I made. Check it before you use it." | "Open result" | "Ask for a change" |
| Before a consequential action | "I'm about to move these 6 files into these folders." | "Approve changes" | "Keep everything as it is" |
| Trial nearing end | "Keep using Morrow after [date]. Your ChatGPT account is separate." | "See Morrow plan" | "Not now" |

Connection failure returns to the unfinished task with "Try again" and "Use another ChatGPT account." A ChatGPT usage limit says the task is saved and links to the provider's usage page; buying Morrow must not be presented as the fix. A denied permission offers a route that works without it when possible. Closing the app during setup preserves the request and selected files. These details matter more to a new user than an animated introduction.

## Subscription design

Use **one consumer plan** at launch. Keep team seats and operator tools out of the consumer path until team demand is real. Offer a 14-day full trial without a card only after a clean installation and first-task run are verified. A new visitor gets a server-issued, limited trial tied to this installation without a Morrow login. The trial can run AI tasks only after the visitor connects an eligible ChatGPT account. An account is required to subscribe, restore a purchase, or use Morrow on another device. If free-trial abuse is a concern, limit trial starts without silently deleting work.

The current ₹3,499/month preview price is hard to defend for a product that asks users to bring their own AI account. Test **₹499/month or ₹4,999/year, before applicable tax** as an India pilot hypothesis, not a settled public price. Interview and observe 10 to 15 consumers, then measure willingness to pay against successful repeated use. Keep pricing local to markets where payment, tax, refunds, and support can actually be delivered. Do not display a global checkout until those paths work.

The billing state should be one server-owned sequence: `trial → checkout_pending → active → payment_retry / cancelled_at_period_end → expired`. Razorpay creates the subscription; the backend verifies checkout and signed webhooks, records events idempotently, and grants or revokes Morrow access from the server's entitlement record. A client-side "payment succeeded" callback is only a provisional status. [Razorpay's subscription docs](https://razorpay.com/docs/payments/subscriptions/plugins/magento/webhook-events/) distinguish checkout callbacks from server webhooks. Razorpay lists trials and multiple payment methods, but the actual merchant account, currency, and recurring method must be verified before launch. [Razorpay product overview](https://razorpay.com/subscriptions/)

## Technical shape using this repository

| Layer | Keep | Change or add |
| --- | --- | --- |
| Mac app | Tauri 2, React, TypeScript, Rust host, existing file/artifact viewer, secure local credential storage | One task model for prompt, sources, progress, output, revisions, and approvals. Use the existing Codex app-server only through a supported, verified commercial integration. |
| Marketing and account | Next.js site, existing Morrow assets, Clerk web account | Consumer task story, real capture, single plan, truthful eligibility check. Defer Morrow account creation until purchase or restore; link the earlier device trial to that account. |
| Billing and entitlement | Razorpay integration and Supabase billing/activation tables and functions | Publish real plans only after end-to-end tests. Map a signed-in Morrow account to trial and paid entitlements; remove manual codes from consumer setup. Signed webhook processing, reconciliation, grace periods, and audit log. |
| Storage | Local conversation and library infrastructure | Make task history and files durable and recoverable. Keep content local unless a selected AI task needs it; describe cloud processing accurately. Use Supabase for account, entitlement, device, and minimal operational metadata, not as an accidental copy of every document. |
| Connections and phone | Existing connection catalog and companion work | Add connectors only when a first-class workflow needs them. Keep iPhone out of the launch promise until pairing, reconnect, revoke, and remote review pass real-device tests. |
| Release | Existing build and updater scripts | Signed/notarized installer, clean Mac test, crash recovery, update rollback, and support channel before public checkout. |

Do not rewrite the app in another framework. The biggest work is reconciling its account, entitlement, onboarding, and task states. Keep secrets in backend functions and use user-scoped access policies for account data. [Supabase's security guidance](https://supabase.com/docs/guides/database/secure-data) covers row level security and server-only secret keys.

## Build order and proof

1. **First-result path:** one selected-file task that can start, finish, reopen, and export. It must survive cancel, provider failure, crash, and restart. Use this to decide whether the chosen consumer job is real.
2. **Setup reduction:** choose a task first, connect ChatGPT once when needed, request permissions during the task, and create a Morrow account only at purchase or restore. Remove the consumer activation code. Test with a new Mac user who has never seen the project.
3. **Paid path:** trial entitlement, one published consumer plan, checkout verification, webhook renewal/failure/cancel, return to app, customer billing controls, and a clean-device install. Do not enable paid public checkout until a real end-to-end charge and cancellation test pass.
4. **Habit path:** recent work, repeat a workflow, global shortcut, reliable voice correction, and support for the tasks people actually repeat.

Measure median time from first app launch to first useful result, task completion and reopen rates, how often users approve versus abandon proposed actions, week-two return rate, and trial-to-paid conversion after a successful task. Count a result only if the output is opened and the user says it was usable. Compare the same task side by side with ChatGPT Work or Claude before claiming Morrow is faster.

## Gates before public launch

- The app's GPLv3 obligations and all bundled components need a release-specific license review. The repository's `LICENSE`, `SOURCE_CODE.md`, and `THIRD_PARTY_NOTICES.md` are the starting inventory.
- Verify the current OpenAI account-based integration and distribution rights. OpenAI's [Codex plan guide](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) confirms plan-dependent access and limits; it does not by itself grant Morrow third-party commercial distribution rights.
- Clear the Morrow name and wordmark for the launch markets.
- Prove the installer, account linking, payment, entitlement, first task, recovery, cancellation, and support path on a clean customer Mac. Current local prototypes and passing tests do not establish this.

## Assumptions to revisit

This recommendation uses the user's choices of **general consumers** and **bring your own AI account**. I interpret "general consumers" as Mac owners willing to use AI for ordinary files and personal work, not a team-first product. The proposed price, 14-day trial, and first task are test hypotheses. The research is based on official product pages and the local source as inspected on 24 September 2026; rollout availability and prices can change.
