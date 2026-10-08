# Morrow voice-native research map

24 September 2026. Decision: what the Mac app should show, hide, and remember for ordinary people who speak first and type when needed. Proposed redesign, not shipped behavior.

| Question | Evidence | Decision test |
| --- | --- | --- |
| What appears before, during, and after speech? | ChatGPT Voice, Claude Voice, Wispr Flow, Raycast docs; Morrow code | Every state has a plain label, one next action, stop and recovery. |
| Can a visible chat-history page go away? | ChatGPT, Claude, Siri, Wispr, and Raycast all keep history or transcripts | Keep task continuity and results; remove the archive as main navigation. |
| How does a novice start? | Morrow Codex login and billing code; Apple permission guidance | No activation code, API key, provider picker, or upfront permission parade. |
| Where do account and payment live? | Clerk/Razorpay site; app entitlement; OpenAI Codex plan docs | Small Access sheet; browser sign-in and checkout. |
| What proves agent work? | Existing task/approval code; Siri actions | Visible result and approval before consequential action. |

Waves: official voice-product interfaces; opposing evidence for hiding history; accessibility and microphone permission; local implementation. Generic AI product roundups and image galleries lacked specific interaction evidence and did not change the decision.
