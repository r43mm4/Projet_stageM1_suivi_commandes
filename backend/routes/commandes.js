/**
 * ═══════════════════════════════════════════════════════════════
 * ROUTES API - COMMANDES
 * ═══════════════════════════════════════════════════════════════
 */

const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../lib/database");
const syncService = require("../services/syncService");

// ═══════════════════════════════════════════════════════════════
// ROUTES SPÉCIFIQUES (DOIVENT ÊTRE AVANT LES ROUTES DYNAMIQUES)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/sync - Synchronisation manuelle (Story 4.4)
 */
router.post("/admin/sync", async (req, res) => {
  try {
    console.log("\n📡 Endpoint /admin/sync appelé");

    const result = await syncService.syncWithRetry(3);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    console.error("❌ Erreur /admin/sync:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/stats - Statistiques de synchronisation
 */
router.get("/admin/stats", (req, res) => {
  try {
    const stats = syncService.getStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    console.error("❌ Erreur /admin/stats:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// ROUTES CRUD COMMANDES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/commandes - Récupérer toutes les commandes
 */
router.get("/commandes", async (req, res) => {
  try {
    console.log("\n📡 GET /api/commandes appelé");

    const pool = await poolPromise;

    // Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    // Filtres
    const whereClauses = [];
    const params = [];

    // Filtre par client (IMPORTANT pour l'espace client)
    if (req.query.clientId) {
      whereClauses.push("c.ClientId = @clientId");
      params.push({
        name: "clientId",
        type: sql.Int,
        value: parseInt(req.query.clientId),
      });
      console.log(`   Filtre client: ${req.query.clientId}`);
    }

    // Filtre par état
    if (req.query.etat) {
      whereClauses.push("c.Etat = @etat");
      params.push({
        name: "etat",
        type: sql.NVarChar(50),
        value: req.query.etat,
      });
    }

    const whereClause =
      whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    // Requête principale
    const query = `
      SELECT 
        c.CommandeId,
        c.NumCommande,
        c.MontantTotal,
        c.Etat,
        c.Descriptions,
        c.DateCommande,
        c.DerniereSynchro,
        c.SalesforceId,
        cl.NomClient,
        cl.Email
      FROM Commandes c
      LEFT JOIN Clients cl ON c.ClientId = cl.ClientId
      ${whereClause}
      ORDER BY c.DateCommande DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool.request();
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);
    params.forEach((p) => request.input(p.name, p.type, p.value));

    const result = await request.query(query);

    // Compter le total
    const countQuery = `SELECT COUNT(*) AS Total FROM Commandes ${whereClause}`;
    const countRequest = pool.request();
    params.forEach((p) => countRequest.input(p.name, p.type, p.value));
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].Total;

    console.log(
      `✅ ${result.recordset.length} commandes retournées (page ${page})`
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Erreur GET /commandes:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la récupération des commandes",
    });
  }
});

/**
 * GET /api/commandes/stats - Statistiques des commandes
 */
router.get("/commandes/stats", async (req, res) => {
  try {
    console.log("\n📡 GET /api/commandes/stats appelé");

    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS Total,
        SUM(CASE WHEN Etat = 'En préparation' THEN 1 ELSE 0 END) AS EnPreparation,
        SUM(CASE WHEN Etat = 'Expédié' THEN 1 ELSE 0 END) AS Expedie,
        SUM(CASE WHEN Etat = 'Livré' THEN 1 ELSE 0 END) AS Livre,
        SUM(CASE WHEN Etat = 'Annulé' THEN 1 ELSE 0 END) AS Annule,
        SUM(MontantTotal) AS MontantTotal,
        AVG(MontantTotal) AS MontantMoyen
      FROM Commandes
    `);

    const stats = result.recordset[0];

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        total: stats.Total,
        parEtat: {
          "En préparation": stats.EnPreparation,
          Expédié: stats.Expedie,
          Livré: stats.Livre,
          Annulé: stats.Annule,
        },
        montantTotal: stats.MontantTotal,
        montantMoyen: stats.MontantMoyen,
      },
    });
  } catch (error) {
    console.error("❌ Erreur GET /commandes/stats:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la récupération des statistiques",
    });
  }
});

/**
 * GET /api/commandes/:id - Récupérer une commande par ID
 */
router.get("/commandes/:id", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);

    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "ID de commande invalide",
      });
    }

    console.log(`\n📡 GET /api/commandes/${commandeId} appelé`);

    const pool = await poolPromise;

    const result = await pool.request().input("commandeId", sql.Int, commandeId)
      .query(`
        SELECT 
          c.CommandeId,
          c.NumCommande,
          c.MontantTotal,
          c.Etat,
          c.Descriptions,
          c.DateCommande,
          c.DerniereSynchro,
          c.SalesforceId,
          cl.NomClient,
          cl.Email,
          cl.Telephone,
          cl.Adresse
        FROM Commandes c
        LEFT JOIN Clients cl ON c.ClientId = cl.ClientId
        WHERE c.CommandeId = @commandeId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvée",
      });
    }

    console.log(`✅ Commande ${commandeId} trouvée`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("❌ Erreur GET /commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la récupération de la commande",
    });
  }
});

/**
 * POST /api/commandes - Créer une nouvelle commande
 */
router.post("/commandes", async (req, res) => {
  try {
    console.log("\n📡 POST /api/commandes appelé");

    const { NumCommande, ClientId, MontantTotal, Etat, Descriptions } =
      req.body;

    // Validation
    const errors = {};
    if (!NumCommande) errors.NumCommande = "Numéro de commande requis";
    if (!ClientId) errors.ClientId = "Client requis";
    if (!MontantTotal || MontantTotal <= 0)
      errors.MontantTotal = "Montant invalide";
    if (!Etat) errors.Etat = "État requis";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        errors,
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("numCommande", sql.NVarChar(20), NumCommande)
      .input("clientId", sql.Int, ClientId)
      .input("montantTotal", sql.Decimal(10, 2), MontantTotal)
      .input("etat", sql.NVarChar(50), Etat)
      .input("descriptions", sql.NVarChar(500), Descriptions || null).query(`
        INSERT INTO Commandes (
          NumCommande, ClientId, MontantTotal, Etat, Descriptions, 
          DateCommande, CreePar
        )
        OUTPUT INSERTED.*
        VALUES (
          @numCommande, @clientId, @montantTotal, @etat, @descriptions,
          GETDATE(), 'API'
        )
      `);

    console.log(`✅ Commande créée: ${NumCommande}`);

    res.status(201).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("❌ Erreur POST /commandes:", error.message);

    if (error.number === 2627) {
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
    });
  }
});

/**
 * PUT /api/commandes/:id/status - Mettre à jour le statut d'une commande
 */
router.put("/commandes/:id/status", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);
    const { nouveauStatut } = req.body;

    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "ID de commande invalide",
      });
    }

    if (!nouveauStatut) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Nouveau statut requis",
      });
    }

    const statutsValides = ["En préparation", "Expédié", "Livré", "Annulé"];
    if (!statutsValides.includes(nouveauStatut)) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: `Statut invalide. Valeurs acceptées: ${statutsValides.join(
          ", "
        )}`,
      });
    }

    console.log(`\n📡 PUT /api/commandes/${commandeId}/status appelé`);
    console.log(`   Nouveau statut: ${nouveauStatut}`);

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("commandeId", sql.Int, commandeId)
      .input("nouveauStatut", sql.NVarChar(50), nouveauStatut).query(`
        UPDATE Commandes
        SET 
          Etat = @nouveauStatut,
          DerniereModification = GETDATE(),
          DerniereModificationPar = 'API'
        WHERE CommandeId = @commandeId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvée",
      });
    }

    console.log(`✅ Statut mis à jour pour commande ${commandeId}`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Statut mis à jour avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur PUT /commandes/:id/status:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la mise à jour du statut",
    });
  }
});

/**
 * DELETE /api/commandes/:id - Supprimer une commande
 */
router.delete("/commandes/:id", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);

    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "ID de commande invalide",
      });
    }

    console.log(`\n📡 DELETE /api/commandes/${commandeId} appelé`);

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("commandeId", sql.Int, commandeId)
      .query("DELETE FROM Commandes WHERE CommandeId = @commandeId");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvée",
      });
    }

    console.log(`✅ Commande ${commandeId} supprimée`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Commande supprimée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur DELETE /commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la suppression de la commande",
    });
  }
});

module.exports = router;
