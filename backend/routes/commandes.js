// ==================== IMPORTS ====================
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../lib/database");

// ==================== GET /api/commandes - LISTE TOUTES LES COMMANDES ====================
router.get("/", async (req, res) => {
  try {
    console.log("📥 GET /api/commandes appelé");

    // Récupérer les paramètres de query
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
    const offset = (page - 1) * limit;
    const status = req.query.status; // Filtrage par statut (optionnel)
    const search = req.query.search; // Recherche par numéro (optionnel)

    console.log(
      `   Page: ${page}, Limit: ${limit}, Status: ${
        status || "tous"
      }, Search: ${search || "aucun"}`
    );

    // Connexion à la base de données
    const pool = await poolPromise;
    const request = pool.request();

    // Construire la query SQL dynamiquement
    let whereClause = "";
    let params = [];

    // Filtre par statut
    if (status) {
      whereClause = "WHERE Etat = @status";
      request.input("status", sql.NVarChar(50), status);
    }

    // Filtre par recherche (numéro de commande)
    if (search) {
      whereClause = whereClause
        ? `${whereClause} AND NumCommande LIKE @search`
        : "WHERE NumCommande LIKE @search";
      request.input("search", sql.NVarChar(20), `%${search}%`);
    }

    // Query SQL avec pagination
    const query = `
      SELECT * FROM Commandes
      ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    // Ajouter les paramètres de pagination
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);

    // Exécuter la query
    const result = await request.query(query);

    // Compter le total (pour la pagination)
    const countRequest = pool.request();
    if (status) countRequest.input("status", sql.NVarChar(50), status);
    if (search) countRequest.input("search", sql.NVarChar(20), `%${search}%`);

    const countQuery = `SELECT COUNT(*) AS Total FROM Commandes ${whereClause}`;
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].Total;

    console.log(
      `   ✅ ${result.recordset.length} commandes récupérées (Total: ${total})`
    );

    // Réponse JSON
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    console.error("❌ Erreur GET /api/commandes:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la récupération des commandes",
      message: error.message,
    });
  }
});

// ==================== GET /api/commandes/:id - UNE COMMANDE SPÉCIFIQUE ====================
router.get("/:id", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);

    console.log(`📥 GET /api/commandes/${commandeId} appelé`);

    // Validation de l'ID
    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "ID de commande invalide",
      });
    }

    // Connexion à la base de données
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, commandeId)
      .query("SELECT * FROM Commandes WHERE CommandeId = @id");

    // Vérifier si la commande existe
    if (result.recordset.length === 0) {
      console.log(`   ⚠️  Commande ${commandeId} non trouvée`);
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvée",
      });
    }

    console.log(`   ✅ Commande ${commandeId} trouvée`);

    // Réponse JSON
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("❌ Erreur GET /api/commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la récupération de la commande",
      message: error.message,
    });
  }
});

// ==================== POST /api/commandes - CRÉER UNE NOUVELLE COMMANDE ====================
router.post("/", async (req, res) => {
  try {
    console.log("📥 POST /api/commandes appelé");
    console.log("   Body:", req.body);

    // Extraction des données
    const { NumCommande, Montant, Etat, Descriptions } = req.body;

    // Validation des champs requis
    const errors = {};

    if (!NumCommande || NumCommande.length < 3) {
      errors.NumCommande =
        "Le numéro de commande doit contenir au moins 3 caractères";
    }

    if (!Montant || Montant <= 0) {
      errors.Montant = "Le montant doit être supérieur à 0";
    }

    const validStatuses = ["En préparation", "Expédié", "Livré", "Annulé"];
    if (!Etat || !validStatuses.includes(Etat)) {
      errors.Etat = `L'état doit être: ${validStatuses.join(", ")}`;
    }

    // Si des erreurs de validation
    if (Object.keys(errors).length > 0) {
      console.log("   ❌ Erreurs de validation:", errors);
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        errors: errors,
      });
    }

    // Connexion à la base de données
    const pool = await poolPromise;

    // Insérer la commande
    const result = await pool
      .request()
      .input("salesforceId", sql.NVarChar(50), `MANUAL-${Date.now()}`) // ID temporaire
      .input("numCmd", sql.NVarChar(20), NumCommande)
      .input("montant", sql.Decimal(10, 2), Montant)
      .input("etat", sql.NVarChar(50), Etat)
      .input("desc", sql.NVarChar(500), Descriptions || null).query(`
        INSERT INTO Commandes (SalesforceId, NumCommande, Montant, Etat, Descriptions, CreatedAt, LastSyncedAt)
        OUTPUT INSERTED.*
        VALUES (@salesforceId, @numCmd, @montant, @etat, @desc, GETDATE(), GETDATE())
      `);

    const nouvelleCommande = result.recordset[0];

    console.log(
      `   ✅ Commande créée: ${nouvelleCommande.CommandeId} - ${nouvelleCommande.NumCommande}`
    );

    // Réponse JSON
    res.status(201).json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Commande créée avec succès",
      data: nouvelleCommande,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/commandes:", error.message);

    // Erreur de contrainte UNIQUE (numéro de commande déjà existant)
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Ce numéro de commande existe déjà",
      });
    }

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la création de la commande",
      message: error.message,
    });
  }
});

