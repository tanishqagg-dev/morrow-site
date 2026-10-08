# Morrow overhaul research questions

Date: 24 September 2026. Audience: ordinary Mac users who are new to AI. Morrow is a voice-first agent; typing is always available. The intended first commercial model is a Morrow subscription plus the customer's eligible ChatGPT account.

1. What do the installed Pilot, current site, billing page, and source actually do? Evidence: fresh local UI inspection, repository components, package manifests. A Keychain activation error limits live native inspection.
2. How do leading voice and agent products get a new user to a first result? Evidence: official onboarding and product documentation for Wispr Flow, ChatGPT, Claude, Raycast, and Granola.
3. What must Morrow do differently? Evidence: competitor capabilities compared with Morrow's intended audience and first-use friction. This is a product judgment, not a market share claim.
4. What exact site, app, subscription, voice, safety, and failure states should be built? Evidence: current architecture and patterns above; recommendations explicitly marked.
5. What could invalidate the plan? OpenAI's authorization and commercial distribution path, voice inference and speech costs, signed customer builds, payment readiness, name clearance, and actual novice-user testing.

Stop when each question has enough evidence for a build decision; preserve unverified launch gates rather than treating them as solved.
