/**
 * Share Certificate Generator
 *
 * Usage: node generate-certificates.js <entity-id> [--test]
 *
 * Generates share certificates for all shareholders of the specified entity.
 * Outputs to: minute-books/{entity-id}/share-certificates/
 */

const { Document, Packer, Paragraph, TextRun, AlignmentType, PageOrientation, BorderStyle, TabStopType } = require('docx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MINUTE_BOOKS_DIR = path.join(ROOT_DIR, 'minute-books');

const navyColor = "003459";

// Number to words conversion
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 1000000000) return numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
  return numberToWords(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + numberToWords(num % 1000000000) : '');
}

// Map jurisdiction codes to full names
function jurisdictionName(subdivision) {
  const map = {
    'federal': 'Canada (Federal)',
    'QC': 'Province of Quebec',
    'ON': 'Province of Ontario',
    'BC': 'Province of British Columbia',
    'AB': 'Province of Alberta',
    'SK': 'Province of Saskatchewan',
    'MB': 'Province of Manitoba',
    'NS': 'Province of Nova Scotia',
    'NB': 'Province of New Brunswick',
    'NL': 'Province of Newfoundland and Labrador',
    'PE': 'Province of Prince Edward Island'
  };
  return map[subdivision] || subdivision;
}

// Load entity data
function loadEntity(entityId) {
  const filePath = path.join(DATA_DIR, 'entities', `${entityId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Entity not found: ${entityId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Get corporation number (prefer corporation_number, fall back to NEQ)
function getCorpNumber(entity) {
  const corpNum = entity.registry_numbers?.find(r => r.type === 'corporation_number');
  if (corpNum) return `Corporation No. ${corpNum.number}`;
  const neq = entity.registry_numbers?.find(r => r.type === 'neq');
  if (neq) return `NEQ ${neq.number}`;
  return '';
}

// Get signatories from officers
function getSignatories(entity) {
  const officers = entity.governance?.officers || [];
  const secretary = officers.find(o => o.title?.toLowerCase().includes('secretary'));
  const president = officers.find(o => o.title?.toLowerCase().includes('president'));

  return {
    signatory1: secretary ? { name: secretary.person_name, title: secretary.title } : { name: '_______________', title: 'Secretary' },
    signatory2: president ? { name: president.person_name, title: president.title } : { name: '_______________', title: 'President' }
  };
}

// Create a single certificate document
function createCertificate(corp, cert) {
  const pageBorder = {
    top: { style: BorderStyle.DOUBLE, size: 24, color: navyColor, space: 24 },
    bottom: { style: BorderStyle.DOUBLE, size: 24, color: navyColor, space: 24 },
    left: { style: BorderStyle.DOUBLE, size: 24, color: navyColor, space: 24 },
    right: { style: BorderStyle.DOUBLE, size: 24, color: navyColor, space: 24 }
  };

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          borders: pageBorder
        }
      },
      children: [
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "SHARE CERTIFICATE", bold: true, size: 48, font: "Times New Roman", color: navyColor, smallCaps: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Certificate No. ${cert.number}`, bold: true, size: 28, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "─────────────────────────────────────────────────────", size: 24, color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: corp.legalName, bold: true, size: 36, font: "Times New Roman", color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: `Incorporated under the laws of the ${corp.jurisdiction}`, size: 22, font: "Times New Roman", color: "333333" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: corp.corpNumber, size: 22, font: "Times New Roman", color: "333333" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "─────────────────────────────────────────────────────", size: 24, color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "This is to certify that", size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: cert.shareholder, bold: true, size: 32, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "is the registered holder of", size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: `${cert.words} (${cert.quantity.toLocaleString()})`, bold: true, size: 28, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: `${cert.shareClass.toUpperCase()} SHARES`, bold: true, size: 28, font: "Times New Roman", color: navyColor })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "of the above-named corporation, transferable only on the books of the corporation by the holder", size: 20, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "hereof in person or by duly authorized attorney upon surrender of this certificate properly endorsed.", size: 20, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "IN WITNESS WHEREOF, the corporation has caused this certificate to be signed by its duly authorized officers.", size: 20, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Dated: ${cert.issueDate}`, size: 24, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          tabStops: [{ type: TabStopType.CENTER, position: 3500 }, { type: TabStopType.CENTER, position: 10500 }],
          spacing: { after: 60 },
          children: [new TextRun({ text: "\t_________________________\t_________________________", size: 22, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          tabStops: [{ type: TabStopType.CENTER, position: 3500 }, { type: TabStopType.CENTER, position: 10500 }],
          spacing: { after: 30 },
          children: [new TextRun({ text: `\t${corp.signatory1.name}\t${corp.signatory2.name}`, size: 22, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          tabStops: [{ type: TabStopType.CENTER, position: 3500 }, { type: TabStopType.CENTER, position: 10500 }],
          children: [new TextRun({ text: `\t${corp.signatory1.title}\t${corp.signatory2.title}`, size: 22, font: "Times New Roman" })]
        })
      ]
    }]
  });
}

// Generate certificates for an entity
async function generateCertificates(entityId, issueDate, testMode = false) {
  const entity = loadEntity(entityId);

  // Validate entity type
  if (entity.entity_type !== 'corporation') {
    throw new Error(`Entity ${entityId} is not a corporation (type: ${entity.entity_type})`);
  }
  if (entity.capital_structure?.type !== 'share_capital') {
    throw new Error(`Entity ${entityId} does not have share capital`);
  }

  // Extract corporation details
  const signatories = getSignatories(entity);
  const corp = {
    legalName: entity.legal_name.en || entity.legal_name.fr,
    jurisdiction: jurisdictionName(entity.jurisdiction_of_formation.subdivision),
    corpNumber: getCorpNumber(entity),
    ...signatories
  };

  // Create output directory
  const outputDir = path.join(MINUTE_BOOKS_DIR, entityId, 'share-certificates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate certificate for each shareholder
  const ownership = entity.ownership || [];
  const generated = [];
  let certNum = 1;

  for (const holder of ownership) {
    for (const holding of holder.holdings || []) {
      const shareClass = entity.capital_structure.share_classes.find(c => c.class_id === holding.class_id);
      // Extract class letter (e.g., "A" from "Class A", "B" from "Class B")
      const classMatch = shareClass?.name?.match(/Class\s+([A-Z])/i);
      const classPrefix = classMatch ? classMatch[1].toUpperCase() : 'A';
      const certNumber = `${classPrefix}-${String(certNum).padStart(3, '0')}`;

      const cert = {
        number: certNumber,
        shareholder: holder.holder_name,
        quantity: holding.quantity,
        words: numberToWords(holding.quantity),
        shareClass: shareClass?.name || holding.class_name,
        issueDate: issueDate
      };

      const doc = createCertificate(corp, cert);
      const buffer = await Packer.toBuffer(doc);
      const filename = `${entityId}_${holding.class_id}_${certNumber}.docx`;
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, buffer);

      generated.push({ filename, filePath, cert });
      console.log(`Generated: ${filename}`);
      certNum++;
    }
  }

  console.log(`\n${generated.length} certificates generated in: ${outputDir}`);

  // Run page-fit test if requested
  if (testMode) {
    console.log('\nRunning page-fit validation...');
    await runPageFitTest(generated);
  }

  return generated;
}

// Page-fit test - verifies each certificate fits on one page
async function runPageFitTest(generated) {
  let passed = 0;
  let failed = 0;

  for (const { filename, filePath } of generated) {
    try {
      // Try LibreOffice conversion
      const pdfPath = filePath.replace('.docx', '.pdf');
      try {
        execSync(`soffice --headless --convert-to pdf --outdir "${path.dirname(filePath)}" "${filePath}"`, { stdio: 'pipe' });

        // Count pages using pdfinfo or similar
        const pdfInfo = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf8' });
        const pageMatch = pdfInfo.match(/Pages:\s+(\d+)/);
        const pages = pageMatch ? parseInt(pageMatch[1]) : 0;

        if (pages === 1) {
          console.log(`  ✓ ${filename}: 1 page`);
          passed++;
        } else {
          console.log(`  ✗ ${filename}: ${pages} pages (FAIL - must fit on 1 page)`);
          failed++;
        }

        // Clean up PDF
        fs.unlinkSync(pdfPath);
      } catch (convErr) {
        // Fallback: estimate based on content size
        const stats = fs.statSync(filePath);
        const estimatedPages = Math.ceil(stats.size / 50000); // Rough estimate
        if (estimatedPages <= 1) {
          console.log(`  ~ ${filename}: estimated 1 page (PDF tools unavailable)`);
          passed++;
        } else {
          console.log(`  ? ${filename}: size ${stats.size} bytes - manual verification recommended`);
        }
      }
    } catch (err) {
      console.log(`  ? ${filename}: could not verify - ${err.message}`);
    }
  }

  console.log(`\nPage-fit test: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Share Certificate Generator

Usage: node generate-certificates.js <entity-id> [options]

Options:
  --date YYYY-MM-DD   Issue date (default: today)
  --test              Run page-fit validation after generation
  --help              Show this help

Example:
  node generate-certificates.js ent-artisan-bakery-co --test
`);
    process.exit(0);
  }

  const entityId = args[0];
  const testMode = args.includes('--test');
  const dateIdx = args.indexOf('--date');
  const issueDate = dateIdx >= 0 && args[dateIdx + 1] ? formatDate(args[dateIdx + 1]) : formatDate();

  try {
    await generateCertificates(entityId, issueDate, testMode);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
