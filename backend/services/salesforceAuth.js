/**
 * ═══════════════════════════════════════════════════════════════
 * SALESFORCE AUTHENTICATION SERVICE
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce service gère l'authentification OAuth2 avec Salesforce.
 * Il utilise le OAuth 2.0 Username-Password Flow pour obtenir
 * un access token qui permet d'appeler l'API Salesforce.
 *
 * POURQUOI Username-Password Flow ?
 * - Simple à implémenter pour une application backend
 * - Pas besoin d'interaction utilisateur
 * - Parfait pour les jobs automatisés (batch sync)
 *
 * SÉCURITÉ :
 * - Les credentials sont JAMAIS hardcodés
 * - Tout vient du fichier .env
 * - Les tokens sont stockés en mémoire (pas en base)
 */

require("dotenv").config(); // Charger les variables .env
const axios = require("axios");
const logger = require("../lib/logger"); // Winston logger

class SalesforceAuth {
  constructor() {
    // Configuration depuis les variables d'environnement
    // Ces valeurs viennent du fichier .env et NE DOIVENT JAMAIS être committées
    this.clientId = process.env.SF_CLIENT_ID;
    this.clientSecret = process.env.SF_CLIENT_SECRET;
    this.username = process.env.SF_USERNAME;
    this.password = process.env.SF_PASSWORD; // password + security token
    this.loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";

    // Variables pour stocker le token en mémoire
    this.accessToken = null; // Le token d'accès actuel
    this.instanceUrl = null; // L'URL de l'instance Salesforce (ex: https://na123.salesforce.com)
    this.tokenExpiresAt = null; // Timestamp d'expiration du token

    // Validation des credentials au démarrage
    this._validateConfig();
  }

