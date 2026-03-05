# Share Certificate Template

## Document Generation

Use the **Microsoft Word skill** (`/docx` or `document-skills:docx`) to generate share certificates.

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║                                                               ║  │
│  ║                    SHARE CERTIFICATE                          ║  │
│  ║                    Certificate No. {certificate_number}       ║  │
│  ║                                                               ║  │
│  ║  ─────────────────────────────────────────────────────────    ║  │
│  ║                                                               ║  │
│  ║                  {corporation_legal_name}                     ║  │
│  ║        Incorporated under the laws of {jurisdiction}          ║  │
│  ║              Corporation No. {corporation_number}             ║  │
│  ║                                                               ║  │
│  ║  ─────────────────────────────────────────────────────────    ║  │
│  ║                                                               ║  │
│  ║  This is to certify that                                      ║  │
│  ║                                                               ║  │
│  ║                     {shareholder_name}                        ║  │
│  ║                                                               ║  │
│  ║  is the registered holder of                                  ║  │
│  ║                                                               ║  │
│  ║              {quantity_in_words} ({quantity})                 ║  │
│  ║                                                               ║  │
│  ║               {share_class_name} SHARES                       ║  │
│  ║                                                               ║  │
│  ║  of the above-named corporation, transferable only on the     ║  │
│  ║  books of the corporation by the holder hereof in person      ║  │
│  ║  or by duly authorized attorney upon surrender of this        ║  │
│  ║  certificate properly endorsed.                               ║  │
│  ║                                                               ║  │
│  ║  IN WITNESS WHEREOF, the corporation has caused this          ║  │
│  ║  certificate to be signed by its duly authorized officers.    ║  │
│  ║                                                               ║  │
│  ║  Dated: {issue_date}                                          ║  │
│  ║                                                               ║  │
│  ║                                                               ║  │
│  ║  _________________________    _________________________       ║  │
│  ║  {signatory_1_name}           {signatory_2_name}              ║  │
│  ║  {signatory_1_title}          {signatory_2_title}             ║  │
│  ║                                                               ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────────┘
```

## Styling Specifications

### Page Setup
- **Size**: Letter (8.5" x 11") or A4
- **Orientation**: Landscape
- **Margins**: 1 inch all sides

### Border
- **Style**: Double-line decorative border
- **Color**: Dark navy (#003459) or gold (#B8860B)
- **Width**: 3pt outer, 1pt inner, 6pt spacing

### Typography

| Element | Font | Size | Style | Color |
|---------|------|------|-------|-------|
| "SHARE CERTIFICATE" | Times New Roman | 24pt | Bold, Small Caps | #003459 |
| Certificate Number | Times New Roman | 14pt | Bold | #000000 |
| Corporation Name | Times New Roman | 18pt | Bold | #003459 |
| Jurisdiction/Corp No. | Times New Roman | 11pt | Regular | #333333 |
| Body Text | Times New Roman | 12pt | Regular | #000000 |
| Shareholder Name | Times New Roman | 16pt | Bold | #000000 |
| Share Quantity | Times New Roman | 14pt | Bold | #000000 |
| Share Class | Times New Roman | 14pt | Bold, Caps | #003459 |
| Signature Lines | Times New Roman | 11pt | Regular | #000000 |

### Alignment
- Title block: Center aligned
- Body text: Justified
- Signature block: Two columns, centered within each

## Field Mappings

| Template Field | Data Source |
|----------------|-------------|
| `{certificate_number}` | Parameter input |
| `{corporation_legal_name}` | `entity.legal_name.en` |
| `{jurisdiction}` | `entity.jurisdiction_of_formation.subdivision` mapped to full name |
| `{corporation_number}` | `entity.registry_numbers[type="corporation_number"].number` |
| `{shareholder_name}` | `holder.name` (person) or `holder.legal_name.en` (entity) |
| `{quantity}` | Parameter input, formatted with commas |
| `{quantity_in_words}` | Parameter input, converted to words |
| `{share_class_name}` | `entity.capital_structure.share_classes[class_id].name` |
| `{issue_date}` | Parameter input, formatted as "January 15, 2025" |
| `{signatory_1_name}` | From `entity.governance.officers` or parameter |
| `{signatory_1_title}` | Officer title (e.g., "Secretary") |
| `{signatory_2_name}` | From `entity.governance.officers` or parameter |
| `{signatory_2_title}` | Officer title (e.g., "President") |

## Jurisdiction Mapping

| Code | Full Name |
|------|-----------|
| `federal` | Canada (Federal) |
| `QC` | Province of Quebec |
| `ON` | Province of Ontario |
| `BC` | Province of British Columbia |
| `AB` | Province of Alberta |

## Number to Words

For `{quantity_in_words}`, convert the number:
- 17,357,878 → "Seventeen Million Three Hundred Fifty-Seven Thousand Eight Hundred Seventy-Eight"
- 100 → "One Hundred"
- 2,404,913 → "Two Million Four Hundred Four Thousand Nine Hundred Thirteen"

## Word Generation Instructions

When using the docx skill, provide these instructions:

```
Create a share certificate document with:

1. Page setup: Landscape, Letter size, 1" margins
2. Add a decorative double-line border around the page in navy blue
3. Center all content vertically and horizontally

Content to include:
- Header: "SHARE CERTIFICATE" in 24pt Times New Roman Bold
- Certificate number below header
- Horizontal decorative line
- Corporation name in 18pt bold
- Incorporation jurisdiction and corporation number
- Another horizontal line
- Certificate body text (see template above)
- Shareholder name prominently displayed
- Share quantity in words and numbers
- Share class name
- Standard transfer restriction language
- Issue date
- Two signature blocks side by side

Use the Langlois color scheme:
- Primary navy: #003459
- Accent text where appropriate
```

## Sample Output Filename

```
ent-heritage-foods-canada_gcsc-class-a_A-001.docx
```
