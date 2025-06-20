#!/usr/bin/env node
// scripts/generate-reports.js
const path = require('path');
const fs = require('fs');

// Liste des rapports disponibles
const availableReports = [
  {
    id: 'codes-barres-zero',
    name: 'Codes-barres commençant par 0',
    file: './rapports/codes-barres-zero.js',
    description: 'Liste les produits avec des codes-barres commençant par 0',
  },
  {
    id: 'produits-sans-stock',
    name: 'Produits sans stock',
    file: './rapports/produits-sans-stock.js',
    description: 'Liste les produits avec stock à 0, null ou undefined',
  },
  {
    id: 'produits-sans-categorie',
    name: 'Produits sans catégorie',
    file: './rapports/produits-sans-categorie.js',
    description: 'Liste les produits sans catégorie assignée',
  },
  // Ajouter d'autres rapports ici au fur et à mesure
];

function showHelp() {
  console.log('🎯 [GÉNÉRATEUR DE RAPPORTS] - Système de rapports modulaire');
  console.log('==========================================================\n');

  console.log('Usage:');
  console.log('  node scripts/generate-reports.js [rapport] [--source=SOURCE]');
  console.log('  node scripts/generate-reports.js --list\n');

  console.log('Sources disponibles:');
  console.log('  📊 new  : Base de données actuelle (data/products.db) [défaut]');
  console.log('  📋 old  : Ancienne base de données (data/source/old_products.db)\n');

  console.log('Rapports disponibles:');
  availableReports.forEach((report) => {
    console.log(`  📊 ${report.id}`);
    console.log(`     ${report.name}`);
    console.log(`     ${report.description}\n`);
  });

  console.log('Exemples:');
  console.log('  node scripts/generate-reports.js codes-barres-zero');
  console.log('  node scripts/generate-reports.js codes-barres-zero --source=old');
  console.log('  node scripts/generate-reports.js produits-sans-stock --source=new');
  console.log('  node scripts/generate-reports.js produits-sans-categorie');
  console.log('  node scripts/generate-reports.js --list');
}

function listReports() {
  console.log('📋 [RAPPORTS DISPONIBLES]');
  console.log('=========================\n');

  availableReports.forEach((report, index) => {
    console.log(`${index + 1}. ${report.name}`);
    console.log(`   ID: ${report.id}`);
    console.log(`   📄 ${report.description}`);
    console.log('');
  });
}

async function runReport(reportId, source = 'new') {
  const report = availableReports.find((r) => r.id === reportId);

  if (!report) {
    console.error(`❌ [ERREUR] Rapport "${reportId}" non trouvé`);
    console.log('\nRapports disponibles:');
    availableReports.forEach((r) => console.log(`  - ${r.id}`));
    process.exit(1);
  }

  // Définir le chemin de la base de données selon la source
  let dbPath;
  let sourceName;

  if (source === 'old') {
    dbPath = path.join(__dirname, '../data/source/old_products.db');
    sourceName = 'Ancienne base de données';
  } else {
    dbPath = path.join(__dirname, '../data/products.db');
    sourceName = 'Base de données actuelle';
  }

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ [ERREUR] Base de données non trouvée: ${dbPath}`);
    process.exit(1);
  }

  const reportPath = path.join(__dirname, report.file);

  if (!fs.existsSync(reportPath)) {
    console.error(`❌ [ERREUR] Fichier de rapport non trouvé: ${reportPath}`);
    process.exit(1);
  }

  console.log(`🚀 [EXÉCUTION] Génération du rapport: ${report.name}`);
  console.log(`📊 [SOURCE] ${sourceName}`);
  console.log(`📂 [FICHIER] ${dbPath}`);
  console.log('='.repeat(60));

  try {
    // Charger et exécuter le module de rapport avec la source
    delete require.cache[require.resolve(report.file)]; // Vider le cache du module
    const reportModule = require(report.file);
    await reportModule.generateReport(dbPath, source);
  } catch (error) {
    console.error(`❌ [ERREUR] Erreur lors de l'exécution du rapport:`, error);
    process.exit(1);
  }
}

// Programme principal
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  // Parser les arguments
  let command = '';
  let source = 'new'; // source par défaut

  args.forEach((arg) => {
    if (arg.startsWith('--source=')) {
      source = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      command = arg;
    }
  });

  // Valider la source
  if (source !== 'new' && source !== 'old') {
    console.error(`❌ [ERREUR] Source invalide: "${source}"`);
    console.log('Sources valides: new, old');
    process.exit(1);
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
  } else if (command === 'list' || command === '--list' || command === '-l') {
    listReports();
  } else if (command) {
    await runReport(command, source);
  } else {
    showHelp();
  }
}

// Exécuter le programme principal
main().catch((error) => {
  console.error('💥 [ÉCHEC] Erreur critique:', error);
  process.exit(1);
});
