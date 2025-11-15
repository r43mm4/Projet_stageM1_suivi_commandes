const axios = require("axios");
const sql = require("mssql");

// ==================== CONFIG ====================
const SF_LOGIN_URL = "https://login.salesforce.com"; // ✅ CORRIGÉ

const SF_USERNAME = "raoulemma1999614@agentforce.com";
const SF_PASSWORD = "@Monm072p455354l35";
const SF_SECURITY_TOKEN = "eW2kx3uTKKpA0uxhMlFunTAwf"; // ⚠️ Vérifie que c'est le bon

const SF_CLIENT_ID =
  "3MVG9rZjd7MXFdLhzBeJ_mxJM6Q607rE2ONczBDRp3TFRvsdd1yA0y1YrBS8SKLgn.7FfCwsIbFWKB4plEzbw";
const SF_CLIENT_SECRET =
  "6721A5481681A7F0DF365242B158496BE7EF227A8E460E674305513B80EEAC68";

const SQL_CONFIG = {
  server: "stagedigiinfo-server.database.windows.net",
  database: "stagedigiinfo-db",
  user: "sqladmin",
  password: "@Monm072p45535ql",
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

// ==================== SYNC FUNCTION ====================
async function syncCommandes() {
  try {
    // 1️⃣ AUTHENTICATE SALESFORCE
    console.log("🔐 Authentification Salesforce...");
    console.log(`📧 Username: ${SF_USERNAME}`);
    console.log(`🔑 Password length: ${SF_PASSWORD.length} chars`);
    console.log(`🎫 Token length: ${SF_SECURITY_TOKEN.length} chars`);

    const authResponse = await axios.post(
      `${SF_LOGIN_URL}/services/oauth2/token`,
      null,
      {
        params: {
          grant_type: "password",
          client_id: SF_CLIENT_ID,
          client_secret: SF_CLIENT_SECRET,
          username: SF_USERNAME,
          password: SF_PASSWORD + SF_SECURITY_TOKEN,
        },
      }
    );

    const { access_token, instance_url } = authResponse.data;
    console.log("✅ Authentification OK");
    console.log(`🌐 Instance URL: ${instance_url}`);

    // 2️⃣ QUERY SALESFORCE (récupérer Commandes)
    console.log("\n📥 Récupération Commandes Salesforce...");
    const soql = `
      SELECT Id, NumCommande__c, Montant__c, Etat__c, Descriptions__c, LastModifiedDate
      FROM Commande__c
      ORDER BY LastModifiedDate DESC
    `;

    const queryResponse = await axios.get(
      `${instance_url}/services/data/v58.0/query`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { q: soql },
      }
    );

    const commandes = queryResponse.data.records;
    console.log(`✅ ${commandes.length} commandes récupérées`);

    // Si aucune commande trouvée
    if (commandes.length === 0) {
      console.log(
        "⚠️  Aucune commande dans Salesforce. Créer des commandes d'abord."
      );
      return;
    }

    // 3️⃣ CONNECT TO SQL
    console.log("\n🔌 Connexion Azure SQL...");
    const pool = await sql.connect(SQL_CONFIG);
    console.log("✅ SQL connecté");

    // 4️⃣ INSERT/UPDATE dans SQL
    let inserted = 0,
      updated = 0,
      errors = 0;

    for (const commande of commandes) {
      try {
        // Vérifier si existe déjà (par SalesforceId)
        const checkResult = await pool
          .request()
          .input("sfId", sql.NVarChar(50), commande.Id)
          .query("SELECT CommandeId FROM Commandes WHERE SalesforceId = @sfId");

        if (checkResult.recordset.length === 0) {
          // INSERT
          await pool
            .request()
            .input("sfId", sql.NVarChar(50), commande.Id)
            .input("numCmd", sql.NVarChar(20), commande.NumCommande__c)
            .input("montant", sql.Decimal(10, 2), commande.Montant__c)
            .input("etat", sql.NVarChar(50), commande.Etat__c)
            .input("desc", sql.NVarChar(500), commande.Descriptions__c || null)
            .query(`
              INSERT INTO Commandes (SalesforceId, NumCommande, Montant, Etat, Descriptions, CreatedAt, LastSyncedAt)
              VALUES (@sfId, @numCmd, @montant, @etat, @desc, GETDATE(), GETDATE())
            `);
          inserted++;
          console.log(
            `  ➕ INSERT: ${commande.NumCommande__c} (${commande.Montant__c}€)`
          );
        } else {
          // UPDATE
          await pool
            .request()
            .input("sfId", sql.NVarChar(50), commande.Id)
            .input("montant", sql.Decimal(10, 2), commande.Montant__c)
            .input("etat", sql.NVarChar(50), commande.Etat__c)
            .input("desc", sql.NVarChar(500), commande.Descriptions__c || null)
            .query(`
              UPDATE Commandes 
              SET Montant = @montant, Etat = @etat, Descriptions = @desc, LastSyncedAt = GETDATE()
              WHERE SalesforceId = @sfId
            `);
          updated++;
          console.log(
            `  🔄 UPDATE: ${commande.NumCommande__c} (${commande.Etat__c})`
          );
        }
      } catch (err) {
        errors++;
        console.error(
          `  ❌ ERREUR sur ${commande.NumCommande__c}: ${err.message}`
        );
      }
    }

    console.log(`\n✅ SYNC TERMINÉE:`);
    console.log(`   📊 ${inserted} insérées`);
    console.log(`   🔄 ${updated} mises à jour`);
    console.log(`   ❌ ${errors} erreurs`);
    console.log(`   📦 ${commandes.length} commandes au total`);

    await pool.close();
  } catch (error) {
    console.error("\n❌ ERREUR FATALE:");

    if (error.response?.data) {
      console.error(
        "Réponse Salesforce:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else if (error.message) {
      console.error("Message:", error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// ==================== RUN ====================
console.log("🚀 Démarrage de la synchronisation Salesforce → Azure SQL\n");
syncCommandes();
