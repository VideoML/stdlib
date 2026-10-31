# Hyperframes inventory provenance and notices

The inventory references [Hyperframes](https://github.com/heygen-com/hyperframes) at commit `28181602fe2d9ffa38474a6e8155a89909a7b8aa`. The upstream repository declares Apache License 2.0 in its root `LICENSE` (a copy is retained at `licenses/Apache-2.0.txt`); individual registry items sometimes declare additional licenses, which are retained verbatim in the manifest. Each entry also lists the relevant notice and license files found beneath its source directory. The source paths reference that pinned revision; adapted particle implementations are noted below.

License entries describe source declarations, not approval to redistribute every embedded or remotely referenced asset. Third-party dependencies, fonts, images, audio, and other media remain unreviewed. An implementation packet must inspect its cited notices and source assets, retain required attribution and license texts, resolve dependency versions, and use an appropriately licensed neutral replacement where rights are unknown. The empty local fixture lists do not represent reused upstream assets.

The 456 registry entries map one-to-one to the 92 C packets in `packet-map.json`; the 14 shader registry entries are assigned to P08. The manifest records implementation status; verified counts require browser evidence and review.

The implementations of `particle-text-dissolve` and `particle-image-reveal` adapt the corresponding Hyperframes components at the pinned revision under Apache 2.0; their source is in `src/effects/particles/`. The included Geist font is distributed under SIL OFL 1.1 with its license in `fixtures/particles/Geist-OFL.txt`, and the neutral image fixture is original MIT-licensed artwork.

The implementation of `echo-smear` adapts the motion-measurement, bounded copy count and past-pose sampling concepts from Hyperframes `registry/components/echo-smear/echo-smear.html` at the pinned revision under Apache 2.0. Its source is in `src/effects/echo-smear/` and the Apache 2.0 license is included in `catalog/licenses/Apache-2.0.txt`.

The 14 shader formulas in `src/effects/transitions/upstream/` retain the pinned Hyperframes shader registry and shared source under Apache-2.0. The unquoted `glitch` key is included in the corrected inventory. Local pixel fixtures are authored for VideoML; shader implementation status and release verification remain separate.
