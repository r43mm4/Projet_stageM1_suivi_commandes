/**
 * CLIENT DASHBOARD - MES COMMANDES UNIQUEMENT
 * VERSION DEBUG RENFORCEE
 */

const API_BASE_URL = "http://localhost:3000";
const API_URL = API_BASE_URL + "/api";

console.log("==============================================");
console.log("CLIENT DASHBOARD - DEMARRAGE");
console.log("API URL:", API_URL);
console.log("==============================================");

let mesCommandes = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("\n[INIT] Page chargee");

  currentUser = getCurrentUser();
  console.log("[INIT] User:", currentUser);

  if (!currentUser) {
    alert("Vous devez etre connecte");
    window.location.href = "../login.html";
    return;
  }

  if (currentUser.role !== "client") {
    alert("Acces refuse. Page reservee aux clients.");
    window.location.href = "../login.html";
    return;
  }

  if (!currentUser.clientId) {
    alert("ClientId manquant. Reconnectez-vous.");
    logout();
    return;
  }

  console.log("[INIT] Client authentifie:", {
    name: currentUser.name,
    email: currentUser.email,
    clientId: currentUser.clientId,
    clientIdType: typeof currentUser.clientId,
  });

  updateWelcomeMessage();
  fetchMesCommandes();
  setupEventListeners();

  console.log("[INIT] Initialisation terminee\n");
});

function updateWelcomeMessage() {
  const clientNameEl = document.getElementById("clientName");
  if (clientNameEl) {
    clientNameEl.textContent = currentUser.name || currentUser.email;
  }
}

