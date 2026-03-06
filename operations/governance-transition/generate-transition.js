/**
 * Governance Transition Generator
 *
 * Transitions governance roles (director/secretary) from one person to another
 * across multiple entities. Generates resignation and appointment resolutions.
 *
 * Usage:
 *   node generate-transition.js --outgoing <person-id> --incoming <person-id> [options]
 *
 * Options:
 *   --roles director,secretary    Roles to transition (default: both)
 *   --entities active             Entity filter (default: active only)
 *   --date YYYY-MM-DD             Effective date (default: today)
 *   --apply                       Update entity data after generating documents
 */

const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType } = require('docx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataOps = require('../../lib/data-ops');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MINUTE_BOOKS_DIR = path.join(ROOT_DIR, 'minute-books');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const PENDING_DIR = path.join(__dirname, 'output');

const navyColor = "003459";

// Governing law mapping
const GOVERNING_LAW = {
  'federal': 'Canada Business Corporations Act',
  'QC': 'Business Corporations Act (Quebec)',
  'ON': 'Business Corporations Act (Ontario)',
  'BC': 'Business Corporations Act (British Columbia)',
  'AB': 'Business Corporations Act (Alberta)'
};

// Get pronoun based on prefix
function getPronoun(prefix) {
  const p = (prefix || '').toLowerCase();
  if (p === 'mr.' || p === 'mr') return { possessive: 'his', objective: 'him' };
  if (p === 'ms.' || p === 'ms' || p === 'mrs.' || p === 'mrs') return { possessive: 'her', objective: 'her' };
  return { possessive: 'their', objective: 'them' };
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
  // Parse date parts directly to avoid UTC-midnight timezone shift.
  // new Date('YYYY-MM-DD') parses as UTC, which toLocaleDateString then
  // converts to local time - shifting the date back by one day in negative
  // UTC-offset environments (e.g. UTC-5 renders Feb 1 as Jan 31).
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    display: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    iso: dateStr
  };
}

// Get governing law for entity
function getGoverningLaw(entity) {
  const jurisdiction = entity.jurisdiction_of_formation?.subdivision || 'federal';
  return GOVERNING_LAW[jurisdiction] || GOVERNING_LAW['federal'];
}

// Get active roles for a person in a specific entity
function getRolesInEntity(entity, personId) {
  const roles = { isDirector: false, isOfficer: false, officerTitle: null };

  const directors = entity.governance?.directors || [];
  const officers = entity.governance?.officers || [];

  const director = directors.find(d => d.person_id === personId && d.status === 'active');
  const officer = officers.find(o => o.person_id === personId && o.status === 'active');

  if (director) roles.isDirector = true;
  if (officer) {
    roles.isOfficer = true;
    roles.officerTitle = officer.title;
  }

  return roles;
}

// Get remaining directors (excluding a specific person)
function getRemainingDirectors(entity, excludePersonId) {
  const directors = entity.governance?.directors || [];
  return directors.filter(d => d.person_id !== excludePersonId && d.status === 'active');
}

// Create resignation resolution document
function createResignationResolution(entity, outgoing, roles, effectiveDate) {
  const corpName = entity.legal_name?.en || entity.legal_name?.fr;
  const pronouns = getPronoun(outgoing.prefix);

  // Determine roles text
  let rolesText = '';
  if (roles.isDirector && roles.isOfficer) {
    rolesText = `a director and ${roles.officerTitle}`;
  } else if (roles.isDirector) {
    rolesText = 'a director';
  } else if (roles.isOfficer) {
    rolesText = roles.officerTitle;
  }

  // Get remaining directors for signatures
  const remainingDirectors = getRemainingDirectors(entity, outgoing.id);

  // Build signature rows
  const signatureRows = buildSignatureRows(remainingDirectors);

  return new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1800, right: 1800, bottom: 1800, left: 1800 } }
      },
      children: [
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
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "RESOLUTION OF THE BOARD OF DIRECTORS", bold: true, size: 28, font: "Times New Roman", color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: "ACCEPTANCE OF RESIGNATION", bold: true, size: 24, font: "Times New Roman", underline: {} })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `${outgoing.prefix || ''} ${outgoing.name}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` has served as ${rolesText} of the Corporation;`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "AND WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `${outgoing.prefix || ''} ${outgoing.name}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` has tendered ${pronouns.possessive} resignation from all positions held with the Corporation, effective ${effectiveDate.display};`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: "NOW THEREFORE BE IT RESOLVED THAT:", bold: true, size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "1.\t", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `The resignation of ${outgoing.prefix || ''} ${outgoing.name}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` as ${rolesText} of the Corporation, effective ${effectiveDate.display}, be and is hereby accepted.`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "2.\t", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `The Board extends its sincere appreciation to ${outgoing.prefix || ''} ${outgoing.name}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` for ${pronouns.possessive} valuable service and contributions to the Corporation.`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "3.\t", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: "The officers of the Corporation be and are hereby authorized to update the corporate records to reflect this resignation.", size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: "The undersigned, being all of the directors of the Corporation, hereby consent to the foregoing resolution.", size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "DATED ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `as of the ${effectiveDate.display}.`, size: 24, font: "Times New Roman" })
          ]
        }),
        ...signatureRows
      ]
    }]
  });
}

