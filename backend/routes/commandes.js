/**
 * ROUTES API - COMMANDES
 * FIX FORCE: Mapping manuel du ClientId dans la reponse
 */

const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../lib/database");
const syncService = require("../services/syncService");

router.post("/admin/sync", async (req, res) => {
  try {
    console.log("\nEndpoint /admin/sync appele");
    const result = await syncService.syncWithRetry(3);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    console.error("Erreur /admin/sync:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

router.get("/admin/stats", (req, res) => {
  try {
    const stats = syncService.getStats();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    console.error("Erreur /admin/stats:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/commandes
 * FIX: Mapping manuel du ClientId dans chaque enregistrement
 */
router.get("/commandes", async (req, res) => {
  try {
    console.log("\n========================================");
    console.log("GET /api/commandes appele");
    console.log("Query params:", req.query);

    const pool = await poolPromise;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    if (req.query.clientId) {
      const clientIdValue = parseInt(req.query.clientId);
      console.log("FILTRE CLIENT:", clientIdValue);
      whereClauses.push("c.ClientId = @clientId");
      params.push({
        name: "clientId",
        type: sql.Int,
        value: clientIdValue,
      });
    }

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

    console.log("WHERE clause:", whereClause);

    const query = `
      SELECT 
        c.CommandeId,
        c.NumCommande,
        c.ClientId,
        c.MontantTotal,
        c.Etat,
        c.Descriptions,
        c.DateCommande,
        c.DerniereModification AS DerniereModif,
        c.DerniereSynchro,
        c.SalesforceId,
        cl.NomClient,
        cl.Email
      FROM [dbo].[Commandes] c
      LEFT JOIN [dbo].[Clients] cl ON c.ClientId = cl.ClientId
      ${whereClause}
      ORDER BY c.DateCommande DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    console.log("Query SQL complete");

    const request = pool.request();
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);

    params.forEach((p) => {
      console.log("Parametre:", p.name, "=", p.value);
      request.input(p.name, p.type, p.value);
    });

    const result = await request.query(query);

    console.log("Resultat brut:");
    console.log("  Lignes:", result.recordset.length);

    if (result.recordset.length > 0) {
      console.log("  Colonnes disponibles:", Object.keys(result.recordset[0]));
      console.log("  Premier enregistrement BRUT:", result.recordset[0]);
    }

    // FIX CRITIQUE: Mapper manuellement le ClientId
    const mappedData = result.recordset.map((row) => {
      // Tenter plusieurs variations du nom de colonne
      const clientId =
        row.ClientId || row.clientId || row.CLIENTID || row.ClientID || null;

      console.log(
        "Mapping ligne:",
        row.NumCommande,
        "ClientId original:",
        row.ClientId,
        "Mappe vers:",
        clientId
      );

      return {
        CommandeId: row.CommandeId,
        NumCommande: row.NumCommande,
        ClientId: clientId,
        MontantTotal: row.MontantTotal,
        Etat: row.Etat,
        Descriptions: row.Descriptions,
        DateCommande: row.DateCommande,
        DerniereModif: row.DerniereModif,
        DerniereSynchro: row.DerniereSynchro,
        SalesforceId: row.SalesforceId,
        NomClient: row.NomClient,
        Email: row.Email,
      };
    });

    console.log("Donnees mappees:");
    if (mappedData.length > 0) {
      console.log("  Premiere ligne mappee:", mappedData[0]);
      console.log(
        "  ClientId de la premiere ligne mappee:",
        mappedData[0].ClientId
      );
    }

    // Compter le total
    const countQuery = `SELECT COUNT(*) AS Total FROM [dbo].[Commandes] c ${whereClause}`;
    const countRequest = pool.request();
    params.forEach((p) => countRequest.input(p.name, p.type, p.value));
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].Total;

    console.log("Total:", total);
    console.log("========================================\n");

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: mappedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ERREUR GET /commandes:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la recuperation des commandes",
    });
  }
});

router.get("/commandes/stats", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS Total,
        SUM(CASE WHEN Etat = 'En preparation' THEN 1 ELSE 0 END) AS EnPreparation,
        SUM(CASE WHEN Etat = 'Expedie' THEN 1 ELSE 0 END) AS Expedie,
        SUM(CASE WHEN Etat = 'Livre' THEN 1 ELSE 0 END) AS Livre,
        SUM(CASE WHEN Etat = 'Annule' THEN 1 ELSE 0 END) AS Annule,
        SUM(MontantTotal) AS MontantTotal,
        AVG(MontantTotal) AS MontantMoyen
      FROM [dbo].[Commandes]
    `);

    const stats = result.recordset[0];

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        total: stats.Total,
        parEtat: {
          "En preparation": stats.EnPreparation,
          Expedie: stats.Expedie,
          Livre: stats.Livre,
          Annule: stats.Annule,
        },
        montantTotal: stats.MontantTotal,
        montantMoyen: stats.MontantMoyen,
      },
    });
  } catch (error) {
    console.error("Erreur GET /commandes/stats:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la recuperation des statistiques",
    });
  }
});

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

    const pool = await poolPromise;

    const result = await pool.request().input("commandeId", sql.Int, commandeId)
      .query(`
        SELECT 
          c.CommandeId,
          c.NumCommande,
          c.ClientId,
          c.MontantTotal,
          c.Etat,
          c.Descriptions,
          c.DateCommande,
          c.DerniereModification AS DerniereModif,
          c.DerniereSynchro,
          c.SalesforceId,
          cl.NomClient,
          cl.Email,
          cl.Telephone,
          cl.Adresse
        FROM [dbo].[Commandes] c
        LEFT JOIN [dbo].[Clients] cl ON c.ClientId = cl.ClientId
        WHERE c.CommandeId = @commandeId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvee",
      });
    }

    const row = result.recordset[0];
    const mappedData = {
      CommandeId: row.CommandeId,
      NumCommande: row.NumCommande,
      ClientId: row.ClientId || row.clientId || row.CLIENTID || null,
      MontantTotal: row.MontantTotal,
      Etat: row.Etat,
      Descriptions: row.Descriptions,
      DateCommande: row.DateCommande,
      DerniereModif: row.DerniereModif,
      DerniereSynchro: row.DerniereSynchro,
      SalesforceId: row.SalesforceId,
      NomClient: row.NomClient,
      Email: row.Email,
      Telephone: row.Telephone,
      Adresse: row.Adresse,
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: mappedData,
    });
  } catch (error) {
    console.error("Erreur GET /commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la recuperation de la commande",
    });
  }
});

router.post("/commandes", async (req, res) => {
  try {
    const { NumCommande, ClientId, MontantTotal, Etat, Descriptions } =
      req.body;

    const errors = {};
    if (!NumCommande) errors.NumCommande = "Numero de commande requis";
    if (!ClientId) errors.ClientId = "Client requis";
    if (!MontantTotal || MontantTotal <= 0)
      errors.MontantTotal = "Montant invalide";
    if (!Etat) errors.Etat = "Etat requis";

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
        INSERT INTO [dbo].[Commandes] (
          NumCommande, ClientId, MontantTotal, Etat, Descriptions, 
          DateCommande, CreePar
        )
        OUTPUT INSERTED.*
        VALUES (
          @numCommande, @clientId, @montantTotal, @etat, @descriptions,
          GETDATE(), 'API'
        )
      `);

    res.status(201).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Erreur POST /commandes:", error.message);

    if (error.number === 2627) {
      return res.status(409).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Ce numero de commande existe deja",
      });
    }

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la creation de la commande",
    });
  }
});

router.put("/commandes/:id/status", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.id);
    const { newStatus, nouveauStatut } = req.body;

    const statut = newStatus || nouveauStatut;

    if (isNaN(commandeId) || commandeId <= 0) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "ID de commande invalide",
      });
    }

    if (!statut) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Nouveau statut requis",
      });
    }

    const statutsValides = ["En preparation", "Expedie", "Livre", "Annule"];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Statut invalide",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("commandeId", sql.Int, commandeId)
      .input("nouveauStatut", sql.NVarChar(50), statut).query(`
        UPDATE [dbo].[Commandes]
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
        error: "Commande non trouvee",
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Statut mis a jour avec succes",
    });
  } catch (error) {
    console.error("Erreur PUT /commandes/:id/status:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la mise a jour du statut",
    });
  }
});

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

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("commandeId", sql.Int, commandeId)
      .query("DELETE FROM [dbo].[Commandes] WHERE CommandeId = @commandeId");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: "Commande non trouvee",
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Commande supprimee avec succes",
    });
  } catch (error) {
    console.error("Erreur DELETE /commandes/:id:", error.message);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: "Erreur lors de la suppression de la commande",
    });
  }
});

module.exports = router;
