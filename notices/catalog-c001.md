# C001 component notices

The five C001 effects adapt Hyperframes sources at commit `28181602fe2d9ffa38474a6e8155a89909a7b8aa`, licensed under Apache-2.0: https://github.com/heygen-com/hyperframes/blob/28181602fe2d9ffa38474a6e8155a89909a7b8aa/LICENSE . Source directories are `registry/components/agent-cursor`, `animated-bar-chart`, `arc-motion-path`, `ascii-render-pass`, and `ascii-trail-reveal`.

GSAP 3.15.0 and MotionPathPlugin use the GSAP Standard license: https://gsap.com/standard-license/ . Geist is distributed under the SIL Open Font License; see the website's Geist-OFL notice.

The authored snapshot fixture is a P03b captured VideoML scene, not an upstream media asset. `p03b-authored-source.xml` records its exact source, source scene `source`, absolute source frame 75, 30 fps, 320 × 240. The PNG SHA256 is `6cf806906cb439ddc954e6ef0b81e2cd2de4c216493b9dfa878c916c256e7d64`; the source XML SHA256 is `235628946fdbd889b7da8e055cb89d46869a2891ae647988c1fe1400520d2d7f`. It was captured through the P03b accepted renderer; its source Geist font SHA256 is `19f9c92546aa300c312235e3125af1b81394d8db9a4bc4a425cd5b641d2d54e1`. `ascii-render-pass.xml` places the same source scene at frame 0 and samples frame 15, preserving its scene-local frame 15 from the original frame 75 scene starting at frame 60. Full P03b capture evidence is `/private/tmp/p03b-packed/snapshot-accept-parity.log`.
