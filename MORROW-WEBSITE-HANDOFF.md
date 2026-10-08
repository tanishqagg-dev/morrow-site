# Morrow website

Local replacement of the marketing homepage. Activation, operator and private download flows remain in place. No deployment was requested or performed.

## Direction

Audience: non-technical founders and solo operators. Experience: a product demonstration followed by an explicit account/data explanation. Morrow yellow, charcoal, off-white, existing wordmark and flat mascot. No fake customer logos, claims of universal computer control, invented metrics, testimonials, or security certifications.

Primary action: Book a personal demo. Three workflow examples, a Talk/Work selector, account diagram, plan-dependent training explanation, FAQs and a short request form. All workflow illustrations are labelled as examples, not proof of an end-to-end live run.

## Demo form launch checklist

- The local preview never sends requests. `NEXT_PUBLIC_DEMO_FORM_ENABLED` is deliberately unset by default.
- Enable Netlify Form detection for the existing project. The registration skeleton is `public/__forms.html`; the form name is `morrow-demo`.
- Configure recipient notifications in Netlify. Decide retention, deletion ownership and the public contact address before launch.
- Set `NEXT_PUBLIC_DEMO_FORM_ENABLED=true` for the deployed build after confirming registration. AJAX submissions post to `/__forms.html`, not the Next route.
- On a preview deploy, submit a clearly marked test with the owner's approval and verify that it appears in Netlify Forms and reaches the intended recipient. A local test or HTTP 200 alone is not delivery verification.
- Check spam handling, failures, timeout feedback and privacy copy before public launch. The current privacy summary deliberately does not invent a retention period.

## Assets

`public/morrow/mark.png` and `wordmark.png`: existing project brand assets. `workspace.webp`: generated illustrative product scene, compressed from the preserved PNG. Source generation: exec-75f68fa1-5f8d-4eda-9057-6bb557e11385.png in the thread's generated_images directory. Prompt: single readable Mac workspace, weekly brief, flat yellow Morrow mascot, original logo, warm white and charcoal, no 3D character, no sidebar. It is not a verified product screenshot.

## Claim boundaries

- Local storage is not local inference. Relevant context is processed by OpenAI and enabled providers.
- Morrow uses ChatGPT account access through Codex, not a proprietary model. Eligibility and limits apply.
- Personal Plus/Pro training choices differ from Business/Enterprise/Edu defaults. Source: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- Access modes and macOS permissions matter; broader access can mean fewer approval prompts.
- The pilot is not marketed as production-ready or independently certified. Public download is not the primary conversion.

## Main files

- `components/MorrowWebsite.tsx`: content, interactive examples and form.
- `components/MorrowWebsite.module.css`: scoped styling, responsive layout and reduced-motion support.
- `app/privacy/page.tsx`: plain-language data summary.
- `app/layout.tsx`: Morrow metadata.

Use the package's normal test and build commands. Existing activation/security tests are retained; the stale homepage copy assertions now describe the Mac pilot.

## Verification

- `npm test`: 44 tests passed, including existing activation and operator checks.
- `npm run build`: static export and TypeScript compilation passed.
- `node scripts/verify-morrow-website.mjs`: Chromium checks at 1440, 768, 390 and 320 pixels; no horizontal overflow; workflow buttons, Talk/Work, training selector, FAQ, local form non-transmission, privacy navigation, reduced motion and keyboard skip link verified.
- Screenshots are under `qa/morrow-website/`. A waveform hydration mismatch found during visual inspection was fixed by rendering integer pixel heights.
- The previous Aestrum website icon is preserved at `qa/morrow-website/previous-aestrum-icon.png`; the browser favicon now uses the existing Morrow mark.
- Live form receipt and notification delivery remain unverified because this update is local only.

## Motion pass

The existing design and factual copy remain intact. `components/MorrowMotion.tsx` adds Lenis smooth wheel/anchor scrolling, GSAP entrances and reveals, a desktop scroll-driven files-to-brief scene, pointer-reactive Morrow, an in-view waveform, moving account-flow markers and a reading-progress line. `MorrowMotion.module.css` owns the new illustration and static fallbacks.

- The visible Pause motion control removes the scroll engine and pinned scene, restores static content and disables decorative transitions.
- System reduced-motion preferences are observed live. Smaller viewports use an ordinary stacked story, without pinning or horizontal scrolling. Native touch behavior is preserved.
- Animation updates do not render React per frame. Waveform and flow loops pause off screen. Tickers, event listeners, image listeners, resize observers and scroll scenes are cleaned up on teardown.
- The added document scene is explicitly illustrative, not a claim that a task actually ran.
- `node scripts/verify-morrow-motion.mjs` checks actual scroll-state changes, pause/resume teardown, the CTA destination, live reduced-motion changes, the desktop-to-mobile transition, no-JavaScript content and runtime exceptions. Screenshots: `qa/morrow-motion/`.
- The unit suite now has 45 passing tests. This is a local implementation, not a deployment or a benchmark of performance on every device.
