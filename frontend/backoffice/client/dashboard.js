const API_URL = "http://localhost:3000/api";
let client = null;
let commandes = [];

// ==================== VÉRIFIER AUTHENTIFICATION ====================
function checkAuth() {
  const clientData = localStorage.getItem("client");
  if (!clientData) {
    console.log("Non authentifié, redirection vers login");
    window.location.href = "login.html";
    return null;
  }
  return JSON.parse(clientData);
}

// ==================== DÉCONNEXION ====================
function logout() {
  console.log("🚪 Déconnexion");
  localStorage.removeItem("client");
  window.location.href = "login.html";
}

// ==================== AFFICHER NOM CLIENT ====================
function displayClientName() {
  document.getElementById("clientName").textContent = `${client.prenom} ${
    client.nom
  }${client.entreprise ? ` (${client.entreprise})` : ""}`;
}

// ==================== FONCTIONS UTILITAIRES ====================
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "flex" : "none";
}

function showError(message) {
  const errorEl = document.getElementById("error");
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function hideError() {
  document.getElementById("error").style.display = "none";
}

function getStatusClass(etat) {
  const map = {
    "En préparation": "preparation",
    Expédié: "expedie",
    Livré: "livre",
    Annulé: "annule",
  };
  return map[etat] || "preparation";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant);
}

// ==================== CALCULER STATISTIQUES ====================
function updateStats(commandesData) {
  const total = commandesData.length;
  const preparation = commandesData.filter(
    (c) => c.Etat === "En préparation"
  ).length;
  const expedie = commandesData.filter((c) => c.Etat === "Expédié").length;
  const livre = commandesData.filter((c) => c.Etat === "Livré").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPreparation").textContent = preparation;
  document.getElementById("statExpedie").textContent = expedie;
  document.getElementById("statLivre").textContent = livre;
}

// ==================== RÉCUPÉRER COMMANDES ====================
async function fetchCommandes() {
  try {
    showLoading(true);
    hideError();

    console.log(`Récupération commandes pour client ${client.clientId}`);

    const response = await fetch(
      `${API_URL}/auth/mes-commandes/${client.clientId}`
    );

    if (!response.ok) {
      throw new Error("Erreur de chargement");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur");
    }

    commandes = data.data || [];
    console.log(`${commandes.length} commandes récupérées`);

    displayCommandes(commandes);
    updateStats(commandes);
    showLoading(false);
  } catch (error) {
    console.error("❌ Erreur:", error);
    showError("Impossible de charger vos commandes. Veuillez réessayer.");
    showLoading(false);
  }
}

// ==================== AFFICHER COMMANDES ====================
function displayCommandes(commandesData) {
  const container = document.getElementById("commandesList");
  container.innerHTML = "";

  if (commandesData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-icon"></p>
        <p class="empty-text">Aucune commande trouvée</p>
      </div>
    `;
    return;
  }

  commandesData.forEach((commande) => {
    const card = document.createElement("div");
    card.className = "commande-card";
    card.innerHTML = `
      <div class="commande-header">
        <div>
          <h3>${commande.NumCommande}</h3>
          <p class="commande-date"> ${formatDate(commande.CreatedAt)}</p>
        </div>
        <span class="status status-${getStatusClass(commande.Etat)}">
          ${commande.Etat}
        </span>
      </div>
      <div class="commande-body">
        <p class="commande-montant">${formatMontant(commande.Montant)}</p>
        <p class="commande-description">${
          commande.Descriptions || "Aucune description"
        }</p>
      </div>
      <div class="commande-footer">
        <button class="btn-details" onclick="viewDetails(${
          commande.CommandeId
        })">
          Voir les détails
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==================== VOIR DÉTAILS ====================
async function viewDetails(commandeId) {
  try {
    console.log(`Chargement détails commande ${commandeId}`);

    const response = await fetch(
      `${API_URL}/auth/commande/${commandeId}/${client.clientId}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur");
    }

    const commande = data.data;

    const modalBody = document.getElementById("modalBody");
    modalBody.innerHTML = `
      <div class="details-grid">
        <div class="detail-item">
          <strong>Numéro de Commande</strong>
          <p>${commande.NumCommande}</p>
        </div>
        <div class="detail-item">
          <strong>Montant</strong>
          <p class="detail-montant">${formatMontant(commande.Montant)}</p>
        </div>
        <div class="detail-item">
          <strong>État</strong>
          <p><span class="status status-${getStatusClass(commande.Etat)}">${
      commande.Etat
    }</span></p>
        </div>
        <div class="detail-item">
          <strong>Date de Création</strong>
          <p>${formatDate(commande.CreatedAt)}</p>
        </div>
        <div class="detail-item">
          <strong>Dernière Mise à Jour</strong>
          <p>${formatDate(commande.LastSyncedAt)}</p>
        </div>
        <div class="detail-item full-width">
          <strong>Description</strong>
          <p>${commande.Descriptions || "Aucune description disponible"}</p>
        </div>
      </div>
      
      <div class="timeline">
        <h3>📍 Suivi de la Commande</h3>
        <div class="timeline-item ${
          commande.Etat !== "Annulé" ? "active" : ""
        }">
          <div class="timeline-icon"></div>
          <div class="timeline-content">
            <strong>Commande créée</strong>
            <p>${formatDate(commande.CreatedAt)}</p>
          </div>
        </div>
        <div class="timeline-item ${
          ["Expédié", "Livré"].includes(commande.Etat) ? "active" : ""
        }">
          <div class="timeline-icon"></div>
          <div class="timeline-content">
            <strong>Expédiée</strong>
            <p>${
              ["Expédié", "Livré"].includes(commande.Etat)
                ? "En cours de livraison"
                : "En attente"
            }</p>
          </div>
        </div>
        <div class="timeline-item ${commande.Etat === "Livré" ? "active" : ""}">
          <div class="timeline-icon"></div>
          <div class="timeline-content">
            <strong>Livrée</strong>
            <p>${
              commande.Etat === "Livré" ? "Commande livrée" : "En attente"
            }</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("detailsModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur:", error);
    alert("Impossible de charger les détails");
  }
}

function closeDetailsModal() {
  document.getElementById("detailsModal").style.display = "none";
}

// ==================== FILTRAGE ====================
function filterCommandes() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;

  let filtered = commandes;

  if (searchTerm) {
    filtered = filtered.filter((c) =>
      c.NumCommande.toLowerCase().includes(searchTerm)
    );
  }

  if (statusFilter) {
    filtered = filtered.filter((c) => c.Etat === statusFilter);
  }
}

displayCommandes(filtered);

// ==================== EVENT LISTENERS ====================
document.getElementById("btnLogout").addEventListener("click", logout);
document.getElementById("btnRefresh").addEventListener("click", fetchCommandes);
document
  .getElementById("searchInput")
  .addEventListener("input", filterCommandes);
document
  .getElementById("statusFilter")
  .addEventListener("change", filterCommandes);

// ==================== INITIALISATION ====================
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Dashboard chargé");

  // Vérifier authentification
  client = checkAuth();
  if (!client) return;

  // Afficher nom client
  displayClientName();

  // Charger commandes
  fetchCommandes();

  // Auto-refresh toutes les 30 secondes
  setInterval(fetchCommandes, 30000);
});
