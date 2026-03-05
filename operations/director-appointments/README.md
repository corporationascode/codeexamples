# Director Appointment Resolution

## Overview

Generate board resolutions for appointing new directors to corporations in the group. This operation:
1. Validates the appointment is permissible
2. Generates a formal board resolution document
3. Optionally updates the entity data to reflect the new director

## Prerequisites

- Entity must be a `corporation` (not a partnership)
- Person must exist in `data/persons/`
- Person must not already be an active director of the entity
- Entity must have at least one existing director (for quorum)

## Usage

```bash
# 1. Validate the appointment first
node operations/director-appointments/tests/validate-appointment.js <entity-id> <person-id>

# 2. Generate the resolution document only
node operations/director-appointments/generate-resolution.js <entity-id> <person-id>

# 3. Generate AND update entity data
node operations/director-appointments/generate-resolution.js <entity-id> <person-id> --apply

# With specific effective date
node operations/director-appointments/generate-resolution.js <entity-id> <person-id> --date 2026-01-15
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_id` | string | Yes | ID of the corporation (e.g., `ent-artisan-bakery-co`) |
| `person_id` | string | Yes | ID of the person being appointed (e.g., `per-john-smith`) |
| `--date` | string | No | Effective date (YYYY-MM-DD, default: today) |
| `--apply` | flag | No | If set, updates entity JSON after generating resolution |

## Tests

Located in `tests/` subdirectory:

| Test | Description |
|------|-------------|
| `validate-appointment.js` | Business rule validation before appointment |

### Validation Rules

The validation test checks:

1. **Entity exists** - Entity file must exist in data/entities/
2. **Entity is corporation** - Only corporations have directors
3. **Person exists** - Person file must exist in data/persons/
4. **Not already director** - Person must not be an active director
5. **Has existing directors** - At least one director must exist for quorum
6. **Entity is active** - Cannot appoint directors to dissolved entities

## Data Sources

```
data/
├── entities/{entity_id}.json
│   ├── legal_name.en / legal_name.fr
│   ├── jurisdiction_of_formation
│   ├── governance.directors[] (existing directors for quorum)
│   └── status
│
└── persons/{person_id}.json
    ├── name
    ├── prefix
    ├── first_name
    └── last_name
```

## Output

- **Format**: Microsoft Word (.docx)
- **Location**: `minute-books/{entity_id}/resolutions/`
- **Filename**: `{entity_id}_director-appointment_{person-id}_{date}.docx`

## Data Update (--apply flag)

When `--apply` is used, the operation also:

1. Adds the new director to `entity.governance.directors[]`:
   ```json
   {
     "person_id": "per-john-smith",
     "person_name": "John Smith",
     "appointed_date": "2026-01-12",
     "status": "active"
   }
   ```

2. Runs `scripts/rebuild_persons.py` to update derived data in person files

## Example

```bash
# Validate
$ node operations/director-appointments/tests/validate-appointment.js ent-artisan-bakery-co per-rachel-anderson

Validating director appointment:
  Entity: ent-artisan-bakery-co
  Person: per-rachel-anderson
============================================================
  ✓ Entity exists: Artisan Bakery Co.
  ✓ Entity is corporation: corporation
  ✓ Entity is active: active
  ✓ Person exists: Rachel Anderson
  ✓ Has existing directors: 3 current director(s)
  ✓ Not already director: Person is not currently a director
============================================================

VALIDATION PASSED - Appointment is permissible.

# Generate resolution
$ node operations/director-appointments/generate-resolution.js ent-artisan-bakery-co per-rachel-anderson

Generated: minute-books/ent-artisan-bakery-co/resolutions/ent-artisan-bakery-co_director-appointment_per-rachel-anderson_2026-01-12.docx
```

## See Also

- [TEMPLATE.md](./TEMPLATE.md) - Resolution format and Word generation instructions
- [tests/](./tests/) - Validation tests
- [officer-appointments/](../officer-appointments/) - Similar operation for officers (future)
