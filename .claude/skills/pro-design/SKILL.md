---
name: pro-design
description: "Professional design director that orchestrates the installed design skills (ui-ux-pro-max, design-system, ui-styling, brand, design, banner-design, slides) into one brief → system → build → QA workflow. Use when a task needs end-to-end visual design quality: a new page, app or game UI, a redesign, 'make this look professional', a full visual pass before launch, or any request spanning several design areas (brand + tokens + components + assets). Skip for pure backend, data or infra work."
argument-hint: "[what to design] [platform/stack] [mood]"
---

# Pro Design

A design director, not a design library. It doesn't hold its own data. It decides
which installed skill to load at each step and makes sure the result passes a
professional QA bar before it ships.

The sub-skills are installed in `~/.claude/skills/`. Below, `$SKILLS` means that
directory, even when this skill is loaded from a project's `.claude/skills/`. If a
sub-skill is missing, apply the rules here directly and tell the user it wasn't available.

## When to use

- New interfaces: landing pages, dashboards, apps, game menus and HUDs
- Redesigns, and vague requests like "make it look pro" or "polish the UI"
- Work that spans areas, e.g. brand, tokens, components and marketing assets
- A pre-launch visual and UX quality pass

If the task fits one sub-skill exactly (only a banner, only a deck), load that
skill directly and skip this workflow.

## Workflow

Run the phases in order. For small tasks, compress phases but never skip phase 5.

### 1. Brief (always)

Write a five-line brief before touching any code:

```
Product:   what it is and who it's for
Platform:  web / mobile / desktop / canvas game, and the stack
Goal:      the one thing the user must do or feel
Mood:      3 adjectives (e.g. playful, bold, retro)
Limits:    existing brand, single-file, offline, perf budget, a11y needs
```

Fill it in from the codebase and request. Ask the user only about things that
change the outcome and can't be inferred.

### 2. Direction: load `ui-ux-pro-max`

Generate a complete recommendation (pattern, style, palette, type, effects and
anti-patterns):

```bash
python3 $SKILLS/ui-ux-pro-max/scripts/search.py "<product> <audience> <mood>" \
  --design-system -p "<Project Name>"
```

Then go deeper as needed:

```bash
python3 $SKILLS/ui-ux-pro-max/scripts/search.py "<query>" --domain style|color|typography|ux|landing|chart|icons|gsap -n 5
python3 $SKILLS/ui-ux-pro-max/scripts/search.py "<query>" --stack html-tailwind|react|nextjs|...
```

Treat the output as a starting point and override it when it fights the brief.
Record the chosen direction in one paragraph: style, palette, font pair, motion
level, and why.

### 3. Identity: load `brand` (only when there is or should be a brand)

- An existing brand is the source of truth: extract colors and type, never invent new ones.
- A new product gets a minimal identity: name treatment, 1 primary and 1 accent color,
  a voice of three adjectives.
- Logos, icons, CIP and social images go through `design`.

### 4. System and build

| Need | Load |
|------|------|
| Tokens (primitive → semantic → component), CSS variables, component specs, states | `design-system` |
| Components, Tailwind, shadcn/ui, dark mode, responsive layout, canvas visuals | `ui-styling` |
| Banners, ads, hero images | `banner-design` |
| Presentations | `slides` |
| Logos, icons, CIP, social photos | `design` |

Rules while building:

- Define tokens first: color, type scale, spacing (4/8 grid), radius, shadow, motion durations.
  Components use only semantic tokens, never raw hex.
- Use one icon family, as SVG. No emoji as UI icons.
- At most 2 font families. Body text ≥ 16px, line-height around 1.5.
- Every interactive element has hover, active, focus-visible and disabled states.
- Respect `prefers-reduced-motion`. Animate transform and opacity, not layout.
- Design mobile first. No horizontal scroll. Touch targets ≥ 44px.
- Keep the project's constraints, such as single file, offline, or no build step.
  Don't add a framework the project doesn't use.

### 5. QA (always, before reporting done)

Check every item and fix failures before handing back:

- [ ] **Contrast:** text ≥ 4.5:1 (large text ≥ 3:1), in both themes if there are two
- [ ] **Keyboard:** every action is reachable, focus is visible, tab order matches visual order
- [ ] **Touch:** targets ≥ 44px with ≥ 8px between them, and nothing depends on hover
- [ ] **Responsive:** check at 360, 768 and 1280 widths, and landscape phone for games
- [ ] **Consistency:** one icon set, the token scale only, no stray hex or off-grid spacing
- [ ] **Hierarchy:** one primary action per screen, headings in order, a clear focal point
- [ ] **States:** loading, empty, error and success are designed, not left to defaults
- [ ] **Motion:** meaningful and short (150–300ms for UI), with a reduced-motion fallback
- [ ] **Performance:** no layout shift, sized images, no heavy unused assets
- [ ] **Copy:** labels are verbs, the voice matches the brief, no placeholder text left

Look up any rule in detail with
`python3 $SKILLS/ui-ux-pro-max/scripts/search.py "<rule>" --domain ux`.

When a browser is available, screenshot the result (Playwright and Chromium are
preinstalled in cloud sessions) and review it against the brief, not just the code.

## Output

When done, report:

1. The direction chosen (one paragraph) and the brief it answers
2. What changed, by file
3. The QA results, with anything deliberately left out and why

## Game UI notes

Canvas games such as single-file HTML5 games need some extra care:

- HUD: put critical info (health, ammo, score) in fixed corners, readable at a glance
  with an outline or shadow over any background
- Menus: one focused, highlighted option, with keyboard, gamepad-style and touch input all working
- Feedback: every hit, pickup or level-up gets visual and audio feedback within 100ms
- Touch controls: thumb zones at the bottom corners, semi-transparent, ≥ 56px
- Scale with `devicePixelRatio` for crisp rendering, and draw text in the canvas's own pixel scale
