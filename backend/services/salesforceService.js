/**
 * ═══════════════════════════════════════════════════════════════
 * SALESFORCE SERVICE - MODE MOCK (SIMULATION)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce service SIMULE Salesforce avec des données réalistes.
 * Utilisé pour le développement et les tests sans Salesforce réel.
 *
 * AVANTAGES :
 * - Pas de dépendance à Salesforce
 * - Données contrôlées et prévisibles
 * - Pas de quotas API à gérer
 * - Tests rapides et fiables
 */

class SalesforceServiceMock {
  constructor() {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("   SALESFORCE SERVICE - MODE MOCK");
    console.log("═══════════════════════════════════════════════════════");
    console.log("    MODE SIMULATION ACTIVÉ");
    console.log("   30 commandes simulées disponibles");
    console.log("═══════════════════════════════════════════════════════\n");

    this.isAuthenticated = false;
    this.instanceUrl = "https://mock-salesforce.example.com";

    // Données simulées de commandes
    this.mockCommandes = this._generateMockCommandes();
  }

  /**
   * Générer 30 commandes simulées réalistes
   */
  _generateMockCommandes() {
    const etats = ["En préparation", "Expédié", "Livré", "Annulé"];
    const clients = [
      "WAFFO Raoul",
      "Entreprise TechCorp",
      "Sophie Martin",
      "Jean Dupont",
      "Marie Laurent",
      "Pierre Durand",
    ];

    const commandes = [];
    const now = new Date();

    for (let i = 1; i <= 30; i++) {
      const etat = etats[Math.floor(Math.random() * etats.length)];
      const client = clients[Math.floor(Math.random() * clients.length)];
      const montant = (Math.random() * 2000 + 100).toFixed(2);

      // Dates variées (derniers 30 jours)
      const daysAgo = Math.floor(Math.random() * 30);
      const createdDate = new Date(now);
      createdDate.setDate(createdDate.getDate() - daysAgo);

      const lastModified = new Date(createdDate);
      lastModified.setHours(
        lastModified.getHours() + Math.floor(Math.random() * 48)
      );

      commandes.push({
        Id: `SF${String(i).padStart(15, "0")}AAA`,
        NumCommande__c: `CMD-${String(i).padStart(4, "0")}`,
        Montant__c: parseFloat(montant),
        Etat__c: etat,
        Descriptions__c: `Commande ${client} - ${etat}`,
        ClientNom__c: client,
        CreatedDate: createdDate.toISOString(),
        LastModifiedDate: lastModified.toISOString(),
      });
    }

    return commandes;
  }

  /**
   * Simuler l'authentification
   */
  async authenticate() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Authentification MOCK...");
        console.log("Authentification simulée réussie\n");

        this.isAuthenticated = true;