async function fetchMesCommandes() {
  console.log("\n======================================");
  console.log("[API] DEBUT CHARGEMENT");
  console.log("======================================");

  try {
    showLoading(true);
    hideError();

    const clientId = currentUser.clientId;
    console.log("[API] ClientId cible:", clientId);
    console.log("[API] Type ClientId:", typeof clientId);

    const url = API_URL + "/commandes?clientId=" + clientId + "&limit=100";
    console.log("[API] URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    let allCommandes = data.data || [];

    console.log("[API] Reponse recue:", allCommandes.length, "commandes");

    // DEBUG: Afficher TOUTES les commandes avec leur ClientId
    console.log("\n[DEBUG] ANALYSE DE TOUTES LES COMMANDES:");
    console.log("========================================");
    allCommandes.forEach((cmd, index) => {
      console.log(
        index + 1 + ". " + cmd.NumCommande + " => ClientId:",
        cmd.ClientId,
        "(type:",
        typeof cmd.ClientId + ")"
      );
    });
    console.log("========================================\n");

    // FILTRAGE avec comparaison stricte ET souple
    console.log(
      "[FILTRAGE] ClientId recherche:",
      clientId,
      "(type:",
      typeof clientId + ")"
    );

    mesCommandes = allCommandes.filter((cmd) => {
      // Comparaison stricte
      const matchStrict = cmd.ClientId === clientId;
      // Comparaison souple (conversion en nombres)
      const matchLoose = parseInt(cmd.ClientId) === parseInt(clientId);
      // Comparaison string
      const matchString = String(cmd.ClientId) === String(clientId);

      const match = matchStrict || matchLoose || matchString;

      if (!match) {
        console.log(
          "[FILTRAGE] EXCLUE:",
          cmd.NumCommande,
          "ClientId:",
          cmd.ClientId,
          "(type:",
          typeof cmd.ClientId + ")",
          "vs recherche:",
          clientId,
          "(type:",
          typeof clientId + ")"
        );
      } else {
        console.log(
          "[FILTRAGE] GARDE:",
          cmd.NumCommande,
          "ClientId:",
          cmd.ClientId
        );
      }

      return match;
    });

    console.log("\n[FILTRAGE] RESULTAT:");
    console.log("  Avant filtrage:", allCommandes.length);
    console.log("  Apres filtrage:", mesCommandes.length);
    console.log(
      "  Commandes gardees:",
      mesCommandes.map((c) => c.NumCommande).join(", ")
    );

    if (mesCommandes.length > 0) {
      console.log("\n[DEBUG] Premiere commande gardee:");
      console.log(mesCommandes[0]);
    }

    displayCommandes(mesCommandes);
    updateStats(mesCommandes);

    showLoading(false);
    console.log("\n[API] CHARGEMENT TERMINE");
    console.log("======================================\n");
  } catch (error) {
    console.error("\n[API] ERREUR:", error);
    showError("Impossible de charger vos commandes: " + error.message);
    showLoading(false);
  }
}

function displayCommandes(commandesToDisplay) {
  console.log("\n[UI] AFFICHAGE:", commandesToDisplay.length, "commandes");

  const container = document.getElementById("commandesList");
  const emptyMsg = document.getElementById("emptyMessage");

  if (!container) {
    console.error("[UI] ERREUR: commandesList introuvable");
    return;
  }

  container.innerHTML = "";

  if (commandesToDisplay.length === 0) {
    console.log("[UI] Aucune commande a afficher");
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  commandesToDisplay.forEach((cmd) => {
    const card = createCommandeCard(cmd);
    container.appendChild(card);
  });

  console.log("[UI] Cartes ajoutees au DOM\n");
}

function createCommandeCard(cmd) {
  const card = document.createElement("div");
  card.className = "commande-card";

  const statusClass = getStatusClass(cmd.Etat);
  const statusIcon = getStatusIcon(cmd.Etat);

  card.innerHTML = `
    <div class="card-header">
      <div>
        <span class="order-number">${escapeHtml(cmd.NumCommande)}</span>
        <span class="order-date">${formatDate(cmd.DateCommande)}</span>
      </div>
      <span class="status status-${statusClass}">
        ${statusIcon} ${escapeHtml(cmd.Etat)}
      </span>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Montant</span>
        <span class="value amount">${formatMontant(cmd.MontantTotal)}</span>
      </div>

      ${
        cmd.Descriptions
          ? `
      <div class="info-row">
        <span class="label">Description</span>
        <span class="value">${escapeHtml(cmd.Descriptions)}</span>
      </div>
      `
          : ""
      }

      <div class="info-row">
        <span class="label">Derniere MAJ</span>
        <span class="value">${formatDateTime(cmd.DerniereModif)}</span>
      </div>
    </div>

    <div class="card-footer">
      <button class="btn-details" onclick="showCommandeDetails(${
        cmd.CommandeId
      })">
        Voir details
      </button>
      ${
        cmd.Etat === "En preparation"
          ? `
        <button class="btn-cancel" onclick="cancelCommande(${cmd.CommandeId})">
          Annuler
        </button>
      `
          : ""
      }
    </div>
  `;

  return card;
}

function showCommandeDetails(id) {
  const cmd = mesCommandes.find((c) => c.CommandeId === id);
  if (!cmd) {
    alert("Commande introuvable");
    return;
  }

  const details = `
DETAILS DE LA COMMANDE
========================================

Numero: ${cmd.NumCommande}
Date: ${formatDate(cmd.DateCommande)}
Montant: ${formatMontant(cmd.MontantTotal)}
Statut: ${cmd.Etat}

${cmd.Descriptions ? "Description:\n" + cmd.Descriptions + "\n" : ""}

Derniere modification:
${formatDateTime(cmd.DerniereModif)}

========================================
  `;

  alert(details);
}

async function cancelCommande(id) {
  const cmd = mesCommandes.find((c) => c.CommandeId === id);

  if (!cmd) {
    alert("Commande introuvable");
    return;
  }

  if (cmd.Etat !== "En preparation") {
    alert("Seules les commandes en preparation peuvent etre annulees");
    return;
  }

  if (!confirm("Annuler la commande " + cmd.NumCommande + " ?")) {
    return;
  }

  try {
    const response = await fetch(API_URL + "/commandes/" + id + "/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newStatus: "Annule" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Echec annulation");
    }

    alert("Commande annulee avec succes");
    await fetchMesCommandes();
  } catch (error) {
    console.error("[ACTION] Erreur:", error);
    alert("Erreur: " + error.message);
  }
}

function updateStats(commandes) {
  const total = commandes.length;
  const enCours = commandes.filter(
    (c) => c.Etat === "En preparation" || c.Etat === "Expedie"
  ).length;
  const livrees = commandes.filter((c) => c.Etat === "Livre").length;
  const montantTotal = commandes.reduce(
    (sum, c) => sum + (c.MontantTotal || 0),
    0
  );

  const totalEl = document.getElementById("totalCommandes");
  const enCoursEl = document.getElementById("commandesEnCours");
  const livreesEl = document.getElementById("commandesLivrees");
  const montantEl = document.getElementById("montantTotal");

  if (totalEl) totalEl.textContent = total;
  if (enCoursEl) enCoursEl.textContent = enCours;
  if (livreesEl) livreesEl.textContent = livrees;
  if (montantEl) montantEl.textContent = formatMontant(montantTotal);
}

function setupEventListeners() {
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.onclick = () => fetchMesCommandes();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm("Se deconnecter ?")) logout();
    };
  }

  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.onchange = (e) => {
      const etat = e.target.value;
      if (etat === "") {
        displayCommandes(mesCommandes);
      } else {
        const filtered = mesCommandes.filter((cmd) => cmd.Etat === etat);
        displayCommandes(filtered);
      }
    };
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.oninput = (e) => {
      const term = e.target.value.toLowerCase();
      if (term === "") {
        displayCommandes(mesCommandes);
      } else {
        const filtered = mesCommandes.filter((cmd) => {
          const num = (cmd.NumCommande || "").toLowerCase();
          const desc = (cmd.Descriptions || "").toLowerCase();
          return num.includes(term) || desc.includes(term);
        });
        displayCommandes(filtered);
      }
    };
  }

  const tabMesCommandes = document.getElementById("tabMesCommandes");
  const tabNouvelleCommande = document.getElementById("tabNouvelleCommande");
  const viewMesCommandes = document.getElementById("mesCommandesView");
  const viewNouvelleCommande = document.getElementById("nouvelleCommandeView");

  if (tabMesCommandes) {
    tabMesCommandes.onclick = () => {
      tabMesCommandes.classList.add("active");
      if (tabNouvelleCommande) tabNouvelleCommande.classList.remove("active");
      if (viewMesCommandes) viewMesCommandes.style.display = "block";
      if (viewNouvelleCommande) viewNouvelleCommande.style.display = "none";
    };
  }

  if (tabNouvelleCommande) {
    tabNouvelleCommande.onclick = () => {
      tabNouvelleCommande.classList.add("active");
      if (tabMesCommandes) tabMesCommandes.classList.remove("active");
      if (viewNouvelleCommande) viewNouvelleCommande.style.display = "block";
      if (viewMesCommandes) viewMesCommandes.style.display = "none";
    };
  }
}

function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("[SESSION] Erreur:", error);
    return null;
  }
}

function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.replace("../login.html");
}

function showLoading(show) {
  const loader = document.getElementById("loading");
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showError(message) {
  const errorDiv = document.getElementById("error");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

function hideError() {
  const errorDiv = document.getElementById("error");
  if (errorDiv) errorDiv.style.display = "none";
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
    month: "long",
    day: "numeric",
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

function getStatusIcon(etat) {
  return "";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.showCommandeDetails = showCommandeDetails;
window.cancelCommande = cancelCommande;
window.logout = logout;

console.log("CLIENT DASHBOARD - Pret\n");
