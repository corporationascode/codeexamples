# Governance Transition

## Overview

Manages the transition of governance roles (directors and/or officers) from one person to another across multiple entities. This operation:

1. Validates the transition is permissible
2. Marks the outgoing person's roles as "resigned"
3. Adds the incoming person with "active" status
4. Generates resignation and appointment resolution documents
5. Uses backup/changelog for full audit trail

## Prerequisites

- Outgoing person must exist in `data/persons/`
- Outgoing person must have active roles in target entities
- Incoming person must exist in `data/persons/` OR use `--incoming-name` to create on the fly
- Incoming person must not already hold the same roles
- Target entities must be active corporations

## Usage

```bash
# 1. Validate the transition first
node operations/governance-transition/tests/validate-transition.js \
  --outgoing per-thomas-beaumont \
  --incoming per-jennifer-huang

# 2. Generate documents only (no data changes)
node operations/governance-transition/generate-transition.js \
  --outgoing per-thomas-beaumont \
  --incoming per-jennifer-huang

# 3. Generate AND apply changes to entity data
node operations/governance-transition/generate-transition.js \
  --outgoing per-thomas-beaumont \
  --incoming per-jennifer-huang \
  --apply

# With new person (creates person file on the fly)
node operations/governance-transition/generate-transition.js \
  --outgoing per-thomas-beaumont \
  --incoming-name "Emily Chen" \
  --incoming-prefix "Ms." \
  --apply

# With specific date
node operations/governance-transition/generate-transition.js \
  --outgoing per-thomas-beaumont \
  --incoming per-jennifer-huang \
  --date 2026-02-01 \
  --apply
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--outgoing` | string | Yes | Person ID of outgoing individual (e.g., `per-thomas-beaumont`) |
| `--incoming` | string | Either | Person ID of incoming individual (e.g., `per-jennifer-huang`) |
| `--incoming-name` | string | Either | Full name of incoming person - creates person file if needed |
| `--incoming-prefix` | string | No | Prefix for incoming person (e.g., `Ms.`, `Mr.`) - used with `--incoming-name` |
| `--roles` | string | No | Comma-separated roles to transition: `director`, `secretary`, or `director,secretary` (default: both) |
| `--entities` | string | No | Filter: `active` (default), `all`, or comma-separated entity IDs |
| `--date` | string | No | Effective date (YYYY-MM-DD, default: today) |
| `--apply` | flag | No | If set, updates entity JSON after generating documents |

**Note:** Either `--incoming` or `--incoming-name` is required. Use `--incoming-name` to create a new person on the fly.

## Tests

Located in `tests/` subdirectory:

| Test | Description |
|------|-------------|
| `validate-transition.js` | Business rule validation before transition |

### Validation Rules

1. **Outgoing person exists** - Must have a person file
2. **Incoming person exists** - Must have a person file (or will be created via `--incoming-name`)
3. **Outgoing has active roles** - Must have director/officer positions to transition
4. **Incoming role conflicts** *(warning)* - Entities where incoming already holds a role are reported but not blocking; those entities are skipped
5. **Target entities are active** - Inactive entities are filtered out automatically by `getActiveRoles`; not a blocking check
6. **Entities are corporations** *(warning)* - Non-corporation entities are reported and skipped; does not block the transition

## Data Changes (--apply flag)

When `--apply` is used:

1. **For each entity**, the outgoing person's records are updated:
   ```json
   {
     "person_id": "per-thomas-beaumont",
     "person_name": "Thomas Beaumont",
     "status": "resigned",
     "resignation_date": "2026-01-12"
   }
   ```

2. **The incoming person is added**:
   ```json
   {
     "person_id": "per-emily-chen",
     "person_name": "Emily Chen",
     "appointed_date": "2026-01-12",
     "status": "active"
   }
   ```

3. **Backups created** for each modified entity via `data-ops`
4. **Changelog entries** recorded for audit trail
5. **Person derived data rebuilt** via `scripts/rebuild_persons.py`

## Output

- **Format**: Microsoft Word (.docx)
- **Draft location**: `operations/governance-transition/output/{date}/`
- **Final location**: `minute-books/{entity_id}/resolutions/`

### Document Workflow

| Stage | Location | Filename suffix | Data updated |
|-------|----------|-----------------|--------------|
| Generate (no `--apply`) | `output/{date}/` | `_for-execution` | No |
| Execute (`--apply`) | `minute-books/{entity}/resolutions/` | (none) | Yes |

**Draft files** (for-execution):
- `{entity_id}_001_resignation_{outgoing_id}_{date}_for-execution.docx`
- `{entity_id}_002_appointment_{incoming_id}_{date}_for-execution.docx`

**Final files** (after --apply):
- `{entity_id}_001_resignation_{outgoing_id}_{date}.docx`
- `{entity_id}_002_appointment_{incoming_id}_{date}.docx`

### Document Sequencing

The sequence numbers (`001`, `002`) ensure:
1. **Legal ordering**: Resignation must be effective before appointment
2. **File sorting**: Documents sort correctly in file explorers
3. **Audit clarity**: Obvious which document comes first when reviewing

## Example

```bash
# Transition Thomas Beaumont → Emily Chen
$ node operations/governance-transition/generate-transition.js \
    --outgoing per-thomas-beaumont \
    --incoming per-jennifer-huang \
    --apply

Processing 17 active entities...

[1/17] ent-artisan-bakery-co
  ✓ [001] Resignation resolution generated
  ✓ [002] Appointment resolution generated
  ✓ Entity data updated (backup: 2026-01-12T10-30-00Z_entities_...)

[2/17] ent-heritage-foods-canada
  ...

Summary:
  Entities processed: 17
  Resignations: 17 director, 17 secretary
  Appointments: 17 director, 17 secretary
  Documents generated: 34
  Backups created: 17
```

## Rollback

To undo a governance transition:

```bash
# Preview what will be rolled back
node lib/history-cli.js rollback-operation governance-transition

# Execute rollback (restores entities, deletes documents, removes incoming person if no other roles)
node lib/history-cli.js rollback-operation governance-transition --force
# rebuild person derived data
# rebuild viewer
```

The rollback command:
1. Restores all 17 entity files to their pre-transition state
2. Deletes resignation and appointment documents from `minute-books/`
3. Deletes the incoming person file if they have no remaining roles
4. Updates `group.json` accordingly

## See Also

- [DEMO.md](./DEMO.md) - Step-by-step demo with copy-paste commands
- [TEMPLATE-resignation.md](./TEMPLATE-resignation.md) - Resignation resolution format
- [TEMPLATE-appointment.md](./TEMPLATE-appointment.md) - Appointment resolution format
- [tests/](./tests/) - Validation tests
- [director-appointments/](../director-appointments/) - Single appointment operation
