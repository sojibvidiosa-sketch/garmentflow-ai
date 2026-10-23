# Figma Design Audit

Source: *GarmentFlow AI — Premium SaaS UI · Fully Editable V2* (file `666tMrPp0W1Y9mUBcFiToh`), inspected via the Figma MCP connection on 23 Oct 2026.

**Inspected in detail:** Product Map (26-screen inventory), Design System foundations + component library, Screens 01, 05, 07, 08 (code + screenshot), Screens 10, 13 (screenshot), Components & States page (structure). Other screens were checked for existence and structure only.

## What was adopted
- Colour tokens exactly as named in Figma (`ink`, `secondary`, `muted`, `border`, `bg`, `surface`, `violet`, `violetLight`, `green`, `yellow`, `red`, `dark`, `teal`, `blueLight` …) → `src/app/globals.css`.
- Inter type scale (44 / 30 / 18 / 14 / 12), 13 px card radius, 9 px control radius, 40 px inputs, 235 px sidebar, 77 px top bar.
- Component set: Button (Primary/Secondary/Dark + disabled), Status badge, Text input, Metric card, Sidebar item.
- Screen layouts and copy for 01, 05, 06, 07, 08, 10, 13, 15, 17, 18, 21.

## Issues found and how they were handled
| # | Issue in Figma | Resolution in code |
|---|---|---|
| 1 | All sidebar icons are the same placeholder glyph `◫`. | Distinct Lucide icons per item. |
| 2 | KPI pills are always green, even for "Pending approvals" and "Overdue tasks". | Pill tone follows meaning (red = overdue, yellow = review, etc.). |
| 3 | PO table "Status" is plain text although a Status badge component exists. | Uses badges. |
| 4 | PO numbers inconsistent: `PO-1058` vs `PO-2026-1058`. | `PO-2026-####` everywhere. |
| 5 | Quantities without separators (`25000 pcs`). | `25,000 pcs`, right-aligned, tabular figures. |
| 6 | PO table has no sorting, pagination or row action. | Sortable headers, pagination, clickable rows. |
| 7 | Dashboard bar chart has no labels or axis; meaning unclear. | Replaced with a labelled "Order pipeline by status" chart. |
| 8 | Dashboard "Team activity" third row clipped; no timestamps. | Full list with time and PO links. |
| 9 | KPI trends (+12 %, +3.2 %) imply historical data the MVP won't have. | Removed; replaced with factual status pills. |
| 10 | AI Review: values styled like placeholders (grey); no confidence, source or missing-field state; no colour/size breakdown; no human confirmation. | Dark values, confidence badges, source quote + document highlight, missing-field notice, editable breakdown with total check, required confirmation checkbox. |
| 11 | T&A Tracker cells show only labels ("Sample ✓", "PP sample") — no dates, owners or overdue state. | Matrix of planned dates coloured by deadline state, legend, filters, detail modal with owner/priority/notes. |
| 12 | Login has no error, loading or show-password states. | Added. |
| 13 | Several states (Upload failed, Access denied, Unsaved changes) exist only as generic cards with a "Continue" button. | Implemented as specific EmptyState/Notice variants with appropriate actions. |
| 14 | `muted` (#849099) on white is ~3.3:1 contrast — below WCAG AA for small text. | Used only for placeholders/icons; readable text uses `secondary` (#555F69, ~6.6:1). |
| 15 | Desktop frames are fixed 1440 × 900 absolute layouts. | Rebuilt with responsive flex/grid; mobile drawer navigation; tables scroll horizontally inside cards. |
| 16 | Sidebar lists Phase-2 screens (Documents, My Tasks, Buyers, Team, Settings) as if live. | Shown in a "Phase 2" group, disabled with a "Soon" tag — no dead links. |

## Open questions for you
- Logo: the Figma uses a text glyph `◈`. Code uses a matching SVG mark — please supply a final logo if you have one.
- Pricing (৳2,499 / ৳5,999) is shown as "pilot pricing for discussion". Confirm before public launch.
- The "Contact & Demo Booking" form (Screen 04) is Phase 2; "Book a demo" currently opens an email to `NEXT_PUBLIC_CONTACT_EMAIL`.
