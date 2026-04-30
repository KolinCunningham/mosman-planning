# Mosman Planning Intelligence System

Community-led planning intelligence web app for Mosman LGA (NSW, Australia).

## Features

- **LEP Map Viewer** — all 61 Mosman LEP 2012 maps across 10 categories, with version history
- **Suggestion Engine** — create planning suggestions with mandatory give-take audit, 10/20-year horizon analysis, and regulatory pathway assessment
- **Map Change Proposals** — propose specific LEP map modifications (zoning, height, FSR) with consistency checks across all map layers
- **Self-Audit System** — 15-point checklist for suggestions, 10-point checklist for map changes; nothing logs until it passes
- **Session Log** — full audit trail, exportable as JSON

## Reference

- Mosman LEP 2012: https://www.planningportal.nsw.gov.au/publications/environmental-planning-instruments/mosman-local-environmental-plan-2012
- LEP Instrument: https://legislation.nsw.gov.au/view/html/inforce/current/epi-2011-0647
- Masterplan consultation: https://yourvoicemosman.com.au/masterplan

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173