// Create appointment resolution document
function createAppointmentResolution(entity, outgoing, incoming, roles, effectiveDate, allDirectors) {
  const corpName = entity.legal_name?.en || entity.legal_name?.fr;

  let headerText = '';
  let resolutions = [];

  if (roles.isDirector && roles.isOfficer) {
    headerText = 'APPOINTMENT OF DIRECTOR AND OFFICER';
    resolutions.push({
      num: 1,
      text: `${incoming.prefix || ''} ${incoming.name}`.trim() + ` be and is hereby appointed as a director of the Corporation, effective ${effectiveDate.display}, to hold office until the next annual meeting of shareholders or until a successor is duly elected or appointed.`
    });
    resolutions.push({
      num: 2,
      text: `${incoming.prefix || ''} ${incoming.name}`.trim() + ` be and is hereby appointed as ${roles.officerTitle} of the Corporation, effective ${effectiveDate.display}, to hold office at the pleasure of the Board.`
    });
    resolutions.push({
      num: 3,
      text: `The officers of the Corporation be and are hereby authorized to update the corporate records to reflect these appointments.`
    });
  } else if (roles.isDirector) {
    headerText = 'APPOINTMENT OF DIRECTOR';
    resolutions.push({
      num: 1,
      text: `${incoming.prefix || ''} ${incoming.name}`.trim() + ` be and is hereby appointed as a director of the Corporation, effective ${effectiveDate.display}, to hold office until the next annual meeting of shareholders or until a successor is duly elected or appointed.`
    });
    resolutions.push({
      num: 2,
      text: `The officers of the Corporation be and are hereby authorized to update the corporate records to reflect this appointment.`
    });
  } else if (roles.isOfficer) {
    headerText = 'APPOINTMENT OF OFFICER';
    resolutions.push({
      num: 1,
      text: `${incoming.prefix || ''} ${incoming.name}`.trim() + ` be and is hereby appointed as ${roles.officerTitle} of the Corporation, effective ${effectiveDate.display}, to hold office at the pleasure of the Board.`
    });
    resolutions.push({
      num: 2,
      text: `The officers of the Corporation be and are hereby authorized to update the corporate records to reflect this appointment.`
    });
  }

  const signatories = [...allDirectors];
  if (roles.isDirector && !signatories.some(d => d.person_id === incoming.id)) {
    signatories.push({ person_id: incoming.id, person_name: incoming.name });
  }
  const signatureRows = buildSignatureRows(signatories);

  const resolutionParagraphs = resolutions.map(r => new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 },
    indent: { left: 720 },
    children: [
      new TextRun({ text: `${r.num}.\t`, bold: true, size: 24, font: "Times New Roman" }),
      new TextRun({ text: r.text, size: 24, font: "Times New Roman" })
    ]
  }));

  return new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1800, right: 1800, bottom: 1800, left: 1800 } }
      },
      children: [
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
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "RESOLUTION OF THE BOARD OF DIRECTORS", bold: true, size: 28, font: "Times New Roman", color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: headerText, bold: true, size: 24, font: "Times New Roman", underline: {} })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "─".repeat(60), size: 20, color: "CCCCCC" })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `a vacancy exists ${roles.isDirector ? 'on the Board of Directors' : ''}${roles.isDirector && roles.isOfficer ? ' and ' : ''}${roles.isOfficer ? `in the office of ${roles.officerTitle}` : ''} of the Corporation following the resignation of ${outgoing.name};`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "AND WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: "the Board deems it advisable to fill such vacancy;", size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "AND WHEREAS ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `${incoming.prefix || ''} ${incoming.name}`.trim(), size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` has consented to act as ${roles.isDirector && roles.isOfficer ? 'a director and officer' : roles.isDirector ? 'a director' : 'an officer'} of the Corporation;`, size: 24, font: "Times New Roman" })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: "NOW THEREFORE BE IT RESOLVED THAT:", bold: true, size: 24, font: "Times New Roman" })]
        }),
        ...resolutionParagraphs,
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 200, after: 300 },
          children: [new TextRun({ text: "The undersigned, being all of the directors of the Corporation, hereby consent to the foregoing resolution.", size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "DATED ", bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: `as of the ${effectiveDate.display}.`, size: 24, font: "Times New Roman" })
          ]
        }),
        ...signatureRows
      ]
    }]
  });
}

