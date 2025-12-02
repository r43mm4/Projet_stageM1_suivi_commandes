/**
 * ═══════════════════════════════════════════════════════════════
 * NOTIFICATIONS API - EPIC 5 - Story 5.1
 * Intégration du service email avec l'API backend
 * Compatible avec la table Notifications existante
 * ═══════════════════════════════════════════════════════════════
 */

const express = require("express");
const router = express.Router();
const emailService = require("../services/emailService");
const pool = require("../db"); // Votre connexion à la base de données

/**
 * ═══════════════════════════════════════════════════════════════
 * FONCTIONS UTILITAIRES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Middleware - Envoi automatique d'emails lors du changement de statut
 * Récupère les informations de la commande et envoie l'email
 */
async function sendStatusChangeNotification(orderId, oldStatus, newStatus) {
  try {
    // Récupérer les détails complets de la commande avec le client
    const [rows] = await pool.query(
      `
      SELECT 
        c.CommandeId,
        c.NumCommande,
        c.DateCommande,
        c.MontantTotal,
        c.Etat as Statut,
        c.Descriptions,
        cl.NomClient,
        cl.Email as ClientEmail,
        cl.Telephone as ClientTel
      FROM Commandes c
      LEFT JOIN Clients cl ON c.ClientId = cl.ClientId
      WHERE c.CommandeId = ?
    `,
      [orderId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ Order ${orderId} not found for notification`);
      return { success: false, error: "Order not found" };
    }

    const order = rows[0];

    // Vérifier qu'un email existe
    if (!order.ClientEmail) {
      console.warn(`⚠️ No email found for order ${order.NumCommande}`);
      return { success: false, error: "No email address" };
    }

    // Créer une entrée de notification AVANT l'envoi
    const notificationId = await createNotification(
      orderId,
      order.ClientEmail,
      newStatus,
      "En attente"
    );

    // Envoyer l'email de notification
    const result = await emailService.sendOrderStatusNotification(
      order,
      oldStatus,
      newStatus
    );

    // Mettre à jour le statut de la notification
    await updateNotificationStatus(
      notificationId,
      result.success ? "Envoyé" : "Échoué",
      result.error || null
    );

    return {
      ...result,
      notificationId,
    };
  } catch (error) {
    console.error("❌ Notification error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Créer une entrée de notification dans la base de données
 */
async function createNotification(
  commandeId,
  destinataire,
  statutDeclencheur,
  statutEnvoi
) {
  try {
    const message = `Notification de changement de statut: ${statutDeclencheur}`;

    const [result] = await pool.query(
      `
      INSERT INTO Notifications 
      (CommandeId, TypeNotification, Destinataire, Message, StatutDeclencheur, StatutEnvoi, Proprietaire, CreePar)
      VALUES (?, 'Email', ?, ?, ?, ?, 'System', 'System')
    `,
      [commandeId, destinataire, message, statutDeclencheur, statutEnvoi]
    );

    return result.insertId;
  } catch (error) {
    console.error("❌ Failed to create notification:", error);
    throw error;
  }
}

/**
 * Mettre à jour le statut d'une notification
 */
async function updateNotificationStatus(
  notificationId,
  statutEnvoi,
  erreurMessage = null
) {
  try {
    await pool.query(
      `
      UPDATE Notifications 
      SET 
        StatutEnvoi = ?,
        DateEnvoi = GETDATE(),
        ErreurMessage = ?,
        DerniereModification = GETDATE(),
        DerniereModificationPar = 'System'
      WHERE NotificationId = ?
    `,
      [statutEnvoi, erreurMessage, notificationId]
    );
  } catch (error) {
    console.error("❌ Failed to update notification status:", error);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * ROUTES API
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * PUT /api/commandes/:id/statut
 * Mettre à jour le statut d'une commande ET envoyer une notification
 */
router.put("/commandes/:id/statut", async (req, res) => {
  const { id } = req.params;
  const { statut, sendNotification = true } = req.body;

  try {
    // Récupérer l'ancien statut
    const [current] = await pool.query(
      "SELECT Etat FROM Commandes WHERE CommandeId = ?",
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Commande non trouvée",
      });
    }

    const oldStatus = current[0].Etat;

    // Mettre à jour le statut
    await pool.query(
      "UPDATE Commandes SET Etat = ?, DerniereModification = GETDATE() WHERE CommandeId = ?",
      [statut, id]
    );

    // Envoyer la notification si demandé et si le statut a changé
    let notificationResult = null;
    if (sendNotification && statut !== oldStatus) {
      notificationResult = await sendStatusChangeNotification(
        id,
        oldStatus,
        statut
      );
    }

    res.json({
      success: true,
      message: "Statut mis à jour avec succès",
      oldStatus,
      newStatus: statut,
      notification: notificationResult,
    });
  } catch (error) {
    console.error("❌ Status update error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/test
 * Envoyer un email de test
 */
router.post("/notifications/test", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email requis",
    });
  }

  try {
    const result = await emailService.sendTestEmail(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/resend/:orderId
 * Renvoyer une notification pour une commande
 */
router.post("/notifications/resend/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    // Récupérer la commande avec les infos client
    const [rows] = await pool.query(
      `
      SELECT 
        c.CommandeId,
        c.NumCommande,
        c.Etat as Statut,
        c.MontantTotal,
        c.Descriptions,
        cl.NomClient,
        cl.Email as ClientEmail
      FROM Commandes c
      LEFT JOIN Clients cl ON c.ClientId = cl.ClientId
      WHERE c.CommandeId = ?
    `,
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Commande non trouvée",
      });
    }

    const order = rows[0];

    if (!order.ClientEmail) {
      return res.status(400).json({
        success: false,
        error: "Aucun email associé à cette commande",
      });
    }

    // Créer une notification de renvoi
    const notificationId = await createNotification(
      orderId,
      order.ClientEmail,
      order.Statut,
      "En attente"
    );

    // Renvoyer la notification avec le statut actuel
    const result = await emailService.sendOrderStatusNotification(
      order,
      order.Statut,
      order.Statut
    );

    // Mettre à jour le statut
    await updateNotificationStatus(
      notificationId,
      result.success ? "Envoyé" : "Échoué",
      result.error || null
    );

    res.json({
      ...result,
      notificationId,
    });
  } catch (error) {
    console.error("❌ Resend error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/history/:orderId
 * Récupérer l'historique des notifications pour une commande
 */
router.get("/notifications/history/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        NotificationId,
        TypeNotification,
        Destinataire,
        Message,
        StatutDeclencheur,
        StatutEnvoi,
        DateEnvoi,
        ErreurMessage,
        DateCreation
      FROM Notifications
      WHERE CommandeId = ?
      ORDER BY DateCreation DESC
    `,
      [orderId]
    );

    res.json({
      success: true,
      count: rows.length,
      notifications: rows,
    });
  } catch (error) {
    console.error("❌ History error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/stats
 * Statistiques sur les notifications envoyées (30 derniers jours)
 */
router.get("/notifications/stats", async (req, res) => {
  try {
    // Stats globales
    const [globalStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN StatutEnvoi = 'Envoyé' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN StatutEnvoi = 'Échoué' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN StatutEnvoi = 'En attente' THEN 1 ELSE 0 END) as pending
      FROM Notifications
      WHERE DateCreation >= DATEADD(DAY, -30, GETDATE())
    `);

    // Stats par jour (7 derniers jours)
    const [dailyStats] = await pool.query(`
      SELECT 
        CAST(DateCreation AS DATE) as date,
        COUNT(*) as total,
        SUM(CASE WHEN StatutEnvoi = 'Envoyé' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN StatutEnvoi = 'Échoué' THEN 1 ELSE 0 END) as failed
      FROM Notifications
      WHERE DateCreation >= DATEADD(DAY, -7, GETDATE())
      GROUP BY CAST(DateCreation AS DATE)
      ORDER BY date DESC
    `);

    // Stats par statut déclencheur
    const [statusStats] = await pool.query(`
      SELECT 
        StatutDeclencheur,
        COUNT(*) as count,
        SUM(CASE WHEN StatutEnvoi = 'Envoyé' THEN 1 ELSE 0 END) as success
      FROM Notifications
      WHERE DateCreation >= DATEADD(DAY, -30, GETDATE())
      GROUP BY StatutDeclencheur
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      period: "30 derniers jours",
      global: globalStats[0],
      daily: dailyStats,
      byStatus: statusStats,
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/recent
 * Liste des notifications récentes (toutes commandes)
 */
router.get("/notifications/recent", async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  try {
    const [rows] = await pool.query(
      `
      SELECT TOP (?)
        n.NotificationId,
        n.CommandeId,
        c.NumCommande,
        n.TypeNotification,
        n.Destinataire,
        n.StatutDeclencheur,
        n.StatutEnvoi,
        n.DateEnvoi,
        n.DateCreation,
        n.ErreurMessage
      FROM Notifications n
      LEFT JOIN Commandes c ON n.CommandeId = c.CommandeId
      ORDER BY n.DateCreation DESC
    `,
      [limit]
    );

    res.json({
      success: true,
      count: rows.length,
      notifications: rows,
    });
  } catch (error) {
    console.error("❌ Recent notifications error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification (optionnel - pour le nettoyage)
 */
router.delete("/notifications/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM Notifications WHERE NotificationId = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification non trouvée",
      });
    }

    res.json({
      success: true,
      message: "Notification supprimée",
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════
 * EXPORT
 * ═══════════════════════════════════════════════════════════════
 */

module.exports = router;
module.exports.sendStatusChangeNotification = sendStatusChangeNotification;
