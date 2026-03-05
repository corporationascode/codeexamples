# Corporation as Code

**Corporation as Code** is a methodology for representing corporate entities as structured, version-controlled data rather than collections of documents.

## Core Concept

Traditional corporate record-keeping treats documents (articles of incorporation, bylaws, resolutions, minute books) as the authoritative source. **Corporation as Code** inverts this:

- **Data is the source of truth**: Corporate state (ownership, governance, registrations) is stored in structured JSON files
- **Documents are generated views**: Legal instruments (share certificates, board resolutions, annual filings) are produced from the underlying data
- **Version control for governance**: Corporate changes are tracked in git with full audit trails
- **Queryable structure**: Answer questions like "who owns what?" by querying data, not parsing PDFs

## Demo Dataset

This repository contains **fictional demonstration data** for "Northern Heritage Foods Inc.," a family-owned Canadian food manufacturing and retail business. All entities and persons are completely synthetic and created for demonstration purposes only.

## Installation

```bash
npm install
```

## Project Structure

```
corporation-as-code/
├── data/
│   ├── group.json                 # Corporate group manifest
│   ├── entities/                  # Entity data files
│   │   ├── ent-northern-heritage-holdings.json
│   │   ├── ent-heritage-foods-canada.json
│   │   └── ... (one file per entity)
│   └── persons/                   # Person data files
│       ├── per-margaret-chen.json
│       ├── per-david-chen.json
│       └── ... (one file per person)
├── operations/                    # Document generation operations
│   ├── director-appointments/
│   ├── share-certificates/
│   └── governance-transition/
├── minute-books/                  # Generated legal documents (gitignored)
└── lib/                           # Shared utilities
```

## Data Model

### Entity Files (`data/entities/*.json`)

Each corporation or partnership has its own JSON file containing:

- Legal name (bilingual for Canadian entities)
- Jurisdiction of formation and governing law
- Registry numbers (corporation number, NEQ, business number)
- Capital structure (share classes or partnership units)
- Ownership (references to holder entities/persons)
- Governance (directors and officers)
- Corporate events history
- Status (active, inactive, dissolved)

### Person Files (`data/persons/*.json`)

Each natural person has a JSON file with:

- Name and prefix
- `_derived` section (auto-generated summary of roles)

**Important:** Entities are the source of truth for relationships (directorships, officerships, shareholdings). Person files contain a `_derived` section summarizing each person's roles across entities.

### Group Manifest (`data/group.json`)

The manifest provides:
- Corporate group metadata
- Index of all entities
- Index of all persons

## Document Generation

Operations generate legal documents from structured data:

### Generate Share Certificates

```bash
node operations/share-certificates/generate-certificates.js ent-artisan-bakery-co
```

Output: Word documents in `minute-books/ent-artisan-bakery-co/share-certificates/`

### Generate Director Appointment Resolution

```bash
node operations/director-appointments/generate-resolution.js ent-northern-heritage-holdings per-sarah-whitfield
```

Output: Word document in `minute-books/ent-northern-heritage-holdings/resolutions/`

### Apply Changes to Data

Add `--apply` flag to update entity data after generating documents:

```bash
node operations/director-appointments/generate-resolution.js ent-northern-heritage-holdings per-sarah-whitfield --apply
```

This will:
1. Generate the resolution document
2. Update the entity JSON with the new director
3. Create a timestamped backup
4. Log the change to the audit trail
5. Rebuild person derived data

## Querying Corporate Data

Example queries using Node.js:

```javascript
const fs = require('fs');
const path = require('path');

// Load entity
function loadEntity(entityId) {
  const filePath = path.join(__dirname, 'data', 'entities', `${entityId}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Load person
function loadPerson(personId) {
  const filePath = path.join(__dirname, 'data', 'persons', `${personId}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Find all entities where a person is a director
function getDirectorships(personId) {
  const person = loadPerson(personId);
  return person._derived.directorships;
}

// Get ownership chain
function getOwners(entityId) {
  const entity = loadEntity(entityId);
  return entity.ownership.map(o => o.holder_name);
}
```

## Workflows

### Modifying Entity Data

1. Edit files in `data/entities/`
2. Run `# Update person _derived sections to reflect entity changes` to update derived data
3. Commit both changes together

### Adding a New Entity

1. Create `data/entities/ent-{slug}.json` following the schema
2. Add entry to `data/group.json` entities index
3. Run `# Update person _derived sections to reflect entity changes`

### Adding a New Person

1. Create `data/persons/per-{slug}.json` with identity fields
2. Add entry to `data/group.json` persons index
3. Reference the person_id in entity governance/ownership
4. Run `# Update person _derived sections to reflect entity changes` to populate derived data

## Version Control & Audit Trail

Changes to corporate data create:
- **Git commits** with meaningful messages
- **Timestamped backups** in `data/_history/`
- **Changelog entries** recording operations

Rollback is trivial:
```bash
git checkout HEAD~1 data/entities/ent-northern-heritage-holdings.json
# Update person _derived sections to reflect entity changes
```

## Design Principles

1. **Data as source of truth** - Documents are renderings, not authoritative records
2. **Normalized persons** - Define once, reference by ID across entities
3. **Entity type polymorphism** - Single schema handles corporations and partnerships
4. **Ownership as graph** - `holder_id` references enable traversal
5. **Event sourcing ready** - Corporate events captured with dates
6. **Jurisdiction-aware** - Multi-jurisdictional Canadian corporate law support

## Paper

For the full methodology and rationale, see: [Corporation as Code](https://corporationascode.github.io/paper/)

## License

MIT

## Disclaimer

This repository contains entirely fictional demonstration data. "Northern Heritage Foods Inc." and all associated entities and persons are completely synthetic and created for demonstration purposes only. No real companies, individuals, or corporate structures are represented.
