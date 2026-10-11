# App screen sources

Captured 11 October 2026 from the voice-first app (`feature/glowup-trial-flow`), Vite dev server, `?theme=light&demo=voice-session`, 1440x900 viewport, deviceScaleFactor 2. The scripted demo drives the real voice room, captions, work steps and file viewer; its reading highlight, inline edit and review card are demo-only. Original PNGs are in `qa/round6/homepage-recapture/raw/` in the parent workspace.

| Asset | Moment |
| --- | --- |
| home.webp | Demo start, Home at rest |
| listening.webp | Listening, live caption part-way through the request |
| reading.webp | Board Brief.pdf beside the voice rail, a line highlighted as Morrow reads |
| result.webp | After the edit: the added Decision paragraph and the Review changes / Undo card |
| home-mobile.webp, listening-mobile.webp | Crop x=714..2314, y=160..1760 of the 2x capture |
| result-mobile.webp | Crop x=40..2020, y=110..1780 of the 2x capture |
| library-detail.webp | `?theme=light&view=work`, grid view, crop x=580..2000, y=110..1426 of the 2x capture |
| island-loop.webp, island-loop-mobile.webp, island-still*.webp | The native island's SwiftUI view, rendered headlessly from the app's island sources at 30 fps: listening in the notch, a card for Updating Board Brief.pdf with the app's real step names, then the Done pill. Drawn on a plain screen top with a menu bar and the camera housing on top (the real one has no pixels). 785x200 pt for desktop, 400x210 pt for phones. The stills are used under Reduce Motion. |

Capture-only CSS hid `.morrow-preview-label`, `#onboarding-preview-notice` and the sample document's "for interface preview" footer. Application source is unchanged. The site calls this an example workflow, not a live task.
