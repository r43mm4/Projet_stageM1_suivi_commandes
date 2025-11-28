/**
 * ADMIN DASHBOARD - GESTION DE TOUTES LES COMMANDES
 */

const API_BASE_URL = "http://localhost:3000";
const API_URL = API_BASE_URL + "/api";

console.log("Admin Dashboard - API URL:", API_URL);

let commandes = [];
let currentUser = null;

/**
 * Initialisation
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin dashboard initialise");

  // Verifier authentification admin
  currentUser = getCurrentUser();

  if (!currentUser) {
    console.warn("Non authentifie, redirection login...");
    window.location.href = "../login.html";
    return;
  }

  if (currentUser.role !== "admin") {
    console.warn("Acces admin requis, role actuel:", currentUser.role);
    alert("Acces refuse. Vous devez etre administrateur.");
    window.location.href = "../login.html";
    return;
  }

  console.log("Admin connecte:", currentUser.name);

  // Charger les donnees
  loadAllData();

  // Setup listeners
  setupEventListeners();
});

/**
 * Charger toutes les donnees
 */
async function loadAllData() {
  await Promise.all([fetchStats(), fetchCommandes()]);
}

/**
 * Recuperer les statistiques globales
 */
async function fetchStats() {
  try {
    console.log("Chargement statistiques...");

    const response = await fetch(API_URL + "/commandes/stats");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    console.log("Stats recues:", data.data);

    displayStats(data.data);
  } catch (error) {
    console.error("Erreur stats:", error);
    // Ne pas bloquer si les stats echouent
  }
}

/**
 * Afficher les statistiques
 */
function displayStats(stats) {
  const totalEl = document.getElementById("totalOrders");
  if (totalEl) totalEl.textContent = stats.total || 0;

  const prepEl = document.getElementById("preparationOrders");
  if (prepEl)
    prepEl.textContent = stats.parEtat
      ? stats.parEtat["En preparation"] || 0
      : 0;

  const shipEl = document.getElementById("shippedOrders");
  if (shipEl)
    shipEl.textContent = stats.parEtat ? stats.parEtat["Expedie"] || 0 : 0;

  const revenueEl = document.getElementById("totalRevenue");
  if (revenueEl) revenueEl.textContent = formatMontant(stats.montantTotal || 0);

  console.log("Stats affichees");
}

/**
 * Recuperer TOUTES les commandes (pas de filtre clientId)
 */
async function fetchCommandes() {
  try {
    showLoading(true);
    hideError();

    console.log("Chargement de TOUTES les commandes (admin)...");

    // PAS de filtre clientId pour l'admin
    const url = API_URL + "/commandes?limit=100";
    console.log("Requete:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("HTTP " + response.status + ": " + response.statusText);
    }

    const data = await response.json();
    console.log("Reponse API:", data);

    commandes = data.data || [];
    console.log("Total commandes chargees:", commandes.length);

    displayCommandes(commandes);
    showLoading(false);
  } catch (error) {
    console.error("Erreur chargement commandes:", error);
    showError(
      "Impossible de charger les commandes. Verifiez que le serveur est demarre."
    );
    showLoading(false);
  }
}

/**
 * Afficher les commandes sous forme de tableau
 */
function displayCommandes(commandesToDisplay) {
  const container = document.getElementById("commandesList");
  const emptyMsg = document.getElementById("emptyMessage");
  const visibleCount = document.getElementById("visibleCount");

  if (!container) {
    console.error("Element #commandesList introuvable");
    return;
  }

  console.log("Affichage de", commandesToDisplay.length, "commandes");

  container.innerHTML = "";

  if (commandesToDisplay.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    if (visibleCount) visibleCount.textContent = "0";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";
  if (visibleCount) visibleCount.textContent = commandesToDisplay.length;

  // Creer le tableau
  const table = document.createElement("table");
  table.className = "orders-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Numero Commande</th>
        <th>Client</th>
        <th>Date</th>
        <th>Montant</th>
        <th>Statut</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  commandesToDisplay.forEach((cmd) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Numero Commande">
        <strong>${escapeHtml(cmd.NumCommande)}</strong>
      </td>
      <td data-label="Client">${escapeHtml(cmd.NomClient || "N/A")}</td>
      <td data-label="Date">${formatDate(cmd.DateCommande)}</td>
      <td data-label="Montant">
        <span class="amount">${formatMontant(cmd.MontantTotal)}</span>
      </td>
      <td data-label="Statut">
        <span class="status status-${getStatusClass(cmd.Etat)}">
          ${escapeHtml(cmd.Etat)}
        </span>
      </td>
      <td data-label="Actions">
        <button class="btn-view" onclick="viewCommande(${cmd.CommandeId})">
          Voir
        </button>
        <button class="btn-edit" onclick="editCommandeStatus(${
          cmd.CommandeId
        })">
          Modifier
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  container.appendChild(table);
  console.log("Tableau affiche");
}

/**
 * Voir details d'une commande
 */
function viewCommande(id) {
  const cmd = commandes.find((c) => c.CommandeId === id);
  if (!cmd) {
    alert("Commande introuvable");
    return;
  }

  const details = `
DETAILS COMMANDE
========================================

Numero: ${cmd.NumCommande}
Client: ${cmd.NomClient || "N/A"}
Email: ${cmd.Email || "N/A"}
Montant: ${formatMontant(cmd.MontantTotal)}
Etat: ${cmd.Etat}
Date: ${formatDate(cmd.DateCommande)}

${cmd.Descriptions ? "Description:\n" + cmd.Descriptions + "\n" : ""}

Derniere modification: ${formatDateTime(cmd.DerniereModif)}
Salesforce ID: ${cmd.SalesforceId || "N/A"}

========================================
  `;

  alert(details);
}

