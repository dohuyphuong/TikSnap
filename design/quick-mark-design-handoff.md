# Quick Mark — Design Handoff

This file is the human-readable companion to `quick-mark-design.handoff.json`.
The JSON file is the rendering source of truth for a team, design system tool,
or AI renderer. It contains the same design decisions in structured form.

## Product identity

Quick Mark helps people point out what matters in a photo without opening a
full photo editor. The feeling should be fast, clear, friendly, confident, and
privacy-conscious.

The product promise is:

> Capture a moment, mark what matters, and send it in seconds.

## Target

- Platform: mobile, portrait
- Canonical preview: `402 × 874`
- Recommended secondary check: `390 × 844`
- Font: Inter, weights 400 / 500 / 600 / 700
- Base page inset: `20`
- Minimum touch target: `44`
- No visible persistent navigation chrome
- Use device safe-area insets, not fixed top offsets

## Color direction

Quick Mark uses an airy pale-blue surface with electric blue action emphasis.
The editor intentionally changes to deep navy so the image and annotations feel
like the focus.

| Token | Value | Usage |
| --- | --- | --- |
| `background` | `#F7F9FC` | App page surface |
| `surface` | `#FFFFFF` | Cards and controls |
| `foreground` | `#132238` | Primary text |
| `mutedForeground` | `#6C7B91` | Supporting text |
| `border` | `#DDE5F0` | Card and input borders |
| `primary` | `#1457FF` | Capture, save, selected tools |
| `secondary` | `#EAF0FF` | Selected states and hero support |
| `accent` | `#FFF0E8` | Friendly reassurance / tips |
| `editorBackground` | `#111C2F` | Editor header and chrome |
| `editorSurface` | `#25334A` | Empty editor canvas surface |
| `annotationRed` | `#FF5C5C` | Point / area mark |
| `annotationYellow` | `#FFD166` | Alternate mark |
| `annotationMint` | `#49D6B2` | Alternate mark |

## Screen map

### Home `/`

The first screen should communicate the value proposition immediately. Keep
the first action decision simple:

1. A compact header with the Quick Mark eyebrow, “Make the detail clear.”, and
   a settings icon.
2. A pale-blue hero card with the line “Point it out.”, a short description,
   and the “Fast by design / Stays on device” reassurance pair.
3. Two large equal action cards:
   - **Capture** — primary electric-blue card, camera icon, “Use camera”
   - **Choose** — white card with border, gallery icon, “From library”
4. Recent work with two equal photographic cards. Before the user has saved an
   image, show the two example images; after saving, show local history.
5. A small warm tip: “Your saved photos will appear here after your first
   mark.”

The home screen is intentionally not a dashboard. It is an entry ramp into
the photo flow.

### Editor `/editor`

The editor uses deep navy framing and a large rounded image canvas. The top bar
contains close, “EDITOR / Mark the detail”, and a prominent Save action.

Tools:

- **Point**: tap the image to create a numbered colored marker.
- **Area**: drag over the image to create a colored rectangle.
- **Note**: tap to place a text note.

When a point or rectangle is created, open the note composer as a bottom sheet.
The composer supports adding and updating a short note. A selected annotation
gets a delete action. All coordinates are normalized to the 0–1 image/canvas
space so marks remain stable through resize and zoom.

The bottom panel contains:

- active tool selection
- current mark count
- watermark on/off
- share

The watermark is small, low-contrast, and placed in the lower-right of the
canvas so it does not cover the subject.

### Settings `/settings`

Settings should feel like part of the same product, not a generic system
screen. Show:

- Back button and “Settings” title
- “Your mark, your way.”
- A single editor default: “Add watermark”
- A Quick Mark brand card with “A faster way to point things out.”
- The privacy note: “Photos are processed locally. Quick Mark does not upload
  your images.”

## Interaction rules

- Camera and library actions use native device pickers.
- Recent images open back into the editor.
- Long-pressing a saved recent image confirms removal from local history.
- Save captures the composed editor canvas, including visible annotations and
  watermark, then saves it to the photo library and local history.
- Share uses the composed editor canvas, not the untouched original image.
- Press feedback should be subtle: reduced opacity and a small scale change on
  photographic cards.
- Note input autofocuses and supports the keyboard Done action.
- Errors should use short, actionable messages and never silently fail.

## AI rendering constraints

When regenerating this UI:

- Do not add accounts, cloud sync, collaboration, AI detection, or advanced
  photo filters to this MVP.
- Do not turn the home screen into a sidebar/dashboard layout.
- Do not replace the image cards with generic gray placeholders.
- Do not use emojis.
- Preserve the contrast between the light home/settings surfaces and the dark
  editor chrome.
- Preserve the large Capture action as the dominant first interaction.
- Maintain a memorable, deliberate blue palette; calm does not mean colorless.

## Source references

- App source: `artifacts/quick-mark`
- Structured render contract: `design/quick-mark-design.handoff.json`
- App icon: `artifacts/quick-mark/assets/images/icon.png`
- Example imagery:
  - `artifacts/quick-mark/assets/images/sample-sneaker.jpg`
  - `artifacts/quick-mark/assets/images/sample-desk.jpg`