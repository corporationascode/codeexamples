/**
 * Director Appointment Resolution Generator
 *
 * Usage: node generate-resolution.js <entity-id> <person-id> [options]
 *
 * Generates a board resolution for appointing a new director.
 * Optionally updates the entity data to reflect the appointment.
 *
 * Options:
 *   --date YYYY-MM-DD   Effective date (default: today)
 *   --apply             Update entity JSON after generating resolution
 */

const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType } = require('docx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use shared data-ops module for safe data operations with backup/changelog
const dataOps = require('../../lib/data-ops');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MINUTE_BOOKS_DIR = path.join(ROOT_DIR, 'minute-books');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

const navyColor = "003459";

// Governing law mapping
const GOVERNING_LAW = {
  'federal': 'Canada Business Corporations Act',
  'QC': 'Business Corporations Act (Quebec)',
  'ON': 'Business Corporations Act (Ontario)',
  'BC': 'Business Corporations Act (British Columbia)',
  'AB': 'Business Corporations Act (Alberta)',
  'SK': 'Business Corporations Act (Saskatchewan)',
  'MB': 'The Corporations Act (Manitoba)',
  'NS': 'Companies Act (Nova Scotia)',
  'NB': 'Business Corporations Act (New Brunswick)'
};

// Load entity data (delegate to data-ops)
function loadEntity(entityId) {
  return dataOps.loadEntity(entityId);
}

// Load person data (delegate to data-ops)
function loadPerson(personId) {
  return dataOps.loadPerson(personId);
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return {
      display: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      iso: now.toISOString().split('T')[0]
    };
  }
  const date = new Date(dateStr);
  return {
    display: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    iso: dateStr
  };
}

// Get governing law text
function getGoverningLaw(entity) {
  const jurisdiction = entity.jurisdiction_of_formation?.subdivision || 'federal';
  return GOVERNING_LAW[jurisdiction] || GOVERNING_LAW['federal'];
}

// Create the resolution document
function createResolution(entity, person, existingDirectors, effectiveDate) {
  const corpName = entity.legal_name?.en || entity.legal_name?.fr;
  const appointeeName = person.name;
  const appointeePrefix = person.prefix || '';
  const governingLaw = getGoverningLaw(entity);

  // Build signature rows (2 directors per row)
  const signatureRows = [];
  for (let i = 0; i < existingDirectors.length; i += 2) {
    const dir1 = existingDirectors[i];
    const dir2 = existingDirectors[i + 1];

    // Signature lines
    signatureRows.push(
      new Paragraph({
        spacing: { before: 400, after: 80 },
        tabStops: [
          { type: TabStopType.LEFT, position: 720 },
          { type: TabStopType.LEFT, position: 5400 }
        ],
        children: [
          new TextRun({ text: "\t_________________________", size: 22, font: "Times New Roman" }),
          dir2 ? new TextRun({ text: "\t_________________________", size: 22, font: "Times New Roman" }) : new TextRun("")
        ]
      })
    );

    // Names under lines
    signatureRows.push(
      new Paragraph({
        spacing: { after: 200 },
        tabStops: [
          { type: TabStopType.LEFT, position: 720 },
          { type: TabStopType.LEFT, position: 5400 }
        ],
        children: [
          new TextRun({ text: `\t${dir1.person_name}`, size: 22, font: "Times New Roman" }),
          dir2 ? new TextRun({ text: `\t${dir2.person_name}`, size: 22, font: "Times New Roman" }) : new TextRun("")
        ]
      })
    );
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1800, right: 1800, bottom: 1800, left: 1800 } // 1.25 inch
        }
      },
      children: [
        // Corporation name header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: corpName, bold: true, size: 32, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: '(the "Corporation")', italics: true, size: 22, font: "Times New Roman", color: "333333" })]
        }),

        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "RESOLUTION OF THE BOARD OF DIRECTORS", bold: true, size: 28, font: "Times New Roman", color: navyColor })]
        }),

        // Horizontal line
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),

        // Section header
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: "APPOINTMENT OF DIRECTOR", bold: true, size: 24, font: "Times New Roman", underline: {} })]
        }),

        // Horizontal line
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),

        // WHEREAS clause 1
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: 'the board of directors of the Corporation (the "Board") deems it advisable to appoint an additional director;', size: 24, font: "Times New Roman" })
          ]
        }),

        // WHEREAS clause 2
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "AND WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `${appointeePrefix} ${appointeeName}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: " has consented to act as a director of the Corporation;", size: 24, font: "Times New Roman" })
          ]
        }),

        // NOW THEREFORE
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: "NOW THEREFORE BE IT RESOLVED THAT:", bold: true, size: 24, font: "Times New Roman" })]
        }),

        // Resolution 1
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "1.\t", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `${appointeePrefix} ${appointeeName}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` be and is hereby appointed as a director of the Corporation, effective ${effectiveDate.display}, to hold office until the next annual meeting of shareholders or until a successor is duly elected or appointed.`, size: 24, font: "Times New Roman" })
          ]
        }),

        // Resolution 2
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "2.\t", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: "The officers of the Corporation be and are hereby authorized and directed to do all such acts and things and to execute all such documents as may be necessary or desirable to give effect to this resolution.", size: 24, font: "Times New Roman" })
          ]
        }),

        // Consent paragraph
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: `The undersigned, being all of the directors of the Corporation, hereby consent to the foregoing resolution pursuant to the ${governingLaw} and the by-laws of the Corporation.`, size: 24, font: "Times New Roman" })]
        }),

        // Dated
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "DATED ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `as of the ${effectiveDate.display}.`, size: 24, font: "Times New Roman" })
          ]
        }),

        // Signature blocks
        ...signatureRows
      ]
    }]
  });
}

// Update entity with new director (with backup and changelog)
function applyAppointment(entityId, entity, person, effectiveDate) {
  // Initialize governance if needed
  if (!entity.governance) {
    entity.governance = {};
  }
  if (!entity.governance.directors) {
    entity.governance.directors = [];
  }

  // Prepare the new director entry
  const newDirector = {
    person_id: person.id,
    person_name: person.name,
    appointed_date: effectiveDate.iso,
    status: 'active'
  };

  // Add new director
  entity.governance.directors.push(newDirector);

  // Save entity using data-ops (creates backup + changelog entry)
  const corpName = entity.legal_name?.en || entity.legal_name?.fr;
  const result = dataOps.saveEntity(entityId, entity, {
    operation: 'director-appointment',
    description: `Appointed ${person.name} as director of ${corpName}`,
    changes: {
      type: 'add',
      path: 'governance.directors',
      value: newDirector
    }
  });

  console.log(`Updated entity: ${entityId}`);
  console.log(`  Backup created: ${result.backupFile}`);

  // Rebuild person derived data
  const rebuildScript = path.join(SCRIPTS_DIR, 'rebuild_persons.py');
  if (fs.existsSync(rebuildScript)) {
    try {
      execSync(`python "${rebuildScript}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
      console.log('Rebuilt person derived data');
    } catch (err) {
      console.log('Warning: Could not rebuild person data (run scripts/rebuild_persons.py manually)');
    }
  }

  return result;
}

