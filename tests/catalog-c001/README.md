# C001 browser and source reference checks

The five implementations adapt Hyperframes revision `28181602fe2d9ffa38474a6e8155a89909a7b8aa`; see `notices/catalog-c001.md` for attribution and the authored snapshot provenance. The reference scripts execute the pinned source locally, with GSAP 3.15.0 from an existing consumer. They do not download a browser or source. Use a clean consumer of the current package for final acceptance; evidence from other package bytes is not interchangeable.

Run from the stdlib root with its declared GSAP 3.15.0 dependency installed and resolvable in the checkout, plus a local Chromium and existing dependencies. `C001_DEPS_ROOT` supplies Playwright and esbuild; it does not resolve GSAP for imports from the stdlib source checkout:

```sh
export C001_HYPERFRAMES_ROOT=/absolute/path/to/pinned/hyperframes
export C001_DEPS_ROOT=/absolute/path/to/existing/consumer
export VIDEOML_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium
export C001_OUTPUT=/absolute/path/to/empty/output
npm run test:catalog-c001
npm run test:catalog-c001:browser
node tests/catalog-c001/reference-chart.cjs
node tests/catalog-c001/reference-arc.cjs
node tests/catalog-c001/reference-template.cjs agent-cursor '{}' default
node tests/catalog-c001/reference-template.cjs ascii-trail-reveal '{}' default
node tests/catalog-c001/reference-ascii.cjs
```

Reference files are PNGs in `C001_OUTPUT`; compare against frames from the matching public packed consumer and the same viewport, background, time, parameters and font environment using `python3 tests/catalog-c001/compare-png.py reference.png candidate.png` (Pillow required). For ASCII both paths must use the identical 320×240 `fixtures/catalog-c001/authored-snapshot.png`; frame 75 is the original composition frame, local frame 15 in the authored source scene. Compare the separately rendered XML source bitmap itself before treating source and preview as identical. Nonzero pixel differences remain measured differences, even when visually tiny.

For nondefault agent/trail source variables, pass a JSON object as the second argument and a filename label as the third argument to `reference-template.cjs`. Chart and arc are upstream pasteable snippets; apply any comparison parameters identically and explicitly to both reference DOM and candidate. The browser regression tests simultaneous instances and owned snapshot disposal; the unit suite covers cancellation with late snapshot completion and mismatched dimensions.

`reference-chart-option.cjs` and `reference-arc-option.cjs` contain the explicit upstream DOM adaptations used for the nondefault comparison. For the standalone website preview candidate, set `C001_PREVIEW_BASE` to a local server and run `node tests/catalog-c001/preview-option.cjs <effect-name> '<parameters JSON>' <label>`; it applies the supplied parameters without accepting visitor code. `reference-ascii.cjs` also accepts optional `<parameters JSON> <label>` arguments. Screenshot comparisons require the same background; the standalone candidate helper sets `#fdfdfd` to match the reference. Asset-dependent ASCII preview comparisons require the authored bitmap provider, as in the site's shipped preview.
