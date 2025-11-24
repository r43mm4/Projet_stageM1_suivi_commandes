const API_URL = "http://localhost:3000/api";

// ==================== REMPLIR FORMULAIRE (COMPTES TEST) ====================
function fillLogin(email, password) {
  document.getElementById("email").value = email;
  document.getElementById("motDePasse").value = password;
}

// ==================== AFFICHER MESSAGE D'ERREUR ====================
function showError(message) {
  const errorEl = document.getElementById("errorMessage");
  errorEl.textContent = message;
  errorEl.style.display = "block";

  // Masquer après 5 secondes
  setTimeout(() => {
    errorEl.style.display = "none";
  }, 5000);
}

// ==================== GÉRER LA CONNEXION ====================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const motDePasse = document.getElementById("motDePasse").value;

  const btnLogin = document.getElementById("btnLogin");
  const btnText = btnLogin.querySelector(".btn-text");
  const btnSpinner = btnLogin.querySelector(".btn-spinner");

  try {
    // Afficher le spinner
    btnLogin.disabled = true;
    btnText.style.display = "none";
    btnSpinner.style.display = "inline";

    console.log("Tentative de connexion:", email);

    // Appel API
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, motDePasse }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur de connexion");
    }

    console.log("Connexion réussie:", data.data);

    // Stocker les infos client dans localStorage
    localStorage.setItem("client", JSON.stringify(data.data));

    // Rediriger vers le dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Erreur:", error.message);
    showError(
      error.message || "Erreur de connexion. Vérifiez vos identifiants."
    );

    // Réactiver le bouton
    btnLogin.disabled = false;
    btnText.style.display = "inline";
    btnSpinner.style.display = "none";
  }
});

// ==================== VÉRIFIER SI DÉJÀ CONNECTÉ ====================
window.addEventListener("DOMContentLoaded", () => {
  const client = localStorage.getItem("client");
  if (client) {
    console.log("Client déjà connecté, redirection...");
    window.location.href = "dashboard.html";
  }
});
