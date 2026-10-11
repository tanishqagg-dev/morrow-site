# App screen sources

Captured 11 October 2026 from the running app preview at `http://localhost:1420`, with a 1440x900 viewport, deviceScaleFactor 2 and reduced motion. Original 2880x1800 PNGs are in `qa/round3/home/app/` in the parent Morrow workspace.

| Asset | Preview query or source |
| --- | --- |
| home.webp | `?theme=light&view=desk&preview=ready` |
| listening.webp | `?theme=light&view=desk&preview=listening&voice=active` |
| result.webp | `?theme=light&view=desk&artifact=demo` |
| home-mobile.webp, listening-mobile.webp | Crop of the corresponding 2x capture, x=850..2450, y=140..1740. No reconstructed UI. |
| result-mobile.webp | Crop of the 2x result capture, x=40..2020, y=110..1780. |
| library-detail.webp | Crop of the `?theme=light&view=work` 2x capture, x=70..1030, y=125..1015. |
| island-working.webp | The existing real native island preview in `qa/app/round2/native-island-working-light.png`, cropped x=508..932, y=22..130. The native island has no route in the Vite preview. |

All captures show interface preview sample data. The website calls the command sequence an example workflow. It does not claim a live task ran during capture.

Recaptured after review with capture-only CSS hiding `.morrow-preview-label` and `#onboarding-preview-notice`. Application source is unchanged. Each route was checked for other visible development labels before capture; see `qa/round3/home/app/home-clean-capture-report.json`. `library.webp` is the full fresh `?theme=light&view=work` capture used behind the native island.
