/**
 * ═══════════════════════════════════════════════════════════════
 * DASHBOARD CLIENT - GESTION DES COMMANDES
 * ═══════════════════════════════════════════════════════════════
 */

// Configuration API
const API_BASE_URL = "http://localhost:3000";
const API_URL = `${API_BASE_URL}/api/commandes`;

console.log("📍 API URL:", API_URL);

// Variables globales
let commandes = [];
let autoRefreshInterval = null;
let currentUser = null;

/**
 * Initialisation au chargement de la page
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Dashboard initialisé");

  // Vérifier l'authentification
  currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn("⚠️  Utilisateur non connecté, redirection...");
    window.location.href = "../login.html";
    return;
  }

  console.log("👤 Utilisateur connecté:", currentUser);

  // Afficher le nom du client dans le header
  updateUserInfo();

  // Charger les commandes
  fetchCommandes();

  // Setup auto-refresh
  setupAutoRefresh();

  // Setup event listeners
  setupEventListeners();
});

/**
 * Mettre à jour les informations utilisateur dans l'interface
 */
function updateUserInfo() {
  // Nom du client dans le header
  const clientNameEl = document.getElementById("clientName");
  if (clientNameEl && currentUser) {
    clientNameEl.textContent = currentUser.name || currentUser.email;
  }

  // Message de bienvenue
  const welcomeEl = document.querySelector(".welcome-text");
  if (welcomeEl && currentUser) {
    welcomeEl.innerHTML = `Bienvenue, <strong>${
      currentUser.name || currentUser.email
    }</strong>`;
  }
}

/**
 * Récupérer l'utilisateur connecté
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("❌ Erreur getCurrentUser:", error);
    return null;
  }
}

/**
 * Récupérer les commandes depuis l'API
 */
