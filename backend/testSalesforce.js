/**
 * ═══════════════════════════════════════════════════════════════
 * TEST COMPLET DE LA CONNEXION SALESFORCE
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce script teste :
 * 1. Chargement des variables d'environnement
 * 2. Authentification OAuth2
 * 3. Requêtes SOQL
 * 4. Récupération des commandes
 *
 * UTILISATION :
 * cd backend
 * node testSalesforce.js
 */

// Charger les variables d'environnement AVANT tout le reste
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const salesforceService = require("./services/salesforceService");

async function testSalesforce() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║     TEST CONNEXION SALESFORCE                        ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  try {
    // ==================== TEST 1: Configuration ====================
    console.log("📋 TEST 1: Vérification de la configuration");
    console.log("═══════════════════════════════════════════════════════");

    const configChecks = {
      SF_CLIENT_ID: process.env.SF_CLIENT_ID,
      SF_CLIENT_SECRET: process.env.SF_CLIENT_SECRET,
      SF_REFRESH_TOKEN: process.env.SF_REFRESH_TOKEN,
      SF_INSTANCE_URL: process.env.SF_INSTANCE_URL,
    };

    let configOK = true;
    for (const [key, value] of Object.entries(configChecks)) {
      const status = value ? "✅ Présent" : "❌ Manquant";
      console.log(`   ${key}: ${status}`);
      if (!value && key !== "SF_INSTANCE_URL") {
        // SF_INSTANCE_URL peut être absent au début
        configOK = false;
      }
    }

    if (!configOK) {
      console.error(
        "\n❌ Configuration incomplète. Vérifiez votre fichier .env\n"
      );
      console.error("Le fichier .env doit contenir :");
      console.error("   SF_CLIENT_ID=...");
      console.error("   SF_CLIENT_SECRET=...");
      console.error("   SF_REFRESH_TOKEN=...");
      console.error("\nEmplacement attendu: backend/.env\n");
      process.exit(1);
    }

    console.log("\n✅ Configuration complète\n");

    // ==================== TEST 2: Authentification ====================
    console.log("📋 TEST 2: Authentification OAuth2");
    console.log("═══════════════════════════════════════════════════════");

    const authResult = await salesforceService.authenticate();

    if (!authResult.success) {
      console.error("\n❌ Authentification échouée");
      console.error("Vérifiez que votre Refresh Token est valide\n");
      process.exit(1);
    }

    console.log("✅ Authentification réussie\n");

    // ==================== TEST 3: Connexion ====================
    console.log("📋 TEST 3: Test de connexion");
    console.log("═══════════════════════════════════════════════════════");

    const connectionTest = await salesforceService.testConnection();

    if (!connectionTest.success) {
      console.error("\n❌ Test de connexion échoué");
      console.error(`   Erreur: ${connectionTest.error}\n`);
      process.exit(1);
    }

    // ==================== TEST 4: Récupération des commandes ====================
    console.log("📋 TEST 4: Récupération de toutes les commandes");
    console.log("═══════════════════════════════════════════════════════");

    const allCommandes = await salesforceService.getAllCommandes();
    console.log(`✅ ${allCommandes.totalSize} commandes récupérées\n`);

    if (allCommandes.records.length > 0) {
      console.log("📦 Aperçu des premières commandes:");
      console.log("───────────────────────────────────────────────────────");

      allCommandes.records.slice(0, 5).forEach((cmd, index) => {
        console.log(`   ${index + 1}. ${cmd.NumCommande__c || "N/A"}`);
        console.log(`      Montant: ${cmd.Montant__c || 0}€`);
        console.log(`      État: ${cmd.Etat__c || "N/A"}`);
        console.log(
          `      Modifié: ${new Date(cmd.LastModifiedDate).toLocaleString(
            "fr-FR"
          )}`
        );
        console.log("");
      });
    } else {
      console.log("\n⚠️  Aucune commande trouvée dans Salesforce");
      console.log("   → Créez des commandes de test dans votre org Salesforce");
      console.log("   → Objet: Commande__c");
      console.log(
        "   → Champs: NumCommande__c, Montant__c, Etat__c, Descriptions__c\n"
      );
    }

    // ==================== TEST 5: Statistiques ====================
    console.log("📋 TEST 5: Statistiques par état");
    console.log("═══════════════════════════════════════════════════════");

    const stats = await salesforceService.getStats();
    console.log("Répartition des commandes:");
    console.log(`   Total: ${stats.total}`);
    console.log(`   En préparation: ${stats["En préparation"] || 0}`);
    console.log(`   Expédié: ${stats["Expédié"] || 0}`);
    console.log(`   Livré: ${stats["Livré"] || 0}`);
    console.log(`   Annulé: ${stats["Annulé"] || 0}\n`);

    // ==================== TEST 6: Commandes modifiées ====================
    console.log("📋 TEST 6: Commandes modifiées (dernières 24h)");
    console.log("═══════════════════════════════════════════════════════");

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const modified = await salesforceService.getModifiedCommandes(yesterday);
    console.log(
      `✅ ${modified.totalSize} commandes modifiées dans les dernières 24h\n`
    );

    // ==================== SUCCÈS ====================
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║   ✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !       ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    console.log("🚀 Prochaines étapes :");
    console.log(
      "   1. Story 4.3 : Implémenter la synchronisation vers Azure SQL"
    );
    console.log("   2. Story 4.4 : Créer l'endpoint manuel de sync");
    console.log("   3. Tester le flux complet Salesforce → SQL → Portail\n");

    process.exit(0);
  } catch (error) {
    console.error(
      "\n╔═══════════════════════════════════════════════════════╗"
    );
    console.error("║   ❌ TEST ÉCHOUÉ                                      ║");
    console.error(
      "╚═══════════════════════════════════════════════════════╝\n"
    );
    console.error("Erreur:", error.message);

    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    console.error("\n💡 Solutions possibles:");
    console.error("   1. Vérifiez que le fichier .env est dans backend/.env");
    console.error("   2. Vérifiez que SF_REFRESH_TOKEN est valide");
    console.error("   3. Vérifiez votre connexion internet");
    console.error(
      "   4. Vérifiez que l'objet Commande__c existe dans Salesforce\n"
    );

    process.exit(1);
  }
}

// Lancer le test
testSalesforce();
