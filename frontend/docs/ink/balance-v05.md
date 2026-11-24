# INK v0.5 experimental geometry and paint

Experimental branch only; production v0.4 is unchanged. No new dependencies.

## Reproduce

From the repository root:

```sh
node frontend/scripts/ink/v05/run.mjs
node frontend/scripts/ink/v05/run.mjs --full > v05-results.json
```

The full suite contains 17 deterministic games and 718 actions. The recorded wall-clock timings are from the experiment execution environment and are not browser benchmarks. See balance-v05-results.json for complete per-player action counts, scores, per-weapon measurements, round history, and geometry probes.

## Setup

- 2 players: 10 rounds, 20 AP/player, circular diameter 16 (factor 5).
- 3 players: 9 rounds, diameter 18.6.
- 4 players: 8 rounds, diameter 20.2.
- The two-action budget, rotating starting player, exposed-area score, ink cancellation, and v0.4 launch ownership rule are retained. Radius is rounded to 0.1.
- New geometry: ramp (3 x 1.5 x 1.5), canopy (3 x 2.6 roof, height 2), basin (r=1.45, height 1.25), tunnel (3 x 2.6 x 1.8), tower (r=.65, height 2.5).
- Gun: 105 first-hit rays (21 yaw x 5 pitch), budget 7; fan half-angle .23 rad, pitch .035 rad. Air: 126 downward first-hit rays; selectable 0/45/90/135-degree strip orientation. Bomb: 240 first-hit rays, fixed emission budget 9; initial sphere and directional distribution variants.
- Brush: surface graph path constrained by length; one optional waypoint is accepted by the experimental engine, but AI uses the direct path. Graph adjacency is a proximity approximation rather than exact mesh geodesics.
- Selected directional splash candidate: 65% of rays in downward equal-area disk distribution (nominal radius 1.25), remaining 35% upper hemisphere; air strip 2.8 x 1, budget 3.2; brush length 3.
- No special building-specific damage multiplier. Height range bonus and roof-majority requirement from v0.4 still apply; ray bomb does not use the prior height-dependent paint budget/area bonus.
- Legacy comparison uses the same experimental candidate generator and exact ground intersection implementation, with legacy building inventory and legacy paint distribution. It is not a bit-for-bit replay of production v0.4.

## Key results

| Candidate, 2p 10R | Brush | Gun | Bomb | Air | Buildings | Coverage |
|---|---:|---:|---:|---:|---:|---:|
| Legacy inventory + legacy paint | 6 | 0 | 30 | 2 | 2 | 55.2% |
| New inventory + legacy paint | 6 | 0 | 30 | 2 | 2 | 55.2% |
| New inventory + uniform spherical rays | 21 | 2 | 0 | 17 | 0 | 63.9% |
| Selected 65% disk distribution | 21 | 2 | 14 | 3 | 0 | 64.7% |
| Selected, two-action search | 24 | 1 | 13 | 2 | 0 | 66.1% |

The selected 65% setting is an experimental starting point, not a balanced release. The geometry is meaningfully different, but balanced and mixed-style free-play matches did not voluntarily build under ray patterns. Forced build + air opening (P1, same profiles and setup) led to the following scores: ramp 64.33/54.66, canopy 66.89/60.09, basin 68.37/60.67, tunnel 65.40/72.95, tower 73.89/64.56. Compare the unforced fast candidate 62.46/67.49. Each row is one deterministic trajectory, not a win rate. The baseline and openings were not mirrored across seats.

Initial uniform sphere geometry probe: ground bomb deposits 3/9; basin deposits 6.225/9. Canopy and tunnel preserve shaded ground under their roof; the measured subset of shaded ground was 6 and 3.75 square units. These are from a controlled central-region test, not exact full projected roof area. See JSON for probe inputs/results. The 65% candidate changes the emission distribution, so these probe masses should not be quoted as final candidate measurements.

Map factors for 2p 10R: factor 4 diameter 14.2, first contact R3, 24 of 40 paints touched enemy territory, coverage 72.6%; factor 5 diameter 16, R4, 19 of 40, coverage 64.7%; factor 6 diameter 17.4, R6, 9 of 40, coverage 64.6%. The middle setting is a reasonable initial recommendation. Three-player selected game had 53.4% coverage, first contact R2 and no buildings; four-player 66.7%, first contact R2 and no buildings.

## Next experiments before release

- Improve long-term AI construction evaluation and test seat-swapped openings.
- Narrow tunnel roof or reduce its exposed area; test the protection strategy after establishing floor territory, not only first-turn air.
- Reduce dependence on elevated bomb range; validate roof control with different geometries.
- Improve gun candidate selection (first-hit fan is sensitive to elevation and aim), and test ghost ink separately.
- Test brush path accuracy, increase ray sampling/resolution convergence, and check browser performance/rendering before integrating into production.