  /**
   * Valide que toutes les variables d'environnement nécessaires sont présentes
   * Si une variable manque, l'application doit s'arrêter (fail-fast principle)
   *
   * POURQUOI fail-fast ?
   * - Mieux vaut planter au démarrage que pendant un sync critique
   * - L'admin est alerté immédiatement du problème
   */
  _validateConfig() {
    const requiredVars = [
      "SF_CLIENT_ID",
      "SF_CLIENT_SECRET",
      "SF_USERNAME",
      "SF_PASSWORD",
    ];
    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      const error = `Configuration Salesforce incomplète. Variables manquantes: ${missing.join(
        ", "
      )}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info("Configuration Salesforce validée ✓");
  }

  /**
   * MÉTHODE PRINCIPALE : Authentification OAuth2
   *
   * FLOW OAuth2 Username-Password :
   * 1. POST vers /services/oauth2/token
   * 2. Envoyer client_id, client_secret, username, password
   * 3. Recevoir access_token + instance_url
   * 4. Stocker en mémoire avec timestamp d'expiration
   *
   * DURÉE DE VIE DU TOKEN :
   * - Par défaut : 2 heures (mais peut varier selon config Salesforce)
   * - On considère 1h50 pour avoir une marge de sécurité
   *
   * @returns {Promise} { accessToken, instanceUrl }
   * @throws {Error} Si l'authentification échoue
   */
  async authenticate() {
    try {
      logger.info("Tentative d'authentification Salesforce...");

      // Construction de la requête OAuth2
      const authUrl = `${this.loginUrl}/services/oauth2/token`;
      const params = new URLSearchParams({
        grant_type: "password", // Type de flow OAuth2
        client_id: this.clientId, // Consumer Key de la Connected App
        client_secret: this.clientSecret, // Consumer Secret de la Connected App
        username: this.username, // Username Salesforce
        password: this.password, // Password + Security Token
      });

      // Appel HTTP vers Salesforce
      const response = await axios.post(authUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000, // 15 secondes de timeout
      });

      // Extraction des données de la réponse
      const { access_token, instance_url, issued_at } = response.data;

      // Stockage en mémoire
      this.accessToken = access_token;
      this.instanceUrl = instance_url;

      // Calcul de l'expiration (1h50 = 110 minutes)
      // POURQUOI 110 minutes et pas 120 ?
      // Pour avoir une marge et renouveler AVANT l'expiration réelle
      const expirationMinutes = 110;
      this.tokenExpiresAt = Date.now() + expirationMinutes * 60 * 1000;

      logger.info(`Authentification réussie !`);
      logger.info(`   Instance URL: ${instance_url}`);
      logger.info(`   Token expire dans ${expirationMinutes} minutes`);

      return {
        accessToken: this.accessToken,
        instanceUrl: this.instanceUrl,
      };
    } catch (error) {
      // Gestion des erreurs détaillée
      logger.error("Échec de l'authentification Salesforce");

      if (error.response) {
        // Erreur HTTP de Salesforce (400, 401, etc.)
        const { status, data } = error.response;
        logger.error(`   Status HTTP: ${status}`);
        logger.error(
          `   Message: ${
            data.error_description || data.error || "Erreur inconnue"
          }`
        );

        // Messages d'erreur courants et leurs solutions
        if (status === 400) {
          if (data.error === "invalid_client_id") {
            logger.error("   Solution: Vérifiez SF_CLIENT_ID dans .env");
          } else if (data.error === "invalid_client") {
            logger.error("   Solution: Vérifiez SF_CLIENT_SECRET dans .env");
          } else if (data.error === "invalid_grant") {
            logger.error(
              "   Solution: Vérifiez SF_USERNAME et SF_PASSWORD (password+token)"
            );
          }
        }
      } else if (error.request) {
        // Pas de réponse (timeout, réseau)
        logger.error("   Aucune réponse de Salesforce");
        logger.error("   Vérifiez votre connexion internet");
      } else {
        // Autre erreur
        logger.error(`   ${error.message}`);
      }

      throw new Error(`Échec authentification Salesforce: ${error.message}`);
    }
  }

  /**
   * Vérifie si le token est encore valide
   *
   * LOGIQUE :
   * - Si pas de token → pas valide
   * - Si pas d'expiration → pas valide (ne devrait jamais arriver)
   * - Si maintenant >= expiration → pas valide
   *
   * @returns {boolean} true si le token est valide, false sinon
   */
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    const isValid = Date.now() < this.tokenExpiresAt;

    if (!isValid) {
      logger.warn("Token Salesforce expiré");
    }

    return isValid;
  }

  /**
   * MÉTHODE CRITIQUE : Assure qu'on a toujours un token valide
   *
   * UTILISATION :
   * Appelez cette méthode AVANT chaque requête à l'API Salesforce
   *
   * LOGIQUE :
   * - Si token valide → rien à faire
   * - Si token expiré ou inexistant → réauthentifier
   *
   * PATTERN : Lazy Authentication
   * On ne s'authentifie que quand c'est nécessaire
   *
   * @returns {Promise} { accessToken, instanceUrl }
   */
  async ensureAuthenticated() {
    if (this.isTokenValid()) {
      logger.debug("Token Salesforce valide, réutilisation");
      return {
        accessToken: this.accessToken,
        instanceUrl: this.instanceUrl,
      };
    }

    logger.info("Token invalide ou expiré, réauthentification...");
    return await this.authenticate();
  }

  /**
   * Obtenir le token actuel (sans réauthentifier)
   *
   * ATTENTION : Cette méthode ne vérifie PAS la validité
   * Utilisez plutôt ensureAuthenticated() dans 99% des cas
   *
   * @returns {string|null} Le token d'accès ou null
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Obtenir l'URL de l'instance Salesforce
   *
   * @returns {string|null} L'URL de l'instance ou null
   */
  getInstanceUrl() {
    return this.instanceUrl;
  }

  /**
   * Forcer une nouvelle authentification
   *
   * UTILISATION :
   * - Après une erreur 401 (Unauthorized) de Salesforce
   * - Pour tester la configuration
   * - En cas de doute sur la validité du token
   *
   * @returns {Promise} { accessToken, instanceUrl }
   */
  async refreshToken() {
    logger.info("Rafraîchissement forcé du token...");
    this.accessToken = null; // Invalider le token actuel
    this.tokenExpiresAt = null;
    return await this.authenticate();
  }
}

// Export d'une instance unique (Singleton pattern)
// POURQUOI Singleton ?
// - Un seul token partagé dans toute l'application
// - Évite les authentifications multiples simultanées
// - Simplifie l'utilisation (pas besoin de new à chaque fois)
module.exports = new SalesforceAuth();
