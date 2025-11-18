class SalesforceService {
  async authenticate() {
    POST / services / oauth2 / token;
    // Store accessToken + tokenExpiresAt
  }

  async ensureAuthenticated() {
    // Vérifier expiration
    // Ré-authentifier si besoin
  }
}
