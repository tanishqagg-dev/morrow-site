# Morrow should open as a conversation, not a workspace

Research and proposed consumer Mac design, 24 September 2026. This is not implemented or customer-tested. It supersedes the app navigation and history suggestions in [the earlier overhaul](../report.md). The [Codex login and billing audit](../codex-subscription-exact-flow.md) remains the technical basis.

## The decision

The first window asks **"What can I help with?"** Press Speak, talk, and see that Morrow heard you. The window changes when something needs attention: an answer, a result, a permission, or an approval. No sidebar, Home/Library/Settings rail, chat bubble timeline, profile page, model picker, or visible chat-history list.

This does not mean throwing away records. A voice agent must recover yesterday's draft and explain what it changed. ChatGPT, Claude, Wispr, Raycast, and Siri all keep transcripts or history. That is strong contrary evidence to a literal no-history implementation. Morrow should remove the **chat archive as the main interface** and retrieve work by goal or finished result instead. [ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice), [Claude voice](https://support.claude.com/en/articles/11101966-use-voice-mode), [Wispr Flow](https://docs.wisprflow.ai/articles/5096240724-navigating-the-wispr-flow-app-desktop-ios-and-android), [Siri AI](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/).

## What the competitors actually show

| Product | Observed behavior | Decision for Morrow |
| --- | --- | --- |
| ChatGPT Voice | Live interruption, spoken and text response, transcript later in chat history; transcript may not be verbatim. [Source](https://help.openai.com/en/articles/20001274-chatgpt-voice) | Live captions and interruption. Keep an exact action record distinct from approximate speech text. |
| Claude Voice | Hands-free and push-to-talk, Stop, saved voice transcripts. [Source](https://support.claude.com/en/articles/11101966-use-voice-mode) | Tap to speak first; optional hold to talk for noise; visible Stop. |
| Wispr Flow | Shortcut and small floating voice control with recording feedback; separate Hub for history/settings. [Sources](https://docs.wisprflow.ai/articles/6409258247-starting-your-first-dictation), [Flow Bar](https://docs.wisprflow.ai/articles/1790396454-move-and-dock-the-flow-bar-on-desktop) | Compact voice entry that expands for review. No persistent overlay by default. |
| Raycast Dictation | Hotkey, pill, waveform, stored dictations. [Source](https://www.raycast.com/changelog/macos/0-57) | Optional shortcut after the core app works. No shortcut knowledge required on first use. |
| Siri AI | Systemwide entry, app actions, dedicated conversation app. [Source](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/) | Show action plan, target, and approval clearly. Do not promise systemwide control before it works. |

Apple's Assistive Access guidance favors fewer choices at once, familiar patterns, multimodal cues, and clear error recovery. It concerns iPhone/iPad cognitive access, not a Morrow usability trial. [Apple](https://developer.apple.com/videos/play/wwdc2023/10032/).

## The app has five states, not five pages

| State | Visible content | Main action |
| --- | --- | --- |
| **Ready** | Small Morrow mark, "What can I help with?", large Speak, "Type instead". One "Continue your draft" line only when work is unfinished. Quiet Access control. Mic off by default. | Speak |
| **Listening / thinking / speaking** | Small animated mark and plain state label. Live captions, Mute, Stop, and text fallback. Interruption works while Morrow speaks. No fake waveform when capture is off. | Stop or continue |
| **Result** | The actual plan, draft, explanation, or file preview. Contextual actions such as Change it, Save, Open file. Short spoken summary with replay. | Review the thing made |
| **Decision** | What Morrow proposes, exact target, and consequence in ordinary language. Before/after for a file change. Allow once and Not now. No countdown. | Approve or decline |
| **Access** | Separate ChatGPT connection and Morrow plan statuses, microphone, captions/voice, data/export, help, sign out. Opens official browser login or web billing. Small sheet, no profile page. | Fix one problem |

When a person asks for old work, **Find something** searches result names, type, or ordinary phrases and displays a short list of outcomes. "Show the birthday email we wrote" opens the same retrieval through voice. This is not a chronological chat page. If nothing matches, say so. Underlying local task, action, and result records still need export and deletion.

### Small states that must still be designed

| Trigger | What the person sees | Exit |
| --- | --- | --- |
| Speak pressed, permission undecided | One sentence explaining why Morrow needs the mic, then the macOS prompt. | Allow returns to Listening; denial offers Type instead and Mac settings. |
| No speech detected | "I didn't hear anything" with Try again and Type instead. | Return to Ready without creating an empty task. |
| Morrow is processing | "Thinking" and Stop. Keep the user's last words visible for orientation. | Spoken answer or Result; retry if transport fails. |
| Morrow is speaking | "Speaking", live captions, Stop, Mute, and interruptible mic. | Interruption returns to Listening; Stop returns to Ready or Result. |
| Network drops | "Connection lost. Your draft is safe here." Show Retry and Type instead when possible. | Reconnect to the same task; do not silently resend a consequential action. |
| OpenAI account/usage problem | "ChatGPT needs attention" and Open ChatGPT connection. Keep Morrow plan status separate. | Official browser reconnect or wait for OpenAI limit reset. Buying Morrow is not framed as the fix. |
| Morrow trial/plan problem | "Morrow needs a plan" and See price and subscribe. Keep ChatGPT connection status separate. | Verified browser checkout or restore purchase. |
| Checkout returned but webhook is late | "Checking payment" with Return to Morrow and Retry check. No false unlocked state. | Verified entitlement opens the same task. |
| External action awaiting approval | Exact destination and content with Send/Allow once and Not now. | Decision recorded, then actual outcome shown. |
| Task finished | One concrete result, where it was saved, and a way to change or use it. | Ask follow-up or Ready. |

There is no permanent "new chat" button. Starting a fresh request from Ready creates a new task internally. The app can ask a short clarifying question if a spoken follow-up could refer to two tasks. "Continue" always names the unfinished thing so the person knows what they are resuming.

## Exact journey

1. Website explains that Morrow is a Mac app using the customer's ChatGPT/Codex access, with a separate Morrow fee. Pricing is legible before checkout. Download leads to a signed installer.
2. First launch says "Connect your ChatGPT account" and opens official OpenAI sign-in in the default browser. Morrow reads account status. No OpenAI password or API key enters Morrow. A limited Morrow trial entitlement must come first because current native login requires an active license. [Technical audit](../codex-subscription-exact-flow.md).
3. Ready gives one example, such as "Help me understand a letter." No capability carousel and no Google/computer-access permission sequence.
4. First Speak press explains mic use and triggers macOS permission. Denial shows "Microphone is off", Open Mac settings, and Type instead. [Apple](https://developer.apple.com/documentation/bundleresources/requesting-authorization-for-media-capture-on-macos).
5. Morrow starts the current bundled Codex realtime voice path. A state label says Listening, Thinking, or Speaking. The person can stop or interrupt. Longer output becomes a Result.
6. File, Google, or computer permission is requested only when that task needs it. Consequential send/change uses the Decision sheet. Completion shows the actual output and failure shows a repair path.
7. On return, Ready offers Continue only for unfinished work. Completed work is found by purpose or Find something. Resumption opens the task state, not a blank new chat.
8. At trial end, the app states Morrow's price and the separate OpenAI requirement, then opens Clerk/Razorpay web checkout. A verified entitlement returns automatically. Closing checkout or a delayed webhook preserves work.

## Voice and accessibility contract

- Deliberate start, visible mic state, one-tap and spoken Stop. Mute prevents capture; Stop ends the session. These labels must not be conflated.
- Captions on by default for Morrow speech. Text remains available, and a user can correct important wording before an action. OpenAI warns that speech transcripts may differ from what was said. [OpenAI](https://help.openai.com/en/articles/20001274-chatgpt-voice).
- Proposed commands to implement and test: "wait", "stop", "repeat", "slower", "show me", "change that", and "what did you do?" They are not all confirmed current-runtime features.
- Visible labels also work with keyboard and macOS Voice Control. Apple calls for visible/spoken label match, reachable hidden actions, and voice start/stop for recording. [Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voice-control-evaluation-criteria).
- No auto-start microphone, ambiguous glowing idle state, timed approval, or mascot celebration after every sentence. Reduced motion gets a static state label.

## What changes from the current app

| Current element | Proposed change |
| --- | --- |
| Home / Library / Settings rail and conversation sidebar | One voice canvas with the five states above. |
| Chronological chat history and bubbles | Result-focused retrieval on request; local task record remains. |
| Profile page and setup questionnaire | Remove. Put sign-out and data controls in Access. Ask preferences only when useful. |
| Activation code as first step | Trial entitlement and automatic browser checkout return. Keep manual code for pilot support. |
| Upfront Google and computer permissions | Ask at the point of use with a specific reason. |
| Talk versus Work mode | A spoken conversation can become a task without mode selection. |
| Provider, API, and model terms | Explain "Uses your ChatGPT account"; hide technical selection. |

## Art direction and delivery

Experience model: **Morrow speaks beside the work it is doing**. Ready can be simple, but a selected file opens a work stage with its source, Morrow's result, and a persistent voice dock. This is the distinctive bridge between a spoken request and a reviewable action.

Use the actual [Morrow wordmark](../../../../brand/morrow/wordmark.png) and [yellow two-eyed mark](../../../../brand/morrow/mark.png), not regenerated serif lettering or a generic star. The existing product uses a thick rounded wordmark, system sans text, crisp white, black-green ink `#22251f`, and Morrow yellow around `#ffe34b`; dark mode uses `#1a1d19` and `#f4f5ee`. Large heavy sans headings, clear borders, and spare yellow accents fit this identity. Do not place the app on scenic wallpaper or turn the mascot into a luxury editorial illustration. [Current Morrow styles](../../../../src/morrow.css) and [site styles](../../../components/MorrowWebsite.module.css).

The [corrected concept boards](../../../../output/morrow-brand-corrected-2026-09-24/README.md) cover account connection, Ready, Listening, source/result, approval, and dark mode. They are concept images, not shipped screens. The previous serif/cream images were rejected and moved to a superseded folder.

Build order: prove signed-build Codex login/voice and trial; replace navigation with the five-state UI; add captions, stop/mute and permission recovery; preserve task results with retrieval/export/deletion; connect verified checkout return; test the full path with nontechnical Mac users.

The main UX risk is finding old work without a visible archive. The [prototype test](open-queue.md) should decide whether the outcome finder is enough. The main release risk is commercial availability of the bundled Codex voice path. [OpenAI's plan guide](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) describes access, not redistribution rights.
