# C001 local validation

These results are local, sampled checks for the five C001 effects. They do not establish every-frame, cross-platform or release verification. The pinned Hyperframes source revision was `28181602fe2d9ffa38474a6e8155a89909a7b8aa`; the reference used local GSAP 3.15.0 and Chromium headless shell 1243 (153.0.8010.12), with matching viewport, frame rate, background and assets. See `README.md` and `notices/catalog-c001.md` for the reference procedure and attribution.

The packed stdlib used by the website build and CLI/browser captures had SHA-256 `c16ed265f7745b6ef555ecbbb0ded92a22e2a336ef3ba6490c583ce0fc3e192c`. The later website vendor archive has SHA-256 `d88399fdf85c32cc57abef0866f517acf53ccd8b77cd7b4fa0e184d80b6a4d43`: its extracted `src`, `catalog` and `fixtures` are byte-identical to the tested archive; its additions are test harnesses, documentation and script metadata. This validation document was added afterward and is not in that vendor archive. At validation time the source was an uncommitted working tree based on `a9bc0ec22f75c7ce3dda5925f7234b8287d621f0`; the website vendor manifest must identify the accepted stdlib commit before landing.

## Reference samples

Default comparisons used 30 fps and frames 0, 15, 30, 60 and 119. Arc matched exactly at all five; chart matched at four and differed at two pixels at frame 15. Agent matched at frames 0, 15, 30 and 60; frame 119 differed at 13 pixels, mean RGB error approximately 0.0000412. Trail matched at four frames and differed at 23 pixels at frame 119. These nonzero results are measured differences, not exact matches.

Alternate agent text, targets and accent, and alternate trail label/violet/wide each matched at all five sampled frames. A blue/narrow trail case also matched at all five. Alternate chart title, description, value, accent and seven bars, and alternate arc title, labels and accent each matched all five. The chart and arc references are upstream pasteable snippets; the same input values were explicitly applied to both reference and candidate DOM. ASCII comparisons used the identical owned 320×240 authored bitmap: three combined cases covered each grid, accent and exit enum, and all 15 sampled frames matched exactly.

Additional duration checks compared pinned source to packed runtime at 1280×720: compressed agent at 2 seconds (frames 0, 15, 30, 45, 59), trail at 2 seconds (same frames), and trail at 6 seconds including HOLD (frames 0, 45, 90, 120, 150, 179). All 16 sampled frames matched exactly. The raw local measurements are in `/private/tmp/videoml-c001-validation/duration-comparison.log`; paired images use `duration-ref-*` and `duration-port-*` there.

The independently rendered copied-XML source frame differs from the accepted P03b snapshot at 203 of 76,800 pixels, bounding box `(243,101)-(265,141)`, channel maxima `(23,13,1)` and mean RGB errors `(0.0032031,0.0022396,0.0000130)`. ASCII comparison using that separately rendered source had a 32-pixel difference at frame 119; it is not an identical-bitmap comparison. The source frame is composition frame 75, local frame 15, at the original 320×240 size.

## Executed checks

- `npm run test:catalog-c001`: 6 passed, including late snapshot cancellation, dimension rejection and exit reverse seek. That source run used a temporary `stdlib/node_modules/gsap` symlink to the existing `videoml-org/node_modules/gsap` 3.15.0 installation; the link was removed afterward. A clean source checkout must install or otherwise resolve its declared GSAP dependency before running this command. `HYPERFRAMES_SOURCE=/Users/home/Projects/hyperframes npm run test:catalog`: 7 passed, including both pinned-source regeneration checks, after restoring upstream notice provenance. The older run without that environment variable passed 5 with 2 skipped.
- `C001_DEPS_ROOT=/private/tmp/videoml-c001-validation/consumer VIDEOML_CHROMIUM_EXECUTABLE_PATH=/Users/home/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell npm run test:catalog-c001:browser`: passed same-document independent instance seeks/disposal and one close per owned ASCII bitmap.
- Actual Chromium pending-capture check used a delayed provider and real `ImageBitmap`: disposing aborted the signal, rejected the pending seek, closed the late bitmap exactly once and emptied the root. Command and implementation are retained as `/private/tmp/videoml-c001-validation/cancel-browser.cjs`; result is `cancel-browser.log`.
- Website Gatsby production build passed. All five website-generated XML examples executed through the normal CLI with the tested packed runtime; XML, frames and MP4s are in `/private/tmp/videoml-c001-validation/consumer/website-xml-final/` and command output is `copied-xml-final.log` in the parent directory.
- Website lifecycle checks passed reduced-motion initial pause, repeated reverse seek, a changed parameter per effect, play/pause/reset and navigation; existing preview browser regressions also passed. Website `npm run test:preview` passed 9/9 and `npm run test:catalog` passed 4/4.

The corresponding logs, five final website frame-60 screenshots and scratch orchestration scripts are retained in `/private/tmp/videoml-c001-validation/`. Repository-tracked reference capture scripts and comparison instructions are in this directory's `README.md`; the temporary duration and browser-cancellation harnesses are identified above rather than represented as tracked tests. No model downloads, deployment or cloud rendering were involved.

After restoring the five upstream notice arrays to their pinned values, the exact source-test setup was:

```sh
# From the stdlib root; first refuse any existing file or link.
test ! -e node_modules/gsap && test ! -L node_modules/gsap
node -p "require('/Users/home/Projects/VideoML/videoml-org/node_modules/gsap/package.json').version" # 3.15.0
ln -s /Users/home/Projects/VideoML/videoml-org/node_modules/gsap node_modules/gsap
npm run test:catalog-c001
rm node_modules/gsap # only the link created above
HYPERFRAMES_SOURCE=/Users/home/Projects/hyperframes npm run test:catalog
```

The actual run used an EXIT trap that removed the link only if its target still matched. Results: 6/6 and 7/7 respectively, with logs `source-unit-gsap-link.log` and `catalog-pinned-fixed.log` under `/private/tmp/videoml-c001-validation/`. The preexisting vendor archive predates the upstream-notice correction in the current source catalog; it needs a metadata refresh after source acceptance. The local attribution and Apache license copy remain in the packaged `notices/` files.
