# Roadmap Module Changelog

All notable changes to the `frontend/src/modules/roadmap` module are documented here.
Follows semantic versioning as defined in the root README.

---

## [1.0.0] — 2026-04-24

### Added — Public-facing roadmap page at `/roadmap`

Forward-looking only. Iteration 1 is not recapped on this page; the route exists to tell users (and mentors, during the demo) what's shipping next.

#### Hero

- **Masked-reveal** headline and subhead via per-word `opacity + y` fade (30 ms stagger). Deliberately chose this over typewriter because the typewriter pattern is already used on `HeroDemo` and repeating it reads as shtick.
- Above the headline: a small emerald "PRODUCT ROADMAP" eyebrow with a pulsing dot. Same treatment used on the in-dev section labels, so the visual rhymes down the page.
- `prefers-reduced-motion` fallback replaces the per-word animation with static text; the rest of the page renders the same.

#### Two timeline sections

- **Iteration 2 · In development** — seven feature cards in a 2-column grid. Section label has a pulsing emerald dot; each card carries a pulsing green status dot plus an "In dev" tag.
- **Iteration 3 · Planned** — six feature cards with dashed border, slightly reduced opacity (`0.92`), muted slate status dot, "Planned" tag. Keeps them visually present but clearly differentiated from the actively-shipping group.
- Sections separated by a **static dashed divider with a small caption** ("Further out"). Rejected the AI's "animated line drawing in sync with scroll" suggestion because it jitters on slower devices and doesn't pay its way; IntersectionObserver card reveals already convey scroll-paced content.

#### Feature cards — 13 total, 6 with micro-demos

Layout per card: rounded corners, tinted icon slot, display-weight title, status chip (In dev / Planned) in the top-right, description paragraph, optional demo area. **No week subtitles** — estimated ship-weeks read as overpromises on a demo, and the status chip already tells users enough about relative priority.

Six cards get genuine micro-demos that begin animating on first enter-viewport (via `useInView` with `once: true`):

1. **Expiry tracking** — mini calendar grid (7 × 4) with today highlighted emerald and an "expiring" date pulsing red. A "Milk · 2d" chip above.
2. **Prices on the shopping list** — three ingredient rows (chicken breast, eggs, milk) with dollar amounts fading in on stagger, plus an "Estimated total" tally tweened by `AnimatedNumber`.
3. **Estimated meal cost** — three recipe rows with `$` amounts ticking up via `AnimatedNumber`. Makes the "recipe-X costs $6.80 this week" value read instantly.
4. **Real user profiles** — emerald-gradient avatar circle, name + "Your preferences" label, a "✓ Synced" chip on the right, and four preference pills (Vegetarian / Family of 4 / $150 per week / No nuts) staggering in.
5. **Nutritional information** — four horizontal bars (Protein / Carbs / Fats / Fiber) filling to target percentages with matching coloured fills and animated percentage counters.
6. **Fridge YOLO scanning** — scaled-down version of the AR scan: dark gradient backdrop, two SVG item silhouettes (apple + milk), a cyan bounding box + corner brackets around the apple, a tiny detection card anchored top-left showing "🍏 Granny Smith · 88%", and a looping cyan scan line. Reuses the visual language of `ARScanModal` without actually importing it.

Seven cards render static (icon + title + description + status chip): Better receipt OCR (iteration 2); Food map, Best prices from your history, Community support, Your food insights, Welfare food sources, Smart waste tracker (iteration 3). Rejected the AI's "animation on every card" plan — 13 bespoke animations is 8–10+ hours of work, most of which doesn't teach the user anything the description doesn't already say.

#### Feedback CTA

Full-width emerald-gradient card at the bottom with a subtle noise texture, "Want to shape what lands in iteration 2?" heading, and a white pill button linking to `FEEDBACK_URL` (currently a `mailto:` placeholder; swap to the team's Google Form when finalised). Closes the loop between "users see the roadmap" and "users give feedback that could reprioritise it."

### Added — Entry points

- **Sidebar nav link** (`SideNav.jsx`) — "What's next" with the `upcoming` Material icon, added as the final item so existing muscle memory on other links isn't disrupted.
- **Dashboard Quick Actions row** (`DashboardPage.jsx`) — a fourth row appended to the existing three (Upload / Fridge / Meals). Title gets a pulsing green "NEW" badge so it's visually discoverable without being obnoxious. Flagged via a `teaser: true` prop on the row data so the pulse is contained to that one row.

Rejected the AI's "four entry points" plan (nav + Dashboard + Footer + Made By modal). Footer would be noise; Made By modal is the wrong context (users open it for credits, not product news). Two high-quality surfaces beat four low-value ones.

### Copy decisions

- **No em dashes anywhere in user-facing copy.** Periods, colons, semicolons, or restructured sentences instead. Em dashes survive only in code comments. (Per explicit user request — em dashes read as AI-generated filler to many readers.)
- **No week labels** on cards. Originally shipped with "Week 8 / Week 9 / …" subtitles; dropped because a public roadmap shouldn't commit to sprint-level dates it can't guarantee.
- **Expiry tracking copy** explicitly mentions the optional recipe-prioritisation toggle ("…an optional toggle prioritises those ingredients in your meal recommendations so nothing goes to waste.") — ties the feature to its waste-reduction intent.

### Iteration 3 card roster

Six cards, ordered from most "plumbing" to most "community/social":

1. **Food map** — discover community fridges, affordable grocers, farmers markets
2. **Best prices from your history** — cross receipt history with store locations; route shopping runs to cheapest store per-basket
3. **Community support** — user-shared discount tips and store finds; entries auto-populate the food map so one person's find helps everyone
4. **Your food insights** — interactive charts for weekly spend, waste reduction, and other facts from receipt + fridge history
5. **Welfare food sources** — directory of food-bank programs, community meals, emergency relief
6. **Smart waste tracker** — YOLO rot detection + user-confirmed "cooked with X" events + "past expiry but still in fridge" diffs

### Notes for maintainers

- `FEEDBACK_URL` at the top of `RoadmapPage.jsx` is a `mailto:` stub. Swap to the Google Form URL when the team finalises it; no other change required.
- Micro-demos accept a single `active` boolean prop, toggled on when the enclosing card enters the viewport. Demos should stay idle until `active` is true so fast-scrollers don't see animations for cards they haven't reached yet.
- Each card uses `useInView(ref, { once: true, margin: '-80px' })`. The once-only pattern keeps the reveal from re-firing on scroll-back and avoids `IntersectionObserver` retaining references past first use.
- The YOLO demo deliberately **does not** import `ARScanModal`. It reimplements a minimal version at a smaller scale. Reusing the full modal would drag in body-scroll-lock + Escape handling + the full backdrop for a card-sized preview. Two small, specific implementations beat one shared one that has to be configurable for both contexts.
- Iteration 2 and 3 card content is in two arrays at the bottom of `RoadmapPage.jsx` (`ITERATION_2`, `ITERATION_3`). Adding / removing a card is a one-entry change; status treatment (pulsing dot, dashed border, etc.) is driven off the `planned` flag in `FeatureCard`, so the cards never need to know which section they're in.
- Reduced-motion fallback covers the hero's per-word animation and every micro-demo. The calendar pulse, scan line, stagger effects are gated behind the `active` flag (which reduced-motion users still trigger, so the *structure* stays intact — only the motion is dropped via `prefers-reduced-motion: reduce` on their system).
- **Do not add em dashes to user-facing copy in this file.** It's a project-wide convention now. Stet: periods, colons, or restructured sentences.