/**
 * Modifier le statut d'une commande
 */
async function editCommandeStatus(id) {
  const cmd = commandes.find((c) => c.CommandeId === id);
  if (!cmd) {
    alert("Commande introuvable");
    return;
  }

  const nouveauStatut = prompt(
    "Nouveau statut pour commande " +
      cmd.NumCommande +
      " ?\n\n" +
      "Statut actuel: " +
      cmd.Etat +
      "\n\n" +
      "Entrez:\n" +
      "1 = En preparation\n" +
      "2 = Expedie\n" +
      "3 = Livre\n" +
      "4 = Annule"
  );

  if (!nouveauStatut) return;

  const statutMap = {
    1: "En preparation",
    2: "Expedie",
    3: "Livre",
    4: "Annule",
  };

  const statut = statutMap[nouveauStatut];

  if (!statut) {
    alert("Choix invalide");
    return;
  }

  try {
    console.log("Modification statut commande", id, "vers", statut);

    const response = await fetch(API_URL + "/commandes/" + id + "/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newStatus: statut }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Echec mise a jour");
    }

    alert("Statut mis a jour avec succes");

    // Recharger les donnees
    await loadAllData();
  } catch (error) {
    console.error("Erreur modification statut:", error);
    alert("Erreur: " + error.message);
  }
}

/**
 * Synchroniser Salesforce maintenant
 */
async function syncNow() {
  if (!confirm("Lancer une synchronisation Salesforce maintenant ?")) {
    return;
  }

  try {
    console.log("Synchronisation...");

    const response = await fetch(API_URL + "/admin/sync", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Echec synchronisation");
    }

    const data = await response.json();
    console.log("Sync terminee:", data.data);

    const duration = (data.data.duration / 1000).toFixed(1);

    alert(
      "Synchronisation reussie !\n\n" +
        "Commandes inserees: " +
        data.data.inserted +
        "\n" +
        "Commandes mises a jour: " +
        data.data.updated +
        "\n" +
        "Erreurs: " +
        data.data.errors +
        "\n" +
        "Duree: " +
        duration +
        "s"
    );

    // Recharger les donnees
    await loadAllData();
  } catch (error) {
    console.error("Erreur sync:", error);
    alert("Erreur lors de la synchronisation: " + error.message);
  }
}

/**
 * Exporter les donnees en CSV
 */
function exportData() {
  if (commandes.length === 0) {
    alert("Aucune donnee a exporter");
    return;
  }

  // Creer CSV
  let csv = "Numero,Client,Email,Date,Montant,Etat,Description\n";

  commandes.forEach((cmd) => {
    const desc = (cmd.Descriptions || "").replace(/"/g, '""');
    csv +=
      '"' +
      cmd.NumCommande +
      '",' +
      '"' +
      (cmd.NomClient || "") +
      '",' +
      '"' +
      (cmd.Email || "") +
      '",' +
      '"' +
      formatDate(cmd.DateCommande) +
      '",' +
      '"' +
      cmd.MontantTotal +
      '",' +
      '"' +
      cmd.Etat +
      '",' +
      '"' +
      desc +
      '"\n';
  });

  // Telecharger
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "commandes_" + new Date().toISOString().split("T")[0] + ".csv";
  a.click();
  URL.revokeObjectURL(url);

  console.log("Export CSV termine");
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Refresh
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      console.log("Refresh");
      loadAllData();
    };
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm("Se deconnecter ?")) {
        logout();
      }
    };
  }

  // Filtre statut
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.onchange = (e) => {
      const etat = e.target.value;
      console.log("Filtre statut:", etat);

      if (etat === "") {
        displayCommandes(commandes);
      } else {
        const filtered = commandes.filter((cmd) => cmd.Etat === etat);
        displayCommandes(filtered);
      }
    };
  }

  // Recherche
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.oninput = (e) => {
      const term = e.target.value.toLowerCase();
      console.log("Recherche:", term);

      if (term === "") {
        displayCommandes(commandes);
      } else {
        const filtered = commandes.filter((cmd) => {
          const num = (cmd.NumCommande || "").toLowerCase();
          const client = (cmd.NomClient || "").toLowerCase();
          return num.includes(term) || client.includes(term);
        });
        displayCommandes(filtered);
      }
    };
  }
}

/**
 * HELPERS
 */

function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Erreur recuperation user:", error);
    return null;
  }
}

function logout() {
  console.log("Deconnexion");
  sessionStorage.removeItem("currentUser");
  window.location.replace("../login.html");
}

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
    errorDiv.style.background = "#fee";
    errorDiv.style.color = "#c00";
    errorDiv.style.padding = "20px";
    errorDiv.style.borderRadius = "8px";
    errorDiv.style.margin = "20px 0";
  }
}

function hideError() {
  const errorDiv = document.getElementById("error");
  if (errorDiv) {
    errorDiv.style.display = "none";
  }
}

function formatMontant(montant) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant || 0);
}

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(etat) {
  const map = {
    "En preparation": "preparation",
    Expedie: "expedie",
    Livre: "livre",
    Annule: "annule",
  };
  return map[etat] || "preparation";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Exposer globalement
window.syncNow = syncNow;
window.exportData = exportData;
window.viewCommande = viewCommande;
window.editCommandeStatus = editCommandeStatus;
window.logout = logout;

console.log("Admin Dashboard charge et pret");
