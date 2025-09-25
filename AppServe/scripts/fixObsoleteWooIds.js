// fixObsoleteWooIds.js - Script de correction des woo_id obsolètes
// Généré automatiquement par detectObsoleteWooIds.js
// Date de génération: 2025-09-23T15:35:53.233Z

const fs = require("fs").promises;
const path = require("path");

const corrections = [
  { localId: "4wP1SG6OgEVe3nxZ", oldWooId: 25105410, newWooId: 25105586, sku: "MSB1", name: "Housse baguettes Meinl Pro Noir" },
  { localId: "6l7Euile6qzuf8YI", oldWooId: 25105157, newWooId: 25105559, sku: "/-75290", name: "Morley 20/20 Classic Switchless Wah" },
  { localId: "971WPAUTRqZQQqSt", oldWooId: 25107482, newWooId: 25107709, sku: "MXL LSM9 BLEU", name: "MICRO CHANT" },
  { localId: "C6JU7cl6jPXcdE2w", oldWooId: 25104931, newWooId: 25105562, sku: "-", name: "La guitare Lava Me 2 Freeboost en bleu" },
  { localId: "G2WHdXMcvfIJiPKn", oldWooId: 25105088, newWooId: 25107619, sku: "0036", name: "Harmonica Hohner Echo Double Droit 54/64 CG" },
  { localId: "KkfOY6NUh4ONtLaq", oldWooId: 25104971, newWooId: 25105566, sku: "--75648", name: "Amano C-OP-SN Open Pore" },
  { localId: "Kvy94gwcZWsFN4J4", oldWooId: 25104130, newWooId: 25105482, sku: "PROUHFHEADB420TD", name: "Pack UHF B420TD DSP True Diversity avec Micro Prodipe MH9 Omni" },
  { localId: "MeH8Kutdxgv0fzLp", oldWooId: 25107318, newWooId: 25107613, sku: "25LB06", name: "Sangle en vinyle pour guitare Beatles Yellow Submarine 55th Anniversary, Primrose Prairie" },
  { localId: "Q5mfa7UuA9e9V6Mv", oldWooId: 25107519, newWooId: 25107621, sku: "PWPS12", name: "D'Addario Jeu de vis de chevalet avec vis de fin fabriquées en moulage par injection D'Addario, jeu de 7, coloris ivoire" },
  { localId: "VUBpl3B7J8aSleKy", oldWooId: 25103859, newWooId: 25105569, sku: "EGBG N12", name: "Housse guitare électrique EGBG N12" },
  { localId: "ioxMYJuLSkPKMWwR", oldWooId: 25105238, newWooId: 25105575, sku: "--76273", name: "Stanford Blonde Sister 200" },
  { localId: "nOOiQ5LIWvBeUaGC", oldWooId: 25103786, newWooId: 25105578, sku: "JMFJB80LHRACAR ", name: "Basse Prodipe Gaucher Candy Red" },
  { localId: "skVaUKCGWTv8H1rS", oldWooId: 25105038, newWooId: 25105582, sku: "--76519", name: "Orange Dual Terror Head Bundle" },
];

async function fixObsoleteWooIds() {
  console.log(`🔧 Correction de ${corrections.length} woo_id obsolètes...`);
  
  // TODO: Adapter selon votre système de base de données
  // Exemple avec MongoDB:
  // const Product = require("../models/Product");
  // 
  // for (const correction of corrections) {
  //   try {
  //     await Product.findByIdAndUpdate(
  //       correction.localId,
  //       { woo_id: correction.newWooId }
  //     );
  //     console.log(`✅ ${correction.sku}: ${correction.oldWooId} → ${correction.newWooId}`);
  //   } catch (error) {
  //     console.error(`❌ Erreur ${correction.localId}:`, error.message);
  //   }
  // }
  
  console.log("🔧 Script de correction prêt à personnaliser");
}

if (require.main === module) {
  fixObsoleteWooIds();
}

module.exports = { corrections, fixObsoleteWooIds };