/**
 * ═══════════════════════════════════════════════════════════════
 * EMAIL SERVICE - EPIC 5 - Story 5.1
 * Envoi d'emails de notification aux clients
 * ═══════════════════════════════════════════════════════════════
 */

const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialiser le service email
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Configuration pour Gmail (mode développement)
      // En production, utilisez SendGrid ou un service professionnel
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // App password, pas le mot de passe normal
        },
      });

      // Vérifier la connexion
      await this.transporter.verify();
      this.initialized = true;
      console.log("✅ Email service initialized");
    } catch (error) {
      console.error("❌ Email service initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Envoyer une notification de changement de statut
   */
  async sendOrderStatusNotification(order, oldStatus, newStatus) {
    try {
      await this.initialize();

      const emailContent = this.generateStatusChangeEmail(
        order,
        oldStatus,
        newStatus
      );

      const mailOptions = {
        from: `"Portail Commandes" <${process.env.EMAIL_USER}>`,
        to: order.Email || order.ClientEmail,
        subject: `📦 Mise à jour de votre commande ${order.NumCommande}`,
        html: emailContent,
        text: this.generateTextVersion(order, oldStatus, newStatus),
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log("✅ Email sent:", {
        to: mailOptions.to,
        messageId: info.messageId,
        order: order.NumCommande,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Générer le contenu HTML de l'email
   */
  generateStatusChangeEmail(order, oldStatus, newStatus) {
    const statusConfig = this.getStatusConfig(newStatus);

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .status-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin: 15px 0;
            background: ${statusConfig.color};
            color: white;
        }
        .order-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .order-details h3 {
            margin-top: 0;
            color: #667eea;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #666;
        }
        .detail-value {
            color: #333;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .status-icon {
            font-size: 48px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-icon">${statusConfig.icon}</div>
            <h1>Mise à jour de votre commande</h1>
        </div>
        
        <div class="content">
            <p>Bonjour ${order.NomClient || "Client"},</p>
            
            <p>Nous vous informons que le statut de votre commande a été mis à jour :</p>
            
            <div style="text-align: center;">
                <span class="status-badge">${
                  statusConfig.icon
                } ${newStatus}</span>
            </div>
            
            <p><strong>${statusConfig.message}</strong></p>
            
            <div class="order-details">
                <h3>📋 Détails de la commande</h3>
                <div class="detail-row">
                    <span class="detail-label">Numéro de commande</span>
                    <span class="detail-value"><strong>${
                      order.NumCommande
                    }</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Montant</span>
                    <span class="detail-value">${this.formatMontant(
                      order.MontantTotal
                    )}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ancien statut</span>
                    <span class="detail-value">${oldStatus}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nouveau statut</span>
                    <span class="detail-value"><strong>${newStatus}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date de mise à jour</span>
                    <span class="detail-value">${new Date().toLocaleString(
                      "fr-FR"
                    )}</span>
                </div>
            </div>
            
            ${
              order.Descriptions
                ? `
            <div class="order-details">
                <h3>📝 Description</h3>
                <p>${order.Descriptions}</p>
            </div>
            `
                : ""
            }
            
            <div style="text-align: center;">
                <a href="${
                  process.env.PORTAL_URL || "http://localhost:8080"
                }" class="button">
                    📦 Voir ma commande
                </a>
            </div>
            
            ${this.getStatusSpecificContent(newStatus)}
        </div>
        
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>Pour toute question, contactez notre service client.</p>
            <p>&copy; 2025 Portail Commandes - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Version texte de l'email (fallback)
   */
  generateTextVersion(order, oldStatus, newStatus) {
    const statusConfig = this.getStatusConfig(newStatus);

    return `
Mise à jour de votre commande

Bonjour ${order.NomClient || "Client"},

Le statut de votre commande a été mis à jour :

${statusConfig.message}

DÉTAILS DE LA COMMANDE
----------------------
Numéro: ${order.NumCommande}
Montant: ${this.formatMontant(order.MontantTotal)}
Ancien statut: ${oldStatus}
Nouveau statut: ${newStatus}
Date: ${new Date().toLocaleString("fr-FR")}

${order.Descriptions ? `Description: ${order.Descriptions}\n` : ""}

Consultez votre commande sur : ${
      process.env.PORTAL_URL || "http://localhost:8080"
    }

---
Cet email a été envoyé automatiquement.
© 2025 Portail Commandes
    `;
  }

  /**
   * Configuration par statut
   */
  getStatusConfig(status) {
    const configs = {
      "En preparation": {
        icon: "⏳",
        color: "#f59e0b",
        message:
          "Votre commande est en cours de préparation dans nos entrepôts.",
      },
      Expedie: {
        icon: "🚚",
        color: "#3b82f6",
        message:
          "Bonne nouvelle ! Votre commande a été expédiée et est en chemin vers vous.",
      },
      Livre: {
        icon: "✅",
        color: "#10b981",
        message:
          "Votre commande a été livrée avec succès. Nous espérons que vous en êtes satisfait !",
      },
      Annule: {
        icon: "❌",
        color: "#ef4444",
        message:
          "Votre commande a été annulée. Si vous avez des questions, contactez notre service client.",
      },
    };

    return (
      configs[status] || {
        icon: "📦",
        color: "#6b7280",
        message: "Le statut de votre commande a été mis à jour.",
      }
    );
  }

  /**
   * Contenu spécifique selon le statut
   */
  getStatusSpecificContent(status) {
    switch (status) {
      case "Expedie":
        return `
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #3b82f6; margin-top: 0;">🚚 Informations de livraison</h4>
            <p style="margin: 5px 0;">Délai de livraison estimé : 2-3 jours ouvrés</p>
            <p style="margin: 5px 0;">Vous recevrez un email avec le numéro de suivi prochainement.</p>
          </div>
        `;
      case "Livre":
        return `
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #10b981; margin-top: 0;">⭐ Votre avis compte !</h4>
            <p style="margin: 5px 0;">Vous êtes satisfait de votre commande ? N'hésitez pas à nous laisser un avis.</p>
          </div>
        `;
      default:
        return "";
    }
  }

  /**
   * Formater le montant
   */
  formatMontant(montant) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  }

  /**
   * Envoyer un email de test
   */
  async sendTestEmail(recipientEmail) {
    try {
      await this.initialize();

      const testOrder = {
        NumCommande: "TEST-001",
        MontantTotal: 99.99,
        NomClient: "Test Client",
        Email: recipientEmail,
        Descriptions: "Ceci est un email de test",
      };

      return await this.sendOrderStatusNotification(
        testOrder,
        "En préparation",
        "Expédié"
      );
    } catch (error) {
      console.error("Test email failed:", error);
      throw error;
    }
  }
}

// Export singleton
const emailService = new EmailService();
module.exports = emailService;
