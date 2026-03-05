# Appointment Resolution Template

## Document Generation

Use the **Microsoft Word skill** (`/docx` or `document-skills:docx`) to generate appointment resolutions.

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
│  APPOINTMENT OF DIRECTOR AND OFFICER                                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEREAS a vacancy exists on the Board of Directors and in the      │
│  office of Secretary of the Corporation following the resignation   │
│  of {outgoing_name};                                                │
│                                                                     │
│  AND WHEREAS the Board deems it advisable to fill such vacancy;     │
│                                                                     │
│  AND WHEREAS {incoming_prefix} {incoming_name} has consented to     │
│  act as a director and officer of the Corporation;                  │
│                                                                     │
│  NOW THEREFORE BE IT RESOLVED THAT:                                 │
│                                                                     │
│  1.  {incoming_prefix} {incoming_name} be and is hereby appointed   │
│      as a director of the Corporation, effective {effective_date},  │
│      to hold office until the next annual meeting of shareholders   │
│      or until a successor is duly elected or appointed.             │
│                                                                     │
│  2.  {incoming_prefix} {incoming_name} be and is hereby appointed   │
│      as Secretary of the Corporation, effective {effective_date},   │
│      to hold office at the pleasure of the Board.                   │
│                                                                     │
│  3.  The officers of the Corporation be and are hereby authorized   │
│      to update the corporate records to reflect these appointments. │
│                                                                     │
│  The undersigned, being all of the directors of the Corporation,    │
│  hereby consent to the foregoing resolution.                        │
│                                                                     │
│  DATED as of the {effective_date}.                                  │
│                                                                     │
│  _________________________          _________________________       │
│  {director_1_name}                  {director_2_name}               │
│                                                                     │
│  _________________________                                          │
│  {incoming_name}                                                    │
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
| `{outgoing_name}` | `outgoing_person.name` (for context in WHEREAS) |
| `{incoming_prefix}` | `incoming_person.prefix` (Mr., Ms.) |
| `{incoming_name}` | `incoming_person.name` |
| `{effective_date}` | Parameter input, formatted |
| `{director_N_name}` | Current directors + newly appointed |

## Conditional Sections

### If only Director appointment:
- Remove resolution #2 (Secretary appointment)
- Change header to "APPOINTMENT OF DIRECTOR"

### If only Secretary appointment:
- Remove resolution #1 (Director appointment)
- Change header to "APPOINTMENT OF OFFICER"

### If both Director and Secretary:
- Include both resolutions
- Header: "APPOINTMENT OF DIRECTOR AND OFFICER"

## Notes

- The incoming person DOES sign the appointment resolution (as newly appointed director)
- Signature blocks include existing directors + the appointee
- Resolution numbers adjust based on roles being appointed