        resolve({
          success: true,
          accessToken: "MOCK_ACCESS_TOKEN_" + Date.now(),
          instanceUrl: this.instanceUrl,
        });
      }, 500); // Simuler un délai réseau
    });
  }

  /**
   * Vérifier l'authentification
   */
  async ensureAuthenticated() {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }
    return true;
  }

  /**
   * Simuler une requête SOQL
   */
  async executeSOQL(query) {
    await this.ensureAuthenticated();

    console.log(`Exécution SOQL MOCK: ${query.substring(0, 80)}...`);

    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Parser la query pour filtrer
    let results = [...this.mockCommandes];

    // Filtrage par état
    if (query.includes("WHERE Etat__c")) {
      const etatMatch = query.match(/Etat__c = '([^']+)'/);
      if (etatMatch) {
        results = results.filter((c) => c.Etat__c === etatMatch[1]);
      }
    }

    // Filtrage par date
    if (query.includes("LastModifiedDate >")) {
      const dateMatch = query.match(/LastModifiedDate > (\S+)/);
      if (dateMatch) {
        const filterDate = new Date(dateMatch[1]);
        results = results.filter(
          (c) => new Date(c.LastModifiedDate) > filterDate
        );
      }
    }

    // LIMIT
    const limitMatch = query.match(/LIMIT (\d+)/);
    if (limitMatch) {
      results = results.slice(0, parseInt(limitMatch[1]));
    }

    // COUNT()
    if (query.includes("COUNT()")) {
      console.log(`COUNT() retourné: ${results.length}\n`);
      return {
        totalSize: results.length,
        done: true,
        records: [],
      };
    }

    console.log(`${results.length} enregistrements MOCK retournés\n`);

    return {
      totalSize: results.length,
      done: true,
      records: results,
    };
  }

  /**
   * Récupérer toutes les commandes
   */
  async getAllCommandes() {
    console.log("Récupération de toutes les commandes MOCK...");

    const soql = `
      SELECT 
        Id, 
        NumCommande__c, 
        Montant__c, 
        Etat__c, 
        Descriptions__c, 
        CreatedDate,
        LastModifiedDate
      FROM Commande__c
      ORDER BY LastModifiedDate DESC
      LIMIT 1000
    `;

    return await this.executeSOQL(soql);
  }

  /**
   * Récupérer les commandes modifiées depuis une date
   */
  async getModifiedCommandes(since) {
    const isoDate = since instanceof Date ? since.toISOString() : since;

    console.log(`Récupération commandes modifiées depuis ${isoDate}...`);

    const soql = `
      SELECT 
        Id, 
        NumCommande__c, 
        Montant__c, 
        Etat__c, 
        Descriptions__c, 
        CreatedDate,
        LastModifiedDate
      FROM Commande__c
      WHERE LastModifiedDate > ${isoDate}
      ORDER BY LastModifiedDate ASC
      LIMIT 2000
    `;

    return await this.executeSOQL(soql);
  }

  /**
   * Récupérer une commande par ID
   */
  async getCommandeById(salesforceId) {
    await this.ensureAuthenticated();

    console.log(`Récupération commande ${salesforceId}...`);

    const commande = this.mockCommandes.find((c) => c.Id === salesforceId);

    if (!commande) {
      console.log("Commande non trouvée\n");
      return {
        totalSize: 0,
        done: true,
        records: [],
      };
    }

    console.log("Commande trouvée\n");

    return {
      totalSize: 1,
      done: true,
      records: [commande],
    };
  }

  /**
   * Tester la connexion
   */
  async testConnection() {
    try {
      console.log("╔═══════════════════════════════════════════════════════╗");
      console.log("║     TEST CONNEXION SALESFORCE MOCK                   ║");
      console.log(
        "╚═══════════════════════════════════════════════════════╝\n"
      );

      await this.authenticate();

      console.log("Connexion MOCK OK");
      console.log(
        `   Nombre de commandes simulées: ${this.mockCommandes.length}\n`
      );

      return {
        success: true,
        commandesCount: this.mockCommandes.length,
        instanceUrl: this.instanceUrl,
      };
    } catch (error) {
      console.error("Test connexion MOCK échoué:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtenir les statistiques
   */
  async getStats() {
    await this.ensureAuthenticated();

    console.log("Calcul des statistiques MOCK...");

    const stats = {
      total: this.mockCommandes.length,
      "En préparation": this.mockCommandes.filter(
        (c) => c.Etat__c === "En préparation"
      ).length,
      Expédié: this.mockCommandes.filter((c) => c.Etat__c === "Expédié").length,
      Livré: this.mockCommandes.filter((c) => c.Etat__c === "Livré").length,
      Annulé: this.mockCommandes.filter((c) => c.Etat__c === "Annulé").length,
    };

    console.log("Statistiques calculées\n");

    return stats;
  }

  /**
   * Ajouter une nouvelle commande MOCK (utile pour les tests)
   */
  addMockCommande(commande) {
    const newId = `SF${String(this.mockCommandes.length + 1).padStart(
      15,
      "0"
    )}AAA`;
    const now = new Date().toISOString();

    const fullCommande = {
      Id: newId,
      NumCommande__c:
        commande.NumCommande__c ||
        `CMD-${String(this.mockCommandes.length + 1).padStart(4, "0")}`,
      Montant__c: commande.Montant__c || 0,
      Etat__c: commande.Etat__c || "En préparation",
      Descriptions__c: commande.Descriptions__c || "",
      ClientNom__c: commande.ClientNom__c || "Client Test",
      CreatedDate: now,
      LastModifiedDate: now,
    };

    this.mockCommandes.push(fullCommande);
    console.log(`Commande MOCK ajoutée: ${fullCommande.NumCommande__c}`);

    return fullCommande;
  }

  /**
   * Mettre à jour une commande MOCK
   */
  updateMockCommande(salesforceId, updates) {
    const index = this.mockCommandes.findIndex((c) => c.Id === salesforceId);

    if (index === -1) {
      throw new Error(`Commande ${salesforceId} non trouvée`);
    }

    this.mockCommandes[index] = {
      ...this.mockCommandes[index],
      ...updates,
      LastModifiedDate: new Date().toISOString(),
    };

    console.log(
      `Commande MOCK mise à jour: ${this.mockCommandes[index].NumCommande__c}`
    );

    return this.mockCommandes[index];
  }
}

// Export instance unique (Singleton)
module.exports = new SalesforceServiceMock();