// Main generation function
async function generateResolution(entityId, personId, effectiveDate, applyChanges) {
  // Load data
  const entity = loadEntity(entityId);
  const person = loadPerson(personId);

  // Validate
  if (entity.entity_type !== 'corporation') {
    throw new Error(`Entity ${entityId} is not a corporation`);
  }

  const directors = entity.governance?.directors || [];
  const activeDirectors = directors.filter(d => d.status === 'active');

  if (activeDirectors.length === 0) {
    throw new Error('Entity has no active directors for quorum');
  }

  const alreadyDirector = directors.find(d => d.person_id === personId && d.status === 'active');
  if (alreadyDirector) {
    throw new Error(`${person.name} is already an active director`);
  }

  // Create output directory
  const outputDir = path.join(MINUTE_BOOKS_DIR, entityId, 'resolutions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate document
  const doc = createResolution(entity, person, activeDirectors, effectiveDate);
  const buffer = await Packer.toBuffer(doc);

  // Save document
  const filename = `${entityId}_director-appointment_${personId}_${effectiveDate.iso}.docx`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, buffer);

  console.log(`\nGenerated: ${filePath}`);

  // Apply changes if requested
  if (applyChanges) {
    console.log('\nApplying changes to entity data...');
    applyAppointment(entityId, entity, person, effectiveDate);
  }

  return { filePath, filename };
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help')) {
    console.log(`
Director Appointment Resolution Generator

Usage: node generate-resolution.js <entity-id> <person-id> [options]

Options:
  --date YYYY-MM-DD   Effective date (default: today)
  --apply             Update entity JSON after generating resolution
  --help              Show this help

Example:
  node generate-resolution.js ent-artisan-bakery-co per-rachel-anderson
  node generate-resolution.js ent-artisan-bakery-co per-rachel-anderson --apply
  node generate-resolution.js ent-artisan-bakery-co per-rachel-anderson --date 2026-02-01
`);
    process.exit(0);
  }

  const entityId = args[0];
  const personId = args[1];
  const applyChanges = args.includes('--apply');

  const dateIdx = args.indexOf('--date');
  const effectiveDate = dateIdx >= 0 && args[dateIdx + 1]
    ? formatDate(args[dateIdx + 1])
    : formatDate();

  try {
    await generateResolution(entityId, personId, effectiveDate, applyChanges);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
