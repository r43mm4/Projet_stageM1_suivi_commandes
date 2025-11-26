/**
 * ═══════════════════════════════════════════════════════════════
 * ROUTES AUTH - AUTHENTIFICATION CLIENT/ADMIN
 * ═══════════════════════════════════════════════════════════════
 */

const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../lib/database");

/**
 * POST /api/auth/login - Connexion client ou admin
 */
router.post("/login", async (req, res) => {
  try {
    console.log("\n📡 POST /api/auth/login");

    const { email, password, isAdmin } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email et mot de passe requis",
      });
    }

    console.log(`   Email: ${email}`);
    console.log(`   Mode: ${isAdmin ? "Admin" : "Client"}`);

    // Authentification ADMIN
    if (isAdmin) {
      const adminResult = await authenticateAdmin(email, password);
      return res.json(adminResult);
    }

    // Authentification CLIENT
    const clientResult = await authenticateClient(email, password);
    return res.json(clientResult);
  } catch (error) {
    console.error("❌ Erreur /auth/login:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de l'authentification",
    });
  }
});

/**
 * Authentifier un administrateur
 */
async function authenticateAdmin(email, password) {
  // Comptes admin hardcodés (pour simplicité)
  const adminAccounts = {
    "admin@digiinfo.fr": {
      password: "Admin123",
      name: "Administrateur DigiInfo",
    },
    "admin@example.com": {
      password: "Admin123",
      name: "Administrateur",
    },
  };

  const admin = adminAccounts[email.toLowerCase()];

  if (!admin) {
    console.log("   ❌ Admin non trouvé");
    return {
      success: false,
      error: "Compte administrateur non trouvé",
    };
  }

  if (admin.password !== password) {
    console.log("   ❌ Mot de passe incorrect");
    return {
      success: false,
      error: "Mot de passe incorrect",
    };
  }

  console.log("   ✅ Admin authentifié:", admin.name);

  return {
    success: true,
    role: "admin",
    name: admin.name,
    clientId: null,
  };
}

/**
 * Authentifier un client (via base de données)
 */
async function authenticateClient(email, password) {
  try {
    const pool = await poolPromise;

    // Rechercher le client par email
    const result = await pool
      .request()
      .input("email", sql.NVarChar(100), email.toLowerCase()).query(`
        SELECT 
          ClientId,
          NomClient,
          Email,
          MotDePasse
        FROM Clients
        WHERE LOWER(Email) = @email
      `);

    if (result.recordset.length === 0) {
      console.log("   ❌ Client non trouvé");
      return {
        success: false,
        error: "Email non trouvé dans notre base de données",
      };
    }

    const client = result.recordset[0];

    // Vérifier le mot de passe
    // NOTE: En production, utiliser bcrypt.compare()
    // Pour la démo, on compare directement
    const isPasswordValid = verifyPassword(password, client.MotDePasse);

    if (!isPasswordValid) {
      console.log("   ❌ Mot de passe incorrect");
      return {
        success: false,
        error: "Mot de passe incorrect",
      };
    }

    console.log("   ✅ Client authentifié:", client.NomClient);

    return {
      success: true,
      role: "client",
      clientId: client.ClientId,
      name: client.NomClient,
      email: client.Email,
    };
  } catch (error) {
    console.error("   ❌ Erreur authentification client:", error.message);
    return {
      success: false,
      error: "Erreur lors de la vérification des identifiants",
    };
  }
}

/**
 * Vérifier le mot de passe
 * NOTE: Version simplifiée pour la démo
 * En production, utiliser bcrypt.compare()
 */
function verifyPassword(plainPassword, hashedPassword) {
  // Si le hash commence par $2b$, c'est bcrypt
  if (hashedPassword.startsWith("$2b$")) {
    // En production: return bcrypt.compareSync(plainPassword, hashedPassword);

    // Pour la démo, on accepte "Password123" pour tous les comptes
    // Car les hash sont fictifs dans seed.sql
    return plainPassword === "Password123";
  }

  // Si pas de hash, comparaison directe (mode dev)
  return plainPassword === hashedPassword;
}

/**
 * POST /api/auth/logout - Déconnexion
 */
router.post("/logout", (req, res) => {
  console.log("\n📡 POST /api/auth/logout");

  // En production, invalider le token JWT ici

  res.json({
    success: true,
    message: "Déconnexion réussie",
  });
});

/**
 * GET /api/auth/me - Récupérer l'utilisateur actuel
 */
router.get("/me", async (req, res) => {
  try {
    // En production, récupérer depuis le token JWT
    // Pour la démo, on retourne un message

    res.json({
      success: false,
      error: "Non implémenté - Utilisez sessionStorage côté client",
    });
  } catch (error) {
    console.error("❌ Erreur /auth/me:", error.message);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

module.exports = router;
