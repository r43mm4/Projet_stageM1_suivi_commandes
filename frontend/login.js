/**
 * ═══════════════════════════════════════════════════════════════
 * LOGIN - AUTHENTIFICATION CLIENT/ADMIN (FIX COMPLET)
 * ═══════════════════════════════════════════════════════════════
 */

// Configuration API
const API_BASE_URL = "http://localhost:3000";
const API_URL = `${API_BASE_URL}/api`;

console.log("API configurée:", API_URL);

// Éléments DOM
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const isAdminCheckbox = document.getElementById("isAdmin");
const errorMessage = document.getElementById("errorMessage");
const loginBtn = document.getElementById("loginBtn");

// Vérifier si déjà connecté
document.addEventListener("DOMContentLoaded", () => {
  console.log("Page de connexion chargée");

  const user = getCurrentUser();
  if (user) {
    console.log("👤 Utilisateur déjà connecté:", user);
    redirectToAppropriateSpace(user);
  }
});

// Gestion de la soumission du formulaire
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const isAdmin = isAdminCheckbox.checked;

  console.log("Tentative connexion:", { email, isAdmin });
  await handleLogin(email, password, isAdmin);
});

/**
 * Fonction principale de connexion
 */
async function handleLogin(email, password, isAdmin) {
  try {
    showLoading(true);
    hideError();

    console.log("Appel API authentification...");

    // Appel API
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, isAdmin }),
    });

    const data = await response.json();
    console.log("Réponse API:", data);

    if (!response.ok || !data.success) {
      showError(data.error || "Erreur d'authentification");
      return;
    }

    // Créer l'objet utilisateur
    const user = {
      email: email,
      role: data.role,
      clientId: data.clientId,
      name: data.name,
      loginTime: new Date().toISOString(),
    };

    console.log("Sauvegarde session:", user);

    // Sauvegarder la session
    saveUserSession(user);

    // Vérifier que ça a bien été sauvegardé
    const savedUser = getCurrentUser();
    console.log("Session vérifiée:", savedUser);

    if (!savedUser) {
      throw new Error("Impossible de sauvegarder la session");
    }

    // Message de succès
    showSuccess(
      `Connexion réussie ! Redirection vers ${
        user.role === "admin" ? "admin" : "client"
      }...`
    );

    // Redirection après 1 seconde
    setTimeout(() => {
      console.log("Redirection...");
      redirectToAppropriateSpace(user);
    }, 1000);
  } catch (error) {
    console.error("❌ Erreur connexion:", error);
    showError("Erreur serveur. Vérifiez que le backend est démarré.");
  } finally {
    showLoading(false);
  }
}

/**
 * Sauvegarder la session utilisateur
 */
function saveUserSession(user) {
  try {
    const userStr = JSON.stringify(user);
    sessionStorage.setItem("currentUser", userStr);
    console.log("Session sauvegardée dans sessionStorage");

    // Double vérification
    const test = sessionStorage.getItem("currentUser");
    if (!test) {
      throw new Error("sessionStorage non accessible");
    }
  } catch (error) {
    console.error("Erreur sauvegarde session:", error);
    alert(
      "Erreur: Impossible de sauvegarder la session. Vérifiez les paramètres de votre navigateur."
    );
  }
}

/**
 * Récupérer l'utilisateur actuel
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    console.log("User récupéré:", user);
    return user;
  } catch (error) {
    console.error("Erreur récupération session:", error);
    return null;
  }
}

/**
 * Rediriger vers l'espace approprié
 */
function redirectToAppropriateSpace(user) {
  if (!user || !user.role) {
    console.error("User invalide pour redirection:", user);
    return;
  }

  const targetUrl =
    user.role === "admin" ? "backoffice/admin.html" : "client/dashboard.html";

  console.log("Redirection vers:", targetUrl);
  console.log("   URL complète:", window.location.origin + "/" + targetUrl);

  // Forcer la redirection
  window.location.replace(targetUrl);
}

/**
 * Déconnexion
 */
function logout() {
  console.log("Déconnexion");
  sessionStorage.removeItem("currentUser");
  window.location.replace("login.html");
}

/**
 * UI Helpers
 */
function showLoading(show) {
  const btnText = loginBtn.querySelector(".btn-text");
  const btnLoading = loginBtn.querySelector(".btn-loading");

  if (show) {
    if (btnText) btnText.style.display = "none";
    if (btnLoading) btnLoading.style.display = "inline-flex";
    loginBtn.disabled = true;
  } else {
    if (btnText) btnText.style.display = "inline";
    if (btnLoading) btnLoading.style.display = "none";
    loginBtn.disabled = false;
  }
}

function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    errorMessage.style.background = "#fee";
    errorMessage.style.color = "#c00";
    errorMessage.style.padding = "12px";
    errorMessage.style.borderRadius = "6px";
    errorMessage.style.marginBottom = "15px";
  }
}

function showSuccess(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    errorMessage.style.background = "#d4edda";
    errorMessage.style.color = "#155724";
    errorMessage.style.padding = "12px";
    errorMessage.style.borderRadius = "6px";
    errorMessage.style.marginBottom = "15px";
  }
}

function hideError() {
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

// Exposer logout globalement
window.logout = logout;
