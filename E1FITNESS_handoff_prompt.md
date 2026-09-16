# E1FITNESS — Project Handoff Prompt

> Paste everything below into the new chat, and attach `e1fitness.html` to that message.

---

I'm working on a fitness tracking web app called **E1FITNESS**. I've attached the full source file. Please read it before making any changes. Here's everything you need to know.

## What it is

A **single self-contained HTML file** — all HTML, CSS, and JavaScript in one document, no build step, no frameworks, no npm. Vanilla JS only. It's roughly 3,650 lines / ~226KB. I open it directly in a browser and use it on my phone.

It is **not** a Claude artifact — it's a standalone file I run myself, so `localStorage` works fine and is already used. Don't strip it out.

- Dark theme, mobile-first. Primary target viewport is 390×844; it should also hold up at 360×640.
- Fonts loaded from Google Fonts: **Oswald** (headings/labels), **Inter** (body), **IBM Plex Mono** (numbers/dates).
- All data persists to `localStorage` under the key `e1fitness_db_v1`, via a debounced `save()` (120ms).

## Architecture

There's one global `DB` object (see `defaultDB()`) with this shape:

```
settings: {
  units: 'lbs' | 'kg', netCarbMode, restDefault, onboarded, connectedApps,
  goals: { calories, protein, carbs, fat, fiber, sodium, water },
  profile: { heightCm, weightLbs, age, sex, activityLevel, goalWeightLbs, goalType, intensity },
  lastBackup
}
exercises[]       // seeded
routines[]        // workout templates
sessions[]        // completed workout logs
activeSession     // null when not training
foods[]           // seeded + custom
foodLogs[]        // {id, date, meal, foodId, amountType, amount}
waterLogs{}       // date -> cups
activityLogs[]    // {id, date, type, label, calories, minutes}
meals[]           // saved meals/recipes
mealPlan{}        // date|slot -> mealId
measurements[]    // {id, date, weight, bodyFat, neck, chest, waist, hips, thigh, arm}
progressPhotos[]  // {id, date, dataUrl, note}
```

**Rendering:** there's no virtual DOM. A `renderers` object maps each of the 4 tabs to a render function; `setTab(tab)` switches tabs and `renderCurrent()` re-renders the active one. Sub-views are handled by `wkNav(view, extra)` and `nutNav(view, extra)`, which mutate a small state object and call `renderCurrent()`. Event listeners are re-attached inside each render function — follow that existing pattern rather than introducing delegation.

**Four tabs:**
- `dashboard` — daily gauges (calories/water/volume), macros, weight card, quick actions
- `workout` — sub-views: `home`, `library`, `exercise-detail`, `routines`, `routine-edit`, `active-session`, `history`, `stats`, `calculators`
- `nutrition` — sub-views: `diary`, `goals`, `meals`, `planner`, `activity`
- `progress` — weight trend, measurements, progress photos

## Data models

**Exercises** — `ex(name, category, equipment, type, instructions)`

- **219 exercises** currently seeded.
- Categories: `Legs`, `Chest`, `Back`, `Shoulders`, `Arms`, `Core`, `Full Body`, `Cardio`. The library's filter pills are derived dynamically from the data, so adding a new category needs no separate UI edit.
- `type` **must** be one of: `weight_reps`, `bodyweight`, `assisted`, `duration`, `cardio`. This drives `blankSetForType()`, `prefillSetForType()`, and `exTypeLabel()`. Any other value silently breaks set logging — this is the single most important constraint in the file.
- `equipment` is a free-text label shown as a chip (Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Smith Machine, Trap Bar, EZ-Bar, Landmine, Sled, Box, Medicine Ball, Battle Ropes, Sandbag, Yoke, Tire, Sledgehammer, None).

**Foods** — `food(name, servingLabel, servingGrams, kcal, p, c, f, fiber, sodium, barcode)`

- **510 foods** currently seeded, **142 with barcodes**.
- Food log entries use `amountType` of `'grams'` or `'serving'` with a numeric `amount`.
- `MEAL_SLOTS = ['Breakfast','Lunch','Dinner','Snacks']`.
- The food picker has four modes: **Search**, **Barcode**, **Quick Add**, **New Food**. Search shows **Recent** and **Frequent** sections when no query is typed (`recentFoodIds()` / `frequentFoodIds()`).
- Tapping an already-logged food opens `openServingsPrompt(food, date, meal, existingLog)` in edit mode — it pre-fills the amount, shows "Save Changes", and offers "Remove Entry".

## Context about me (affects content decisions)

I'm **Zambian, based in Lusaka**. The food database has been deliberately localized and should stay that way:

- Traditional Zambian dishes: nshima (maize and cassava), ifisashi, chibwabwa, katapa/kalembula, delele, kapenta, dried bream, buka buka, chikanda, ifinkubala, inswa, village chicken, vitumbuwa, munkoyo, mabisi, chibwantu, mahewu, and more.
- Zambian restaurant chains: Hungry Lion, KFC, Debonairs, Steers, Nando's, Galitos, Roman's Pizza, Pizza Hut, Subway, Fishaways, RocoMama's, Milky Lane.
- Packaged Zambian brands: BigTree, Swiss Bake, Yoyo Fun Snacks, Dairy Gold, Parmalat, Zammilk, Mosi, Chibuku Shake-Shake, Rhino, mealie meal (Breakfast and Roller).

**Important convention:** only genuinely packaged retail products get barcodes. Traditional home-cooked dishes and restaurant-ordered meals have an empty barcode string `''`, because you can't scan those in real life. Please keep that distinction.

## Known limitations — please don't present these as solved

1. **Barcodes are synthetic.** They're sequential internal codes in the `412345000xx` range, not real UPC/EAN codes. Scanning an actual product in a shop will not match. They exist so the Barcode tab is testable and functional.
2. **There's no camera scanning** — barcodes are entered manually into a text field.
3. **Nutrition numbers are estimates.** They're typical/representative macros from general knowledge, not pulled from a live nutrition database or official labels. The Zambian dishes and restaurant meals especially are reasonable approximations, not lab-verified figures.
4. **"Connected apps" (Apple Health, Fitbit, Garmin, etc.) are preview-only stubs** and are off by default. They don't sync anything.
5. **Progress photos are stored as base64 data URLs in localStorage**, so heavy use can hit the storage quota. There's a toast for this, but no compression.

## How I want you to work

- **Verify, don't assume.** Previously, changes were validated by actually running the file headlessly (jsdom for logic, a real browser for screenshots), walking through every tab and modal, and checking for console errors — plus data integrity checks for duplicate names, duplicate barcodes, invalid exercise `type` values, and NaN/missing numeric fields. Please hold to that standard if you have the tooling. If you don't, say so plainly rather than claiming something works.
- **Tell me honestly when something can't be done** or when a number is an estimate rather than sourced. I'd rather hear the caveat than get a confident wrong answer.
- **Preserve the existing visual design** unless I ask for a redesign. The dark theme, typography, and card layout are intentional.
- Keep it a **single self-contained file**. Don't split it into modules or add a build step.
- When adding seed data, **check for duplicate names first** and match the existing formatting and section-comment style.

## What I'd like help with next

[Describe your next task here.]
