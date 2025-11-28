/**
 * ═══════════════════════════════════════════════════════════════
 * TEST CONNEXION AZURE SQL
 * ═══════════════════════════════════════════════════════════════
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const sql = require("mssql");

async function testSQLConnection() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   TEST CONNEXION AZURE SQL                           ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Afficher la configuration (masquer le password)
  console.log("Configuration SQL:");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`   Server: ${process.env.DB_SERVER}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(
    `   Password: ${
      process.env.DB_PASSWORD
        ? "***" + process.env.DB_PASSWORD.slice(-4)
        : "MANQUANT"
    }`
  );
  console.log("");

  const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  let pool;

  try {
    console.log("Tentative de connexion...\n");

    pool = await sql.connect(config);

    console.log("CONNEXION RÉUSSIE !\n");

    // Test 1: Vérifier la version SQL
    console.log("TEST 1: Version SQL");
    console.log("─────────────────────────────────────────────────────");
    const versionResult = await pool
      .request()
      .query("SELECT @@VERSION AS Version");
    const version = versionResult.recordset[0].Version;
    console.log(`${version.substring(0, 80)}...\n`);

    // Test 2: Vérifier les tables existantes
    console.log("TEST 2: Tables existantes");
    console.log("─────────────────────────────────────────────────────");
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    if (tablesResult.recordset.length === 0) {
      console.log("AUCUNE TABLE TROUVÉE !");
      console.log("\nAction requise:");
      console.log("   1. Connectez-vous au portail Azure");
      console.log("   2. SQL Database → Query editor");
      console.log("   3. Exécutez le script database/init.sql\n");
    } else {
      console.log("Tables trouvées:");
      tablesResult.recordset.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.TABLE_NAME}`);
      });
      console.log("");
    }

    // Test 3: Tester une requête simple
    console.log("TEST 3: Requête de test");
    console.log("─────────────────────────────────────────────────────");

    try {
      const testQuery = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM Clients) AS NbClients,
          (SELECT COUNT(*) FROM Commandes) AS NbCommandes,
          (SELECT COUNT(*) FROM Produits) AS NbProduits
      `);

      const counts = testQuery.recordset[0];
      console.log(`Clients: ${counts.NbClients}`);
      console.log(`Commandes: ${counts.NbCommandes}`);
      console.log(`Produits: ${counts.NbProduits}\n`);
    } catch (error) {
      console.log("Les tables existent mais sont peut-être vides");
      console.log(`   Erreur: ${error.message}\n`);
    }

    // SUCCÈS
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║   TOUS LES TESTS SONT PASSÉS !                   ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    console.log("Prochaines étapes :");
    console.log("   1. Si aucune table: Exécutez database/init.sql sur Azure");
    console.log("   2. Testez la synchro: node testSync.js");
    console.log("   3. Lancez le serveur: node server.js\n");

    process.exit(0);
  } catch (error) {
    console.error(
      "\n╔═══════════════════════════════════════════════════════╗"
    );
    console.error("║   CONNEXION ÉCHOUÉE                                ║");
    console.error(
      "╚═══════════════════════════════════════════════════════╝\n"
    );

    console.error("Erreur:", error.message);
    console.error(`   Code: ${error.code || "N/A"}\n`);

    // Diagnostics selon le type d'erreur
    if (error.code === "ELOGIN") {
      console.error("Problème d'authentification:");
      console.error("   → Vérifiez DB_USER et DB_PASSWORD dans .env");
      console.error("   → Vérifiez que l'utilisateur existe dans Azure SQL\n");
    } else if (error.message.includes("Client with IP address")) {
      const ipMatch = error.message.match(/IP address '([^']+)'/);
      const yourIP = ipMatch ? ipMatch[1] : "inconnue";

      console.error("Problème de Firewall:");
      console.error(`   → Votre IP: ${yourIP}`);
      console.error("   → Action: Ajoutez cette IP dans Azure Portal");
      console.error("\n   Étapes:");
      console.error("   1. portal.azure.com → SQL Server → Networking");
      console.error("   2. Firewall rules → + Add your client IPv4");
      console.error(`   3. Ajoutez: ${yourIP}`);
      console.error("   4. Save et attendez 1-2 minutes\n");
    } else if (error.code === "ETIMEOUT" || error.message.includes("timeout")) {
      console.error("Problème de timeout:");
      console.error("   → Vérifiez votre connexion internet");
      console.error("   → Vérifiez que le serveur SQL existe");
      console.error("   → Vérifiez DB_SERVER dans .env\n");
    } else if (error.message.includes("Cannot open server")) {
      console.error("Problème d'accès au serveur:");
      console.error("   → Vérifiez que DB_SERVER est correct");
      console.error("   → Vérifiez le firewall Azure\n");
    } else {
      console.error("Vérifications générales:");
      console.error("   → Vérifiez tous les paramètres dans .env");
      console.error("   → Vérifiez que le serveur SQL existe dans Azure");
      console.error("   → Consultez les logs Azure pour plus de détails\n");
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testSQLConnection();
