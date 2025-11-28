/**
 * ═══════════════════════════════════════════════════════════════
 * SERVICE DE SYNCHRONISATION SALESFORCE → AZURE SQL
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce service synchronise les commandes depuis Salesforce vers SQL.
 *
 * STRATÉGIE :
 * - Batch sync (toutes les heures par défaut)
 * - Détection des modifications via LastModifiedDate
 * - Idempotence garantie (MERGE ou INSERT/UPDATE)
 * - Retry automatique en cas d'erreur
 */

const salesforceService = require("./salesforceService");
const { sql, poolPromise } = require("../lib/database");

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSync: null,
      lastError: null,
    };
  }

  /**
   * Obtenir la date de dernière synchronisation
   */
  async getLastSyncTime() {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .query("SELECT MAX(DerniereSynchro) AS LastSync FROM Commandes");

      const lastSync = result.recordset[0].LastSync;

      if (lastSync) {
        console.log(
          `Dernière synchro: ${new Date(lastSync).toLocaleString("fr-FR")}`
        );
        return lastSync;
      }

      // Si aucune synchro, prendre les 7 derniers jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      console.log(
        `Aucune synchro précédente, sync depuis: ${sevenDaysAgo.toLocaleString(
          "fr-FR"
        )}`
      );
      return sevenDaysAgo;
    } catch (error) {
      console.error("Erreur getLastSyncTime:", error.message);
      // En cas d'erreur, prendre les 7 derniers jours par sécurité
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sevenDaysAgo;
    }
  }

  /**
   * Vérifier si une commande existe dans SQL
   */
  async commandeExists(salesforceId) {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input("salesforceId", sql.NVarChar(50), salesforceId)
        .query(
          "SELECT CommandeId FROM Commandes WHERE SalesforceId = @salesforceId"
        );

      return result.recordset.length > 0
        ? result.recordset[0].CommandeId
        : null;
    } catch (error) {
      console.error(
        `Erreur commandeExists pour ${salesforceId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Créer ou obtenir un client par défaut
   */
  async getOrCreateDefaultClient() {
    try {
      const pool = await poolPromise;

      // Vérifier si le client par défaut existe
      const checkResult = await pool
        .request()
        .query(
          "SELECT ClientId FROM Clients WHERE Email = 'client.defaut@example.com'"
        );

      if (checkResult.recordset.length > 0) {
        return checkResult.recordset[0].ClientId;
      }

      // Créer le client par défaut
      const insertResult = await pool
        .request()
        .input("nomClient", sql.NVarChar(100), "Client par défaut")
        .input("email", sql.NVarChar(100), "client.defaut@example.com")
        .input("motDePasse", sql.NVarChar(255), "$2b$10$defaulthashedpassword")
        .query(`
          INSERT INTO Clients (NomClient, Email, MotDePasse, CreePar)
          OUTPUT INSERTED.ClientId
          VALUES (@nomClient, @email, @motDePasse, 'System')
        `);

      console.log("Client par défaut créé");
      return insertResult.recordset[0].ClientId;
    } catch (error) {
      console.error("Erreur getOrCreateDefaultClient:", error.message);
      throw error;
    }
  }

  /**
   * Insérer une nouvelle commande dans SQL
   */
  async insertCommande(sfCommande) {
    try {
      const pool = await poolPromise;
      const defaultClientId = await this.getOrCreateDefaultClient();

      const result = await pool
        .request()
        .input("salesforceId", sql.NVarChar(50), sfCommande.Id)
        .input("numCommande", sql.NVarChar(20), sfCommande.NumCommande__c)
        .input("clientId", sql.Int, defaultClientId)
        .input("montantTotal", sql.Decimal(10, 2), sfCommande.Montant__c || 0)
        .input("etat", sql.NVarChar(50), sfCommande.Etat__c || "En préparation")
        .input(
          "descriptions",
          sql.NVarChar(500),
          sfCommande.Descriptions__c || null
        )
        .input("creePar", sql.NVarChar(100), "Salesforce Sync").query(`
          INSERT INTO Commandes (
            SalesforceId, NumCommande, ClientId, MontantTotal, Etat, 
            Descriptions, CreePar, DerniereSynchro
          )
          OUTPUT INSERTED.CommandeId
          VALUES (
            @salesforceId, @numCommande, @clientId, @montantTotal, @etat,
            @descriptions, @creePar, GETDATE()
          )
        `);

      console.log(`   INSERT: ${sfCommande.NumCommande__c}`);
      return result.recordset[0].CommandeId;
    } catch (error) {
      console.error(
        `   Erreur INSERT ${sfCommande.NumCommande__c}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Mettre à jour une commande existante dans SQL
   */
  async updateCommande(commandeId, sfCommande) {
    try {
      const pool = await poolPromise;

      await pool
        .request()
        .input("commandeId", sql.Int, commandeId)
        .input("numCommande", sql.NVarChar(20), sfCommande.NumCommande__c)
        .input("montantTotal", sql.Decimal(10, 2), sfCommande.Montant__c || 0)
        .input("etat", sql.NVarChar(50), sfCommande.Etat__c || "En préparation")
        .input(
          "descriptions",
          sql.NVarChar(500),
          sfCommande.Descriptions__c || null
        ).query(`
          UPDATE Commandes
          SET 
            NumCommande = @numCommande,
            MontantTotal = @montantTotal,
            Etat = @etat,
            Descriptions = @descriptions,
            DerniereModification = GETDATE(),
            DerniereSynchro = GETDATE(),
            DerniereModificationPar = 'Salesforce Sync'
          WHERE CommandeId = @commandeId
        `);

      console.log(`   UPDATE: ${sfCommande.NumCommande__c}`);
    } catch (error) {
      console.error(
        `   Erreur UPDATE ${sfCommande.NumCommande__c}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * FONCTION PRINCIPALE : Synchroniser les commandes
   */
  async syncCommandes() {
    // Empêcher les syncs simultanées
    if (this.isSyncing) {
      console.log("Une synchronisation est déjà en cours, abandon...\n");
      return {
        success: false,
        message: "Synchronisation déjà en cours",
        skipped: true,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║   DÉBUT SYNCHRONISATION SALESFORCE → SQL             ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    let errorDetails = [];

    try {
      // 1. Authentifier Salesforce
      console.log("Étape 1/4 : Authentification Salesforce");
      console.log("─────────────────────────────────────────────────────");
      await salesforceService.ensureAuthenticated();

      // 2. Obtenir la date de dernière synchro
      console.log("\nÉtape 2/4 : Détection des modifications");
      console.log("─────────────────────────────────────────────────────");
      const lastSync = await this.getLastSyncTime();

      // 3. Récupérer les commandes modifiées depuis Salesforce
      console.log("\nÉtape 3/4 : Récupération depuis Salesforce");
      console.log("─────────────────────────────────────────────────────");
      const sfResult = await salesforceService.getModifiedCommandes(lastSync);
      const sfCommandes = sfResult.records;

      console.log(`${sfCommandes.length} commandes à synchroniser\n`);

      if (sfCommandes.length === 0) {
        console.log("Aucune modification détectée, synchronisation terminée\n");
        this.isSyncing = false;
        this.syncStats.totalSyncs++;
        this.syncStats.successfulSyncs++;
        this.syncStats.lastSync = new Date();

        return {
          success: true,
          inserted: 0,
          updated: 0,
          errors: 0,
          total: 0,
          duration: Date.now() - startTime,
          message: "Aucune modification à synchroniser",
        };
      }

      // 4. Synchroniser chaque commande
      console.log("Étape 4/4 : Synchronisation vers SQL");
      console.log("─────────────────────────────────────────────────────");

      for (const sfCommande of sfCommandes) {
        try {
          // Vérifier si la commande existe
          const existingId = await this.commandeExists(sfCommande.Id);

          if (existingId) {
            // UPDATE
            await this.updateCommande(existingId, sfCommande);
            updated++;
          } else {
            // INSERT
            await this.insertCommande(sfCommande);
            inserted++;
          }
        } catch (error) {
          errors++;
          errorDetails.push({
            commande: sfCommande.NumCommande__c,
            error: error.message,
          });
          console.error(`   Erreur: ${error.message}`);
        }
      }

      // 5. Résumé
      const duration = Date.now() - startTime;

      console.log(
        "\n╔═══════════════════════════════════════════════════════╗"
      );
      console.log("║   SYNCHRONISATION TERMINÉE                           ║");
      console.log("╚═══════════════════════════════════════════════════════╝");
      console.log(`   Insérées: ${inserted}`);
      console.log(`   Mises à jour: ${updated}`);
      console.log(`   Erreurs: ${errors}`);
      console.log(`   Durée: ${(duration / 1000).toFixed(2)}s\n`);

      // Mettre à jour les stats
      this.syncStats.totalSyncs++;
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSync = new Date();
      this.lastSyncTime = new Date();

      return {
        success: true,
        inserted,
        updated,
        errors,
        total: sfCommandes.length,
        duration,
        errorDetails: errors > 0 ? errorDetails : null,
      };
    } catch (error) {
      console.error("\nERREUR FATALE SYNCHRONISATION:", error.message);
      console.error(error.stack);

      this.syncStats.totalSyncs++;
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;

      return {
        success: false,
        error: error.message,
        inserted,
        updated,
        errors: errors + 1,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchroniser avec retry automatique
   */
  async syncWithRetry(maxRetries = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;

      console.log(`\nTentative de synchronisation ${attempt}/${maxRetries}`);

      try {
        const result = await this.syncCommandes();

        if (result.success || result.skipped) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error.message;
        console.error(`Tentative ${attempt} échouée:`, error.message);
      }

      // Attendre avant de réessayer (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(3, attempt) * 1000; // 3s, 9s, 27s
        console.log(`Attente de ${delay / 1000}s avant retry...\n`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(
      `Synchronisation échouée après ${maxRetries} tentatives: ${lastError}`
    );
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  getStats() {
    return {
      ...this.syncStats,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

// Export instance unique
module.exports = new SyncService();