// Build signature rows from directors list
function buildSignatureRows(directors) {
  const rows = [];
  for (let i = 0; i < directors.length; i += 2) {
    const dir1 = directors[i];
    const dir2 = directors[i + 1];

    rows.push(new Paragraph({
      spacing: { before: 400, after: 80 },
      tabStops: [
        { type: TabStopType.LEFT, position: 720 },
        { type: TabStopType.LEFT, position: 5400 }
      ],
      children: [
        new TextRun({ text: "\t_________________________", size: 22, font: "Times New Roman" }),
        dir2 ? new TextRun({ text: "\t_________________________", size: 22, font: "Times New Roman" }) : new TextRun("")
      ]
    }));

    rows.push(new Paragraph({
      spacing: { after: 200 },
      tabStops: [
        { type: TabStopType.LEFT, position: 720 },
        { type: TabStopType.LEFT, position: 5400 }
      ],
      children: [
        new TextRun({ text: `\t${dir1.person_name}`, size: 22, font: "Times New Roman" }),
        dir2 ? new TextRun({ text: `\t${dir2.person_name}`, size: 22, font: "Times New Roman" }) : new TextRun("")
      ]
    }));
  }
  return rows;
}

// Update entity data with resignation and appointment
function updateEntityData(entityId, entity, outgoing, incoming, roles, effectiveDate) {
  if (roles.isDirector) {
    const directors = entity.governance?.directors || [];
    const outgoingDir = directors.find(d => d.person_id === outgoing.id && d.status === 'active');
    if (outgoingDir) {
      outgoingDir.status = 'resigned';
      outgoingDir.resignation_date = effectiveDate.iso;
    }
    directors.push({
      person_id: incoming.id,
      person_name: incoming.name,
      appointed_date: effectiveDate.iso,
      status: 'active'
    });
    if (!entity.governance) entity.governance = {};
    entity.governance.directors = directors;
  }

  if (roles.isOfficer) {
    const officers = entity.governance?.officers || [];
    const outgoingOff = officers.find(o => o.person_id === outgoing.id && o.status === 'active');
    if (outgoingOff) {
      outgoingOff.status = 'resigned';
      outgoingOff.resignation_date = effectiveDate.iso;
    }
    officers.push({
      person_id: incoming.id,
      person_name: incoming.name,
      title: roles.officerTitle,
      appointed_date: effectiveDate.iso,
      status: 'active'
    });
    entity.governance.officers = officers;
  }

  const corpName = entity.legal_name?.en || entity.legal_name?.fr;
  return dataOps.saveEntity(entityId, entity, {
    operation: 'governance-transition',
    description: `Transitioned ${outgoing.name} → ${incoming.name} in ${corpName}`,
    changes: {
      type: 'transition',
      outgoing: { person_id: outgoing.id, roles },
      incoming: { person_id: incoming.id, roles },
      effective_date: effectiveDate.iso
    }
  });
}