// ==================== PUT /api/commandes/:id/status - MODIFIER LE STATUT ====================
router.put("/:id/status", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);
    const { newStatus } = req.body;

    console.log(`📥 PUT /api/commandes/${commandeId}/status appelé`);
    console.log(`   Nouveau statut: ${newStatus}`);

    // Validation de l'ID
    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID de commande invalide",
      });
    }

    // Validation du statut
    const validStatuses = ["En préparation", "Expédié", "Livré", "Annulé"];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être: ${validStatuses.join(", ")}`,
      });
    }

    // Connexion à la base de données
    const pool = await poolPromise;

    // Vérifier que la commande existe
    const checkResult = await pool
      .request()
      .input("id", sql.Int, commandeId)
      .query(
        "SELECT CommandeId, NumCommande, Etat FROM Commandes WHERE CommandeId = @id"
      );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Commande non trouvée",
      });
    }

    const ancienStatut = checkResult.recordset[0].Etat;

    // Mettre à jour le statut
    await pool
      .request()
      .input("id", sql.Int, commandeId)
      .input("newStatus", sql.NVarChar(50), newStatus).query(`
        UPDATE Commandes 
        SET Etat = @newStatus, LastSyncedAt = GETDATE()
        WHERE CommandeId = @id
      `);

    console.log(`   ✅ Statut modifié: ${ancienStatut} → ${newStatus}`);

    // Réponse JSON
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Statut modifié avec succès",
      data: {
        commandeId: commandeId,
        ancienStatut: ancienStatut,
        nouveauStatut: newStatus,
      },
    });
  } catch (error) {
    console.error("❌ Erreur PUT /api/commandes/:id/status:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la modification du statut",
      message: error.message,
    });
  }
});

// ==================== DELETE /api/commandes/:id - SUPPRIMER UNE COMMANDE ====================
router.delete("/:id", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);

    console.log(`📥 DELETE /api/commandes/${commandeId} appelé`);

    // Validation de l'ID
    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID de commande invalide",
      });
    }

    // Connexion à la base de données
    const pool = await poolPromise;

    // Vérifier que la commande existe
    const checkResult = await pool
      .request()
      .input("id", sql.Int, commandeId)
      .query(
        "SELECT CommandeId, NumCommande FROM Commandes WHERE CommandeId = @id"
      );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Commande non trouvée",
      });
    }

    const numCommande = checkResult.recordset[0].NumCommande;

    // Supprimer la commande
    await pool
      .request()
      .input("id", sql.Int, commandeId)
      .query("DELETE FROM Commandes WHERE CommandeId = @id");

    console.log(`   ✅ Commande supprimée: ${commandeId} - ${numCommande}`);

    // Réponse JSON
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Commande supprimée avec succès",
      data: {
        commandeId: commandeId,
        numCommande: numCommande,
      },
    });
  } catch (error) {
    console.error("❌ Erreur DELETE /api/commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression de la commande",
      message: error.message,
    });
  }
});

// ==================== EXPORT ====================
module.exports = router;
