# Share Certificate Issuance

## Overview

Generate share certificates for shareholders of corporations in the group. Certificates are official documents evidencing ownership of shares in a corporation.

## Prerequisites

- Entity must be a `corporation` (not a partnership)
- Entity must have `capital_structure.type = "share_capital"`
- Shareholder must exist in `ownership[]` array of the entity

## Usage

```bash
# 1. Validate business rules first
node operations/share-certificates/tests/validate-certificates.js <entity-id>

# 2. Generate certificates for an entity (uses today's date)
node operations/share-certificates/generate-certificates.js <entity-id>

# 3. With page-fit validation test
node operations/share-certificates/generate-certificates.js <entity-id> --test

# With specific issue date
node operations/share-certificates/generate-certificates.js <entity-id> --date 2026-01-15
```

## Tests

Located in `tests/` subdirectory:

| Test | Description |
|------|-------------|
| `validate-certificates.js` | Business rule validation before issuance |

### Validation Rules

The validation test checks:

1. **Entity is corporation** - Only corporations can issue share certificates
2. **Has share capital** - Entity must have share capital structure (not partnership units)
3. **Share classes defined** - At least one share class must exist
4. **Issued vs authorized** - Issued shares must not exceed authorized for each class
5. **Ownership matches issued** - Total holdings must equal issued share count
6. **Valid holder references** - All shareholders must have valid holder_id and holder_type
7. **Certificate quantities** - All holdings must have valid positive quantities
8. **Signatories defined** - Warning if Secretary/President not defined (will use blank lines)

## Data Sources

The operation pulls data from:

```
data/
├── entities/{entity_id}.json
│   ├── legal_name.en / legal_name.fr
│   ├── jurisdiction_of_formation
│   ├── registry_numbers[] (corporation_number)
│   ├── capital_structure.share_classes[]
│   ├── ownership[] (to validate holder)
│   └── governance.officers[] (for signatories)
│
└── persons/{holder_id}.json  (if holder is a person)
    ├── name
    └── prefix
```

## Output

- **Format**: Microsoft Word (.docx)
- **Location**: `minute-books/{entity_id}/share-certificates/`
- **Filename**: `{entity_id}_{class_id}_{certificate_number}.docx`
- **Example**: `minute-books/ent-artisan-bakery-co/share-certificates/ent-artisan-bakery-co_9413-class-a_A-001.docx`

## Example

```bash
# Validate
$ node operations/share-certificates/tests/validate-certificates.js ent-artisan-bakery-co

Validating share certificate issuance for: ent-artisan-bakery-co
============================================================
  ✓ Entity is corporation: Entity is a corporation
  ✓ Has share capital: Entity has share capital structure
  ✓ Share classes defined: 1 share class(es) defined
  ✓ Issued vs authorized (Class A): 14,898 issued (unlimited authorized)
  ✓ Ownership matches issued (Class A): Holdings (14,898) match issued shares
  ✓ Valid holder references: 7 holder(s) with valid references
  ✓ Certificate quantities: 7 certificate(s) with valid quantities
  ✓ Signatories defined: Secretary and President defined for signing
============================================================

Results: 8 passed, 0 failed, 0 warnings

VALIDATION PASSED - Safe to issue certificates.

# Generate
$ node operations/share-certificates/generate-certificates.js ent-artisan-bakery-co --test
```

## See Also

- [TEMPLATE.md](./TEMPLATE.md) - Visual format and Word generation instructions
- [tests/](./tests/) - Validation tests
