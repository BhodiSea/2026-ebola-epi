# Phase 8 exit gate — NVDA screen-reader audit

**Gate:** A screen-reader audit with NVDA confirms that the two primary public routes (`/today` and `/map`) are usable with keyboard navigation and a screen reader. No critical or serious axe-core violations remain (CI already enforces this; this file records the manual human walkthrough).

**Roadmap reference:** G4 in [docs/ROADMAP.md](../../ROADMAP.md#g4----create-exit-gate-evidence-directory).

## Setup

- **Screen reader:** NVDA (latest stable release)
- **Browsers tested:** Firefox ESR (NVDA's recommended pairing) and/or Chrome stable
- **Routes:** `https://<production-domain>/today` and `https://<production-domain>/map`

## Checklist

### `/today`

- [ ] Page title announced correctly on load
- [ ] Landmark regions (header, main, footer) navigable via NVDA landmark list
- [ ] Each `<Figure>` value is announced with its label
- [ ] `<SourceQuoteCard>` hover equivalent (focus) announces quote text and source
- [ ] `<SourceQuoteDrawer>` opens and traps focus; Escape closes and returns focus
- [ ] Data tables (if any) have proper `<caption>` and column headers
- [ ] No keyboard trap outside the drawer

### `/map`

- [ ] Page title announced correctly on load
- [ ] Map canvas has an accessible `aria-label` describing its content
- [ ] Table view (`?view=table`) is fully keyboard-navigable and announced
- [ ] View toggle (map ↔ table) is announced and operable without a mouse
- [ ] Health zone popups/tooltips have accessible text equivalents

## Result

> **Status:** ⚠️ Pending — audit not yet performed.
>
> Replace this block with:
> - NVDA version used
> - Browser(s) tested
> - Results for each checklist item (pass / fail / n/a)
> - Any issues found and whether they were resolved before sign-off
> - Timestamp: YYYY-MM-DD HH:MM UTC
> - Auditor: (name)
