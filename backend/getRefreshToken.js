/**
 * ═══════════════════════════════════════════════════════════════
 * OBTENIR LE REFRESH TOKEN SALESFORCE
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce script vous aide à obtenir un Refresh Token Salesforce
 * via le OAuth 2.0 Web Server Flow.
 *
 * PRÉREQUIS :
 * 1. Connected App créée dans Salesforce
 * 2. Callback URL configurée : http://localhost:3000/oauth/callback
 * 3. SF_CLIENT_ID et SF_CLIENT_SECRET dans .env
 *
 * UTILISATION :
 * node getRefreshToken.js
 */

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Variables globales
let authCode = null;

// ==================== CALLBACK ROUTE ====================
app.get("/oauth/callback", (req, res) => {
  authCode = req.query.code;
  const error = req.query.error;
  const errorDescription = req.query.error_description;

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("   CALLBACK REÇU");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Query params:", JSON.stringify(req.query, null, 2));
  console.log("═══════════════════════════════════════════════════════\n");

  // Gestion des erreurs
  if (error) {
    console.error("❌ ERREUR OAUTH:", error);
    console.error("   Description:", errorDescription);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erreur OAuth</title>
        <style>
          body { font-family: Arial; padding: 40px; background: #f44336; color: white; }
          .container { max-width: 600px; margin: 0 auto; background: white; color: #333; padding: 30px; border-radius: 8px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Erreur OAuth</h1>
          <p><strong>Erreur:</strong> ${error}</p>
          <p><strong>Description:</strong> ${
            errorDescription || "Aucune description"
          }</p>
          <hr>
          <h2>💡 Solutions possibles :</h2>
          <ol>
            <li>Vérifiez que la Callback URL est exactement : <code>http://localhost:3000/oauth/callback</code></li>
            <li>Attendez 10 minutes après avoir modifié la Connected App</li>
            <li>Vérifiez que les OAuth Scopes incluent "refresh_token, offline_access"</li>
          </ol>
          <p>Fermez cette fenêtre et réessayez.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Vérifier si on a bien le code
  if (!authCode) {
    console.error("❌ Aucun code reçu dans la requête");
    console.error("   Query string complète:", req.url);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Code manquant</title>
        <style>
          body { font-family: Arial; padding: 40px; background: #ff9800; color: white; }
          .container { max-width: 600px; margin: 0 auto; background: white; color: #333; padding: 30px; border-radius: 8px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Code OAuth manquant</h1>
          <p>Le paramètre <code>code</code> n'a pas été reçu dans l'URL de callback.</p>
          <p><strong>URL reçue:</strong></p>
          <pre>${req.url}</pre>
          <hr>
          <h2>💡 Vérifications :</h2>
          <ol>
            <li>Vérifiez que votre Connected App est bien configurée</li>
            <li>Vérifiez que la Callback URL est exactement : <code>http://localhost:3000/oauth/callback</code></li>
            <li>Réessayez en cliquant sur le lien d'autorisation</li>
          </ol>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // SUCCÈS : Code reçu
  console.log("✅ CODE REÇU:", authCode.substring(0, 20) + "...");
  console.log("\n🔄 Échange du code contre le Refresh Token en cours...\n");

  // Échanger le code automatiquement
  exchangeCodeForToken(authCode)
    .then((tokens) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>✅ Refresh Token Obtenu</title>
          <style>
            body { font-family: Arial; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
            h1 { color: #4caf50; }
            .token-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .token { word-break: break-all; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0; }
            .success { background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0; }
            code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
            .step { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Refresh Token obtenu avec succès !</h1>
            
            <div class="success">
              <strong>🎉 Félicitations !</strong> Vous avez maintenant un Refresh Token permanent.
            </div>

            <div class="token-box">
              <h3>🔑 Votre Refresh Token :</h3>
              <div class="token">${tokens.refresh_token}</div>
            </div>

            <div class="token-box">
              <h3>🌐 Instance URL :</h3>
              <div class="token">${tokens.instance_url}</div>
            </div>

            <div class="warning">
              <strong>⚠️ IMPORTANT :</strong> Ce token est <strong>permanent</strong> et doit être gardé <strong>SECRET</strong>.
              Ne le partagez JAMAIS et ne le commitez JAMAIS sur GitHub !
            </div>

            <h2>📝 Prochaines étapes :</h2>
            
            <div class="step">
              <strong>1.</strong> Ouvrez le fichier <code>backend/.env</code>
            </div>

            <div class="step">
              <strong>2.</strong> Ajoutez/modifiez ces lignes :
              <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px;">SF_REFRESH_TOKEN=${tokens.refresh_token}
SF_INSTANCE_URL=${tokens.instance_url}</pre>
            </div>

            <div class="step">
              <strong>3.</strong> Sauvegardez le fichier <code>.env</code>
            </div>

            <div class="step">
              <strong>4.</strong> Testez la connexion :
              <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 4px;">cd backend
node testSalesforce.js</pre>
            </div>

            <div class="success" style="margin-top: 30px;">
              <strong>✅ C'est terminé !</strong> Vous pouvez fermer cette fenêtre et le serveur (Ctrl+C dans le terminal).
            </div>
          </div>
        </body>
        </html>
      `);
    })
    .catch((err) => {
      console.error("❌ Erreur lors de l'échange du code:", err.message);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erreur</title></head>
        <body>
          <h1>❌ Erreur lors de l'échange du code</h1>
          <p>${err.message}</p>
          <p>Vérifiez la console pour plus de détails.</p>
        </body>
        </html>
      `);
    });
});

// ==================== FONCTION D'ÉCHANGE ====================
async function exchangeCodeForToken(code) {
  try {
    const clientId = process.env.SF_CLIENT_ID;
    const clientSecret = process.env.SF_CLIENT_SECRET;
    const redirectUri = "http://localhost:3000/oauth/callback";

    console.log("📤 Envoi de la requête d'échange...");
    console.log(`   Client ID: ${clientId?.substring(0, 20)}...`);
    console.log(`   Redirect URI: ${redirectUri}`);

    const response = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("\n✅ Échange réussi !");
    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║   TOKENS REÇUS                                       ║");
    console.log("╚═══════════════════════════════════════════════════════╝");
    console.log(
      `   Access Token: ${response.data.access_token?.substring(0, 30)}...`
    );
    console.log(
      `   Refresh Token: ${response.data.refresh_token?.substring(0, 30)}...`
    );
    console.log(`   Instance URL: ${response.data.instance_url}`);
    console.log("═══════════════════════════════════════════════════════\n");

    console.log("💾 COPIEZ CES VALEURS DANS VOTRE .env :");
    console.log("─────────────────────────────────────────────────────");
    console.log(`SF_REFRESH_TOKEN=${response.data.refresh_token}`);
    console.log(`SF_INSTANCE_URL=${response.data.instance_url}`);
    console.log("─────────────────────────────────────────────────────\n");

    return response.data;
  } catch (error) {
    console.error("\n❌ ERREUR lors de l'échange:");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("   Message:", error.message);
    }
    throw error;
  }
}

// ==================== DÉMARRAGE DU SERVEUR ====================
app.listen(PORT, () => {
  const clientId = process.env.SF_CLIENT_ID;

  if (!clientId) {
    console.error("\n❌ ERREUR: SF_CLIENT_ID manquant dans .env");
    console.error(
      "   Vérifiez que le fichier backend/.env contient SF_CLIENT_ID\n"
    );
    process.exit(1);
  }

  const authUrl = `https://login.salesforce.com/services/oauth2/authorize?client_id=${clientId}&redirect_uri=http://localhost:3000/oauth/callback&response_type=code&scope=full%20refresh_token%20offline_access`;

  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   OBTENIR LE REFRESH TOKEN SALESFORCE                ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  console.log("🚀 Serveur démarré sur http://localhost:3000\n");

  console.log("📋 INSTRUCTIONS :");
  console.log("─────────────────────────────────────────────────────");
  console.log("1. Ouvrez ce lien dans votre navigateur :\n");
  console.log("   " + authUrl + "\n");
  console.log("2. Connectez-vous à Salesforce si demandé\n");
  console.log('3. Cliquez sur "Allow" pour autoriser l\'application\n');
  console.log("4. Vous serez redirigé vers localhost:3000/oauth/callback\n");
  console.log("5. Le Refresh Token s'affichera automatiquement\n");
  console.log("─────────────────────────────────────────────────────\n");

  console.log("💡 Si ça ne marche pas :");
  console.log(
    "   - Vérifiez que la Callback URL dans Salesforce est exactement :"
  );
  console.log("     http://localhost:3000/oauth/callback");
  console.log("   - Attendez 10 minutes après avoir modifié la Connected App");
  console.log(
    '   - Vérifiez que les scopes incluent "refresh_token" et "offline_access"\n'
  );

  console.log("⏳ En attente de l'autorisation...\n");
});
