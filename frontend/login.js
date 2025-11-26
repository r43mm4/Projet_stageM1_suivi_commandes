/**
 * ═══════════════════════════════════════════════════════════════
 * LOGIN - AUTHENTIFICATION CLIENT/ADMIN
 * ═══════════════════════════════════════════════════════════════
 */

// Configuration API
const API_BASE_URL = "http://localhost:3000";
const API_URL = `${API_BASE_URL}/api`;

console.log("📍 API configurée:", API_URL);

// Éléments DOM
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const isAdminCheckbox = document.getElementById("isAdmin");
const errorMessage = document.getElementById("errorMessage");
const loginBtn = document.getElementById("loginBtn");

// Vérifier si déjà connecté
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Page de connexion chargée");

  const user = getCurrentUser();
  if (user) {
    console.log("👤 Utilisateur déjà connecté:", user.email);
    redirectToAppropriateSpace(user);
  }
});

// Gestion de la soumission du formulaire
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const isAdmin = isAdminCheckbox.checked;

  console.log("🔐 Tentative de connexion:", { email, isAdmin });
  await handleLogin(email, password, isAdmin);
});

/**
 * Fonction principale de connexion
 */
async function handleLogin(email, password, isAdmin) {
  try {
    showLoading(true);
    hideError();

    // Appel à l'API d'authentification
    const response = await authenticateUser(email, password, isAdmin);
    console.log("📡 Réponse API:", response);

    if (response.success) {
      // Stocker les informations utilisateur
      const user = {
        email: email,
        role: response.role,
        clientId: response.clientId,
        name: response.name,
        loginTime: new Date().toISOString(),
      };

      console.log("💾 Sauvegarde session:", user);
      saveUserSession(user);

      // Message de succès
      showSuccess("Connexion réussie ! Redirection...");

      // Redirection après 1 seconde
      setTimeout(() => {
        redirectToAppropriateSpace(user);
      }, 1000);
    } else {
      showError(response.message || "Email ou mot de passe incorrect");
    }
  } catch (error) {
    console.error("❌ Erreur de connexion:", error);
    showError(
      "Impossible de se connecter. Vérifiez que le serveur est démarré."
    );
  } finally {
    showLoading(false);
  }
}

/**
 * Authentification via l'API backend
 */
async function authenticateUser(email, password, isAdmin) {
  try {
    console.log("📡 POST /api/auth/login");

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        isAdmin,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || "Erreur d'authentification",
      };
    }

    return {
      success: true,
      clientId: data.clientId,
      name: data.name,
      role: data.role,
    };
  } catch (error) {
    console.error("❌ Erreur API authentification:", error);

    // FALLBACK : Mode démo si le serveur n'est pas accessible
    console.warn("⚠️  Mode DÉMO activé (serveur inaccessible)");
    return authenticateUserDemo(email, password, isAdmin);
  }
}

/**
 * Authentification DÉMO (fallback si serveur inaccessible)
 */
function authenticateUserDemo(email, password, isAdmin) {
  console.log("🎭 Mode DÉMO - Authentification locale");

  // Comptes de démonstration basés sur les données SQL
  const demoAccounts = {
    "raoulemma1999@gmail.com": {
      password: "Password123",
      role: "client",
      clientId: 1,
      name: "WAFFO Raoul",
    },
    "contact@techcorp.fr": {
      password: "Password123",
      role: "client",
      clientId: 2,
      name: "Entreprise TechCorp",
    },
    "sophie.martin@example.com": {
      password: "Password123",
      role: "client",
      clientId: 3,
      name: "Sophie Martin",
    },
    "admin@digiinfo.fr": {
      password: "Admin123",
      role: "admin",
      clientId: null,
      name: "Administrateur",
    },
  };

  const account = demoAccounts[email.toLowerCase()];

  if (!account) {
    return {
      success: false,
      message: "Email non trouvé dans la base de données",
    };
  }

  if (account.password !== password) {
    return {
      success: false,
      message: "Mot de passe incorrect",
    };
  }

  if (isAdmin && account.role !== "admin") {
    return {
      success: false,
      message: "Accès administrateur refusé",
    };
  }

  if (!isAdmin && account.role === "admin") {
    return {
      success: false,
      message: 'Veuillez cocher "Se connecter en tant qu\'administrateur"',
    };
  }

  return {
    success: true,
    clientId: account.clientId,
    name: account.name,
    role: account.role,
  };
}

/**
 * Sauvegarder la session utilisateur
 */
function saveUserSession(user) {
  try {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    console.log("✅ Session sauvegardée");
  } catch (error) {
    console.error("❌ Erreur sauvegarde session:", error);
  }
}

/**
 * Récupérer l'utilisateur actuel
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("❌ Erreur récupération session:", error);
    return null;
  }
}

/**
 * Rediriger vers l'espace approprié
 */
function redirectToAppropriateSpace(user) {
  const targetUrl =
    user.role === "admin" ? "backoffice/admin.html" : "client/dashboard.html";

  console.log("🔀 Redirection vers:", targetUrl);

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 100);
}

/**
 * Déconnexion
 */
function logout() {
  console.log("👋 Déconnexion");
  sessionStorage.removeItem("currentUser");
  window.location.href = "../login.html";
}

/**
 * UI Helpers
 */
function showLoading(show) {
  const btnText = loginBtn.querySelector(".btn-text");
  const btnLoading = loginBtn.querySelector(".btn-loading");

  if (show) {
    btnText.style.display = "none";
    btnLoading.style.display = "inline-flex";
    loginBtn.disabled = true;
  } else {
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    loginBtn.disabled = false;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  errorMessage.className = "error-message";

  // Animation shake
  setTimeout(() => {
    errorMessage.style.animation = "shake 0.5s";
  }, 10);
}

function showSuccess(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  errorMessage.className = "success-message";
  errorMessage.style.background = "#d4edda";
  errorMessage.style.color = "#155724";
  errorMessage.style.borderColor = "#c3e6cb";
}

function hideError() {
  errorMessage.style.display = "none";
  errorMessage.textContent = "";
}

// Exposer logout globalement
window.logout = logout;
