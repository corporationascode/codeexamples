# Resignation Resolution Template

## Document Generation

Use the **Microsoft Word skill** (`/docx` or `document-skills:docx`) to generate resignation resolutions.

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
│  ACCEPTANCE OF RESIGNATION                                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEREAS {outgoing_prefix} {outgoing_name} has served as            │
│  {roles_held} of the Corporation;                                   │
│                                                                     │
│  AND WHEREAS {outgoing_prefix} {outgoing_name} has tendered         │
│  {their} resignation from {all_positions}, effective                │
│  {effective_date};                                                  │
│                                                                     │
│  NOW THEREFORE BE IT RESOLVED THAT:                                 │
│                                                                     │
│  1.  The resignation of {outgoing_prefix} {outgoing_name} as        │
│      {roles_held} of the Corporation, effective {effective_date},   │
│      be and is hereby accepted.                                     │
│                                                                     │
│  2.  The Board extends its sincere appreciation to                  │
│      {outgoing_prefix} {outgoing_name} for {their} valuable         │
│      service and contributions to the Corporation.                  │
│                                                                     │
│  3.  The officers of the Corporation be and are hereby              │
│      authorized to update the corporate records to reflect          │
│      this resignation.                                              │
│                                                                     │
│  The undersigned, being all of the directors of the Corporation,    │
│  hereby consent to the foregoing resolution.                        │
│                                                                     │
│  DATED as of the {effective_date}.                                  │
│                                                                     │
│  _________________________          _________________________       │
│  {director_1_name}                  {director_2_name}               │
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
| Section Header | Times New Roman | 12pt | Bold, Underline | #000000 |
| Body Text | Times New Roman | 12pt | Regular | #000000 |
| WHEREAS/RESOLVED | Times New Roman | 12pt | Bold | #000000 |
| Signature Lines | Times New Roman | 11pt | Regular | #000000 |

## Field Mappings

| Template Field | Data Source |
|----------------|-------------|
| `{corporation_legal_name}` | `entity.legal_name.en` |
| `{outgoing_prefix}` | `outgoing_person.prefix` (Mr., Ms.) |
| `{outgoing_name}` | `outgoing_person.name` |
| `{their}` | "his" or "her" based on prefix |
| `{roles_held}` | "a director and Secretary" / "a director" / "Secretary" |
| `{all_positions}` | "all positions held" / "the position of director" |
| `{effective_date}` | Parameter input, formatted |
| `{director_N_name}` | Remaining directors (excluding outgoing) |

## Pronoun Mapping

| Prefix | Possessive |
|--------|------------|
| Mr. | his |
| Ms. | her |
| Mrs. | her |
| (other) | their |

## Notes

- The outgoing person does NOT sign their own resignation resolution
- Signature blocks should include only remaining directors
- If outgoing is the only director, resolution needs shareholder approval (edge case)