// Generate person ID from name
function generatePersonId(name) {
  return 'per-' + name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Create a new person file
function createPerson(name, prefix) {
  const id = generatePersonId(name);
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const person = {
    id,
    name,
    prefix: prefix || 'Ms.',
    first_name: firstName,
    last_name: lastName,
    _derived: {
      _note: 'This section is derived from entity files. Do not edit manually. Run rebuild_persons.py to regenerate.',
      directorships: [],
      officerships: [],
      shareholdings: [],
      summary: { director_of: 0, officer_of: 0, shareholder_of: 0 }
    }
  };

  const personPath = path.join(DATA_DIR, 'persons', `${id}.json`);
  fs.writeFileSync(personPath, JSON.stringify(person, null, 2));

  const groupPath = path.join(DATA_DIR, 'group.json');
  const group = JSON.parse(fs.readFileSync(groupPath, 'utf8'));
  if (!group.persons.some(p => p.id === id)) {
    group.persons.push({ id, name });
    group.persons.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(groupPath, JSON.stringify(group, null, 2));
  }

  console.log(`  ✓ Created new person: ${name} (${id})`);
  return person;
}

// Parse CLI arguments
function parseArgs(args) {
  const result = {
    outgoing: null,
    incoming: null,
    incomingName: null,
    incomingPrefix: null,
    roles: 'director,secretary',
    entities: 'active',
    date: null,
    apply: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outgoing' && args[i + 1]) {
      result.outgoing = args[i + 1]; i++;
    } else if (args[i] === '--incoming' && args[i + 1]) {
      result.incoming = args[i + 1]; i++;
    } else if (args[i] === '--incoming-name' && args[i + 1]) {
      result.incomingName = args[i + 1]; i++;
    } else if (args[i] === '--incoming-prefix' && args[i + 1]) {
      result.incomingPrefix = args[i + 1]; i++;
    } else if (args[i] === '--roles' && args[i + 1]) {
      result.roles = args[i + 1]; i++;
    } else if (args[i] === '--entities' && args[i + 1]) {
      result.entities = args[i + 1]; i++;
    } else if (args[i] === '--date' && args[i + 1]) {
      result.date = args[i + 1]; i++;
    } else if (args[i] === '--apply') {
      result.apply = true;
    }
  }

  return result;
}

// Safely load person (returns null if not found)
function tryLoadPerson(personId) {
  try {
    return dataOps.loadPerson(personId);
  } catch (err) {
    return null;
  }
}

