# Source ledger

Opened or read on 24 September 2026. Product documentation is not a Morrow usability study.

| Primary source | Evidence and limit |
| --- | --- |
| [OpenAI, ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice) | Interruption, captions/text, transcript in history; transcript may differ from audio. Does not mean Morrow should copy chat UI. |
| [Anthropic, Claude voice](https://support.claude.com/en/articles/11101966-use-voice-mode) | Hands-free and push-to-talk, Stop, saved transcripts. No novice usability measurement. |
| [Wispr, app navigation](https://docs.wisprflow.ai/articles/5096240724-navigating-the-wispr-flow-app-desktop-ios-and-android) | In-context voice control plus Hub for history/settings/account. Dictation is not agent work. |
| [Wispr, first dictation](https://docs.wisprflow.ai/articles/6409258247-starting-your-first-dictation) and [Flow Bar](https://docs.wisprflow.ai/articles/1790396454-move-and-dock-the-flow-bar-on-desktop) | Shortcut/hold, recording bars, cancel, retry; resting/recording/processing. |
| [Raycast, Dictation](https://www.raycast.com/changelog/macos/0-57) | Hotkey, floating pill, live waveform, separate history. More technical audience. |
| [Apple, Siri AI](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/) | Conversational Mac entry, app actions, history app. Announcement claims and beta scope need hands-on validation. |
| [Apple, Assistive Access](https://developer.apple.com/videos/play/wwdc2023/10032/) | Fewer options, familiar patterns, multimodal cues, clear recovery. About iPhone/iPad cognitive access. |
| [Apple, Voice Control criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voice-control-evaluation-criteria) | Visible and spoken labels should match; recording needs voice start/stop; hidden actions must be reachable. |
| [Apple, macOS microphone authorization](https://developer.apple.com/documentation/bundleresources/requesting-authorization-for-media-capture-on-macos) | Explicit mic permission, purpose text, system-settings recovery. |
| [OpenAI, Codex plans](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) | Customer access and limits vary by plan; no third-party commercial redistribution permission is established. |
| [Current Morrow onboarding](../../../../src/ui/OnboardingFlow.tsx), [Codex runtime](../../../../src-tauri/src/lib.rs), [billing-flow audit](../codex-subscription-exact-flow.md) | Current app has official-browser login, Codex realtime voice, activation gate, and long setup. Code is not signed-build proof. |

Counterevidence: all five voice products above retain a history route. The Morrow recommendation removes a visible **chat archive** while keeping recoverable work. It must be tested with novices.
