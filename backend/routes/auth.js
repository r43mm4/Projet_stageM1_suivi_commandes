const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../lib/database");

// ==================== LOGIN CLIENT ====================
router.post("/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    console.log(`Tentative de connexion: ${email}`);

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    // Rechercher le client
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("email", sql.NVarChar(100), email)
      .input("motDePasse", sql.NVarChar(255), motDePasse).query(`
        SELECT ClientId, Email, Prenom, Nom, Telephone, Entreprise
        FROM Clients
        WHERE Email = @email AND MotDePasse = @motDePasse
      `);

    if (result.recordset.length === 0) {
      console.log(`Connexion échouée: identifiants incorrects`);
      return res.status(401).json({
        success: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    const client = result.recordset[0];

    // Mettre à jour LastLogin
    await pool
      .request()
      .input("clientId", sql.Int, client.ClientId)
      .query(
        "UPDATE Clients SET LastLogin = GETDATE() WHERE ClientId = @clientId"
      );

    console.log(`Connexion réussie: ${client.Prenom} ${client.Nom}`);

    // Retourner les infos du client (sans le mot de passe)
    res.json({
      success: true,
      data: {
        clientId: client.ClientId,
        email: client.Email,
        prenom: client.Prenom,
        nom: client.Nom,
        telephone: client.Telephone,
        entreprise: client.Entreprise,
      },
    });
  } catch (error) {
    console.error("Erreur login:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// ==================== GET COMMANDES DU CLIENT ====================
router.get("/mes-commandes/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    console.log(`Récupération commandes pour client ${clientId}`);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID client invalide",
      });
    }

    const pool = await poolPromise;
    const result = await pool.request().input("clientId", sql.Int, clientId)
      .query(`
        SELECT 
          CommandeId, 
          NumCommande, 
          Montant, 
          Etat, 
          Descriptions, 
          CreatedAt, 
          LastSyncedAt
        FROM Commandes
        WHERE ClientId = @clientId
        ORDER BY CreatedAt DESC
      `);

    console.log(`${result.recordset.length} commandes trouvées`);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Erreur récupération commandes:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// ==================== GET DÉTAILS COMMANDE ====================
router.get("/commande/:commandeId/:clientId", async (req, res) => {
  try {
    const commandeId = parseInt(req.params.commandeId);
    const clientId = parseInt(req.params.clientId);

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("commandeId", sql.Int, commandeId)
      .input("clientId", sql.Int, clientId).query(`
        SELECT * FROM Commandes
        WHERE CommandeId = @commandeId AND ClientId = @clientId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Commande non trouvée",
      });
    }

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Erreur:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

module.exports = router;