async function fetchCommandes() {
  try {
    showLoading(true);
    hideError();

    console.log("📡 Chargement des commandes...");

    // Construire l'URL avec le filtre client si nécessaire
    let url = API_URL;
    if (currentUser && currentUser.clientId) {
      url += `?clientId=${currentUser.clientId}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Données reçues:", data);

    commandes = data.data || [];

    displayCommandes(commandes);
    updateStats(commandes);
    showLoading(false);
  } catch (error) {
    console.error("❌ Erreur fetchCommandes:", error);
    showError(`Impossible de charger les commandes: ${error.message}`);
    showLoading(false);
  }
}

/**
 * Afficher les commandes dans la liste
 */
function displayCommandes(commandesToDisplay) {
  const listContainer = document.getElementById("commandesList");

  if (!listContainer) {
    console.error("❌ Element #commandesList introuvable");
    return;
  }

  listContainer.innerHTML = "";

  if (commandesToDisplay.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
        <h3>Aucune commande trouvée</h3>
        <p>Vos commandes apparaîtront ici une fois synchronisées</p>
      </div>
    `;
    return;
  }

  commandesToDisplay.forEach((commande) => {
    const card = createCommandeCard(commande);
    listContainer.appendChild(card);
  });
}

/**
 * Créer une carte de commande
 */
function createCommandeCard(commande) {
  const card = document.createElement("div");
  card.className = "commande-card";
  card.onclick = () => viewCommande(commande.CommandeId);

  const etatClass = getEtatClass(commande.Etat);
  const etatIcon = getEtatIcon(commande.Etat);

  card.innerHTML = `
    <div class="commande-header">
      <div>
        <h3>${escapeHtml(commande.NumCommande)}</h3>
        <p class="commande-date">${formatDate(commande.DateCommande)}</p>
      </div>
      <span class="badge badge-${etatClass}">
        ${etatIcon} ${escapeHtml(commande.Etat)}
      </span>
    </div>
    <div class="commande-body">
      <div class="commande-info">
        <span class="info-label">Montant:</span>
        <span class="info-value">${formatMontant(commande.MontantTotal)}</span>
      </div>
      ${
        commande.Descriptions
          ? `
        <div class="commande-description">
          <span class="info-label">Description:</span>
          <p>${escapeHtml(commande.Descriptions)}</p>
        </div>
      `
          : ""
      }
    </div>
    <div class="commande-footer">
      <button class="btn-details" onclick="event.stopPropagation(); viewCommande(${
        commande.CommandeId
      })">
        Voir détails
      </button>
    </div>
  `;

  return card;
}

/**
 * Voir le détail d'une commande
 */
async function viewCommande(commandeId) {
  try {
    console.log("📋 Chargement détails commande:", commandeId);

    const response = await fetch(`${API_URL}/${commandeId}`);

    if (!response.ok) {
      throw new Error("Commande non trouvée");
    }

    const data = await response.json();
    const commande = data.data;

    showCommandeDetails(commande);
  } catch (error) {
    console.error("❌ Erreur viewCommande:", error);
    alert("Impossible de charger les détails de la commande");
  }
}

/**
 * Afficher les détails d'une commande dans le modal
 */
function showCommandeDetails(commande) {
  const modal = document.getElementById("detailsModal");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalBody) {
    console.error("❌ Modal introuvable");
    return;
  }

  const etatClass = getEtatClass(commande.Etat);
  const etatIcon = getEtatIcon(commande.Etat);

  modalBody.innerHTML = `
    <div class="detail-section">
      <h3>Informations générales</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Numéro de commande:</span>
          <span class="detail-value">${escapeHtml(commande.NumCommande)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Statut:</span>
          <span class="badge badge-${etatClass}">${etatIcon} ${escapeHtml(
    commande.Etat
  )}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Montant total:</span>
          <span class="detail-value">${formatMontant(
            commande.MontantTotal
          )}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date de commande:</span>
          <span class="detail-value">${formatDate(commande.DateCommande)}</span>
        </div>
      </div>
    </div>
    
    ${
      commande.Descriptions
        ? `
      <div class="detail-section">
        <h3>Description</h3>
        <p>${escapeHtml(commande.Descriptions)}</p>
      </div>
    `
        : ""
    }
    
    ${
      commande.NomClient
        ? `
      <div class="detail-section">
        <h3>Informations client</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Nom:</span>
            <span class="detail-value">${escapeHtml(commande.NomClient)}</span>
          </div>
          ${
            commande.Email
              ? `
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${escapeHtml(commande.Email)}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `
        : ""
    }
    
    ${
      commande.DerniereSynchro
        ? `
      <div class="detail-section">
        <p style="font-size: 12px; color: #999;">
          Dernière synchronisation: ${formatDate(commande.DerniereSynchro)}
        </p>
      </div>
    `
        : ""
    }
  `;

  modal.style.display = "flex";
}

/**
 * Fermer le modal
 */
function closeDetailsModal() {
  const modal = document.getElementById("detailsModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Mettre à jour les statistiques
 */
function updateStats(commandes) {
  console.log("📊 Mise à jour des stats:", commandes.length, "commandes");

  const stats = {
    total: commandes.length,
    enCours: 0,
    livrees: 0,
    montantTotal: 0,
  };

  commandes.forEach((cmd) => {
    const etat = cmd.Etat || "";
    const montant = parseFloat(cmd.MontantTotal) || 0;

    stats.montantTotal += montant;

    // Compter par état
    if (etat === "En préparation" || etat === "Expédié") {
      stats.enCours++;
    } else if (etat === "Livré") {
      stats.livrees++;
    }
  });

  console.log("📊 Stats calculées:", stats);

  // Mettre à jour le DOM
  const totalEl =
    document.getElementById("statTotal") ||
    document.querySelector('[id*="total"]');
  const coursEl =
    document.getElementById("statPreparation") ||
    document.querySelector('[id*="cours"]');
  const livreEl =
    document.getElementById("statLivre") ||
    document.querySelector('[id*="livre"]');
  const montantEl =
    document.getElementById("statMontant") ||
    document.querySelector('[id*="montant"]');

  if (totalEl) {
    totalEl.textContent = stats.total;
    console.log("  ✅ Total mis à jour:", stats.total);
  } else {
    console.warn("  ⚠️  Element statTotal introuvable");
  }

  if (coursEl) {
    coursEl.textContent = stats.enCours;
    console.log("  ✅ En cours mis à jour:", stats.enCours);
  }

  if (livreEl) {
    livreEl.textContent = stats.livrees;
    console.log("  ✅ Livrées mis à jour:", stats.livrees);
  }

  if (montantEl) {
    montantEl.textContent = formatMontant(stats.montantTotal);
    console.log("  ✅ Montant mis à jour:", stats.montantTotal);
  }
}

/**
 * Setup auto-refresh
 */
function setupAutoRefresh() {
  const refreshInterval = 30000; // 30 secondes

  autoRefreshInterval = setInterval(() => {
    console.log("🔄 Auto-refresh...");
    fetchCommandes();
  }, refreshInterval);

  console.log(`✅ Auto-refresh activé (${refreshInterval / 1000}s)`);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Bouton refresh
  const refreshBtn = document.getElementById("btnRefresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      console.log("🔄 Refresh manuel");
      fetchCommandes();
    });
  }

  // Bouton déconnexion
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
        logout();
      }
    });
  }

  // Filtre par statut
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      const etat = e.target.value;
      if (etat === "") {
        displayCommandes(commandes);
      } else {
        const filtered = commandes.filter((cmd) => cmd.Etat === etat);
        displayCommandes(filtered);
      }
    });
  }

  // Recherche
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      if (term === "") {
        displayCommandes(commandes);
      } else {
        const filtered = commandes.filter((cmd) => {
          const num = (cmd.NumCommande || "").toLowerCase();
          const desc = (cmd.Descriptions || "").toLowerCase();
          return num.includes(term) || desc.includes(term);
        });
        displayCommandes(filtered);
      }
    });
  }
}

/**
 * Déconnexion
 */
function logout() {
  console.log("👋 Déconnexion");
  sessionStorage.removeItem("currentUser");

  // Arrêter l'auto-refresh
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  window.location.href = "../login.html";
}

/**
 * UI Helpers
 */
function showLoading(show) {
  const loader = document.getElementById("loading");
  if (loader) {
    loader.style.display = show ? "flex" : "none";
  }
}

function showError(message) {
  const errorDiv = document.getElementById("error");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
  console.error("❌", message);
}

function hideError() {
  const errorDiv = document.getElementById("error");
  if (errorDiv) {
    errorDiv.style.display = "none";
  }
}

/**
 * Formatters
 */
function formatMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant);
}

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEtatClass(etat) {
  const classes = {
    "En préparation": "warning",
    Expédié: "info",
    Livré: "success",
    Annulé: "danger",
  };
  return classes[etat] || "secondary";
}

function getEtatIcon(etat) {
  const icons = {
    "En préparation": "⏳",
    Expédié: "🚚",
    Livré: "✅",
    Annulé: "❌",
  };
  return icons[etat] || "📦";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Exposer les fonctions globalement
window.viewCommande = viewCommande;
window.closeDetailsModal = closeDetailsModal;
window.logout = logout;