// Main generation function
async function generateTransition(params) {
  const outgoing = dataOps.loadPerson(params.outgoing);

  let incoming;
  if (params.incoming) {
    incoming = tryLoadPerson(params.incoming);
    if (!incoming && params.incomingName) {
      incoming = createPerson(params.incomingName, params.incomingPrefix);
    } else if (!incoming) {
      throw new Error(`Incoming person not found: ${params.incoming}. Use --incoming-name to create.`);
    }
  } else if (params.incomingName) {
    const id = generatePersonId(params.incomingName);
    incoming = tryLoadPerson(id);
    if (!incoming) {
      incoming = createPerson(params.incomingName, params.incomingPrefix);
    }
  } else {
    throw new Error('Either --incoming <id> or --incoming-name <name> is required');
  }

  const effectiveDate = formatDate(params.date);

  console.log(`\nGovernance Transition: ${outgoing.name} → ${incoming.name}`);
  console.log(`Effective Date: ${effectiveDate.display}`);
  console.log('='.repeat(70));

  const outgoingDerived = outgoing._derived || {};
  let directorships = (outgoingDerived.directorships || []).filter(d => d.status === 'active');
  let officerships = (outgoingDerived.officerships || []).filter(o => o.status === 'active');

  if (params.entities === 'active') {
    directorships = directorships.filter(d => {
      const entity = dataOps.loadEntity(d.entity_id);
      return entity && entity.status === 'active';
    });
    officerships = officerships.filter(o => {
      const entity = dataOps.loadEntity(o.entity_id);
      return entity && entity.status === 'active';
    });
  }

  const entityIds = new Set();
  directorships.forEach(d => entityIds.add(d.entity_id));
  officerships.forEach(o => entityIds.add(o.entity_id));

  console.log(`\nProcessing ${entityIds.size} entities...\n`);

  let docsGenerated = 0;
  let entitiesUpdated = 0;

  for (const entityId of [...entityIds].sort()) {
    const entity = dataOps.loadEntity(entityId);
    if (!entity || entity.entity_type !== 'corporation') continue;

    const corpName = entity.legal_name?.en || entity.legal_name?.fr;
    console.log(`[${entitiesUpdated + 1}/${entityIds.size}] ${corpName}`);

    const roles = getRolesInEntity(entity, outgoing.id);
    if (!roles.isDirector && !roles.isOfficer) {
      console.log(`  ⚠ No active roles found, skipping`);
      continue;
    }

    const isDraft = !params.apply;
    const outputDir = isDraft
      ? path.join(PENDING_DIR, effectiveDate.iso)
      : path.join(MINUTE_BOOKS_DIR, entityId, 'resolutions');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const suffix = isDraft ? '_for-execution' : '';

    const resignDoc = createResignationResolution(entity, outgoing, roles, effectiveDate);
    const resignBuffer = await Packer.toBuffer(resignDoc);
    const resignFilename = `${entityId}_001_resignation_${outgoing.id}_${effectiveDate.iso}${suffix}.docx`;
    fs.writeFileSync(path.join(outputDir, resignFilename), resignBuffer);
    console.log(`  ✓ [001] Resignation: ${resignFilename}`);
    docsGenerated++;

    const remainingDirectors = getRemainingDirectors(entity, outgoing.id);

    const appointDoc = createAppointmentResolution(entity, outgoing, incoming, roles, effectiveDate, remainingDirectors);
    const appointBuffer = await Packer.toBuffer(appointDoc);
    const appointFilename = `${entityId}_002_appointment_${incoming.id}_${effectiveDate.iso}${suffix}.docx`;
    fs.writeFileSync(path.join(outputDir, appointFilename), appointBuffer);
    console.log(`  ✓ [002] Appointment: ${appointFilename}`);
    docsGenerated++;

    if (params.apply) {
      const result = updateEntityData(entityId, entity, outgoing, incoming, roles, effectiveDate);
      console.log(`  ✓ Data updated (backup: ${path.basename(result.backupFile)})`);
    }

    entitiesUpdated++;
    console.log('');
  }

  if (params.apply) {
    console.log('Rebuilding person derived data...');
    const rebuildScript = path.join(SCRIPTS_DIR, 'rebuild_persons.py');
    if (fs.existsSync(rebuildScript)) {
      try {
        execSync(`python "${rebuildScript}"`, { cwd: ROOT_DIR, stdio: 'pipe' });
        console.log('  ✓ Person data rebuilt');
      } catch (err) {
        console.log('  ⚠ Could not rebuild person data (run scripts/rebuild_persons.py manually)');
      }
    }
  }

  console.log('─'.repeat(70));
  console.log('SUMMARY');
  console.log('─'.repeat(70));
  console.log(`Entities processed: ${entitiesUpdated}`);
  console.log(`Documents generated: ${docsGenerated}`);
  if (params.apply) {
    console.log(`Document location: minute-books/{entity}/resolutions/ (final)`);
    console.log(`Data changes: Applied (with backups)`);
  } else {
    console.log(`Document location: operations/governance-transition/output/${effectiveDate.iso}/`);
    console.log(`Document status: DRAFT (for-execution)`);
    console.log(`\nTo execute and finalize, run again with --apply`);
  }
  console.log('');
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Governance Transition Generator

Usage: node generate-transition.js --outgoing <person-id> --incoming-name <name> [options]

Options:
  --outgoing <id>       Person ID of outgoing individual (required)
  --incoming <id>       Person ID of incoming individual (if exists)
  --incoming-name <n>   Full name of incoming person (creates if needed)
  --incoming-prefix <p> Prefix for new person: Mr., Ms., etc. (default: Ms.)
  --roles <roles>       Roles to transition: director,secretary (default: both)
  --entities <filter>   Entity filter: "active" (default), "all"
  --date <YYYY-MM-DD>   Effective date (default: today)
  --apply               Update entity data after generating documents
  --help                Show this help

Examples:
  # With existing person
  node generate-transition.js --outgoing per-thomas-beaumont --incoming per-jennifer-huang --apply

  # Create new person on the fly
  node generate-transition.js --outgoing per-thomas-beaumont --incoming-name "Emily Chen" --incoming-prefix "Ms." --apply
`);
    process.exit(0);
  }

  const params = parseArgs(args);

  if (!params.outgoing) {
    console.error('Error: --outgoing parameter is required');
    process.exit(1);
  }
  if (!params.incoming && !params.incomingName) {
    console.error('Error: --incoming <id> or --incoming-name <name> is required');
    process.exit(1);
  }

  try {
    await generateTransition(params);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
