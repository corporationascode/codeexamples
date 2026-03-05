# Director Appointment Resolution Template

## Document Generation

Use the **Microsoft Word skill** (`/docx` or `document-skills:docx`) to generate director appointment resolutions.

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     {corporation_legal_name}                        │
│            (the "Corporation")                                      │
│                                                                     │
│        RESOLUTION OF THE BOARD OF DIRECTORS                         │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  APPOINTMENT OF DIRECTOR                                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEREAS the board of directors of the Corporation (the "Board")    │
│  deems it advisable to appoint an additional director;              │
│                                                                     │
│  AND WHEREAS {appointee_prefix} {appointee_name} has consented      │
│  to act as a director of the Corporation;                           │
│                                                                     │
│  NOW THEREFORE BE IT RESOLVED THAT:                                 │
│                                                                     │
│  1.  {appointee_prefix} {appointee_name} be and is hereby           │
│      appointed as a director of the Corporation, effective          │
│      {effective_date}, to hold office until the next annual         │
│      meeting of shareholders or until a successor is duly           │
│      elected or appointed.                                          │
│                                                                     │
│  2.  The officers of the Corporation be and are hereby              │
│      authorized and directed to do all such acts and things         │
│      and to execute all such documents as may be necessary          │
│      or desirable to give effect to this resolution.                │
│                                                                     │
│  The undersigned, being all of the directors of the Corporation,    │
│  hereby consent to the foregoing resolution pursuant to the         │
│  {governing_law} and the by-laws of the Corporation.                │
│                                                                     │
│  DATED as of the {effective_date}.                                  │
│                                                                     │
│                                                                     │
│  _________________________          _________________________       │
│  {director_1_name}                  {director_2_name}               │
│                                                                     │
│  _________________________          _________________________       │
│  {director_3_name}                  {director_4_name}               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Styling Specifications

### Page Setup
- **Size**: Letter (8.5" x 11")
- **Orientation**: Portrait
- **Margins**: 1.25 inch all sides

### Typography

| Element | Font | Size | Style | Color |
|---------|------|------|-------|-------|
| Corporation Name | Times New Roman | 16pt | Bold | #000000 |
| "(the Corporation)" | Times New Roman | 11pt | Italic | #333333 |
| "RESOLUTION OF THE BOARD" | Times New Roman | 14pt | Bold, Caps | #003459 |
| Section Headers | Times New Roman | 12pt | Bold, Underline | #000000 |
| Body Text | Times New Roman | 12pt | Regular | #000000 |
| WHEREAS/RESOLVED | Times New Roman | 12pt | Bold | #000000 |
| Signature Lines | Times New Roman | 11pt | Regular | #000000 |

### Alignment
- Corporation name block: Center aligned
- Body text: Justified
- Numbered resolutions: Left aligned with 0.5" indent
- Signature blocks: Two columns, evenly spaced

## Field Mappings

| Template Field | Data Source |
|----------------|-------------|
| `{corporation_legal_name}` | `entity.legal_name.en` or `.fr` |
| `{appointee_prefix}` | `person.prefix` (Mr., Mrs., Ms.) |
| `{appointee_name}` | `person.name` |
| `{effective_date}` | Parameter input, formatted as "January 12, 2026" |
| `{governing_law}` | Derived from `entity.jurisdiction_of_formation` |
| `{director_N_name}` | From `entity.governance.directors[]` (active only) |

## Governing Law Mapping

| Jurisdiction | Governing Law Reference |
|--------------|------------------------|
| `federal` | Canada Business Corporations Act |
| `QC` | Business Corporations Act (Quebec) |
| `ON` | Business Corporations Act (Ontario) |
| `BC` | Business Corporations Act (British Columbia) |
| `AB` | Business Corporations Act (Alberta) |

## Word Generation Instructions

When using the docx skill, provide these instructions:

```
Create a board resolution document with:

1. Page setup: Portrait, Letter size, 1.25" margins
2. No decorative border (formal business document style)

Content to include:
- Header: Corporation legal name centered, 16pt bold
- Subtitle: "(the "Corporation")" in 11pt italic, centered
- Title: "RESOLUTION OF THE BOARD OF DIRECTORS" in 14pt bold caps, navy
- Horizontal line
- Section header: "APPOINTMENT OF DIRECTOR" bold underlined
- Another horizontal line
- WHEREAS clauses (two paragraphs)
- "NOW THEREFORE BE IT RESOLVED THAT:" in bold
- Numbered resolution paragraphs (1 and 2)
- Consent paragraph referencing governing statute
- "DATED as of the [date]."
- Signature blocks for all existing directors (2 per row)

Use formal legal document styling:
- Times New Roman throughout
- Justified body text
- Proper legal paragraph spacing
```

## Signature Block Layout

For N directors, arrange signature blocks in rows of 2:

```
Directors 1-2:   _____________    _____________
Directors 3-4:   _____________    _____________
Directors 5-6:   _____________    _____________
(etc.)
```

If odd number of directors, last row has single signature block centered.

## Sample Output Filename

```
ent-artisan-bakery-co_director-appointment_per-rachel-anderson_2026-01-12.docx
```
