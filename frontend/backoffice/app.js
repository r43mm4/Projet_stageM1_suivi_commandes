// ==================== CONFIGURATION ====================
const API_URL = "http://localhost:3000/api";
let commandes = [];
let autoRefreshInterval = null;
let currentCommandeId = null;

// ==================== FONCTIONS UTILITAIRES ====================

// Afficher/Masquer le spinner de chargement
function showLoading(show) {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = show ? "flex" : "none";
}

// Afficher un message d'erreur
function showError(message) {
  const errorEl = document.getElementById("error");
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

// Masquer le message d'erreur
function hideError() {
  const errorEl = document.getElementById("error");
  errorEl.style.display = "none";
}

// Obtenir la classe CSS pour le statut
function getStatusClass(etat) {
  const statusMap = {
    "En préparation": "preparation",
    Expédié: "expedie",
    Livré: "livre",
    Annulé: "annule",
  };
  return statusMap[etat] || "preparation";
}

// Formater la date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("fr-FR", options);
}

// Mettre à jour les statistiques
function updateStats(total, displayed) {
  document.getElementById("totalCommandes").textContent = total;
  document.getElementById("displayedCommandes").textContent = displayed;
}

// ==================== RÉCUPÉRATION DES COMMANDES ====================
async function fetchCommandes() {
  try {
    showLoading(true);
    hideError();

    console.log("Récupération des commandes depuis l'API...");

    const response = await fetch(`${API_URL}/commandes`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("Données reçues:", data);

    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    commandes = data.data || [];
    console.log(`${commandes.length} commandes chargées`);

    displayCommandes(commandes);
    updateStats(data.total || commandes.length, commandes.length);
    showLoading(false);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    showError(
      "Impossible de charger les commandes. Vérifiez que le serveur est démarré sur http://localhost:3000"
    );
    showLoading(false);
  }
}

// ==================== AFFICHAGE DES COMMANDES ====================
function displayCommandes(commandesToDisplay) {
  const tbody = document.getElementById("ordersBody");
  tbody.innerHTML = "";

  if (commandesToDisplay.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 40px;">Aucune commande trouvée</td></tr>';
    return;
  }

  commandesToDisplay.forEach((commande) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Numéro">
        <strong>${commande.NumCommande}</strong>
      </td>
      <td data-label="Montant">
        <span class="amount">${commande.Montant.toFixed(2)} €</span>
      </td>
      <td data-label="État">
        <span class="status status-${getStatusClass(commande.Etat)}">
          ${commande.Etat}
        </span>
      </td>
      <td data-label="Date">
        ${formatDate(commande.CreatedAt)}
      </td>
      <td data-label="Actions">
        <button 
          onclick="openStatusModal(${commande.CommandeId}, '${commande.Etat}')" 
          class="btn-modify"
          title="Modifier le statut"
        >
          Modifier
        </button>
        <button 
          onclick="viewDetails(${commande.CommandeId})" 
          class="btn-view"
          title="Voir les détails"
        >
          Détails
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== VOIR DÉTAILS D'UNE COMMANDE ====================
async function viewDetails(commandeId) {
  try {
    console.log(`Récupération des détails de la commande ${commandeId}...`);

    const response = await fetch(`${API_URL}/commandes/${commandeId}`);

    if (!response.ok) {
      throw new Error("Commande non trouvée");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur");
    }

    const commande = data.data;

    alert(`
DÉTAILS DE LA COMMANDE

Numéro: ${commande.NumCommande}
Montant: ${commande.Montant.toFixed(2)} €
État: ${commande.Etat}
Date de création: ${formatDate(commande.CreatedAt)}
Dernière mise à jour: ${formatDate(commande.LastSyncedAt)}

Description:
${commande.Descriptions || "Aucune description"}
    `);
  } catch (error) {
    console.error("❌ Erreur:", error);
    alert("Impossible de récupérer les détails de cette commande");
  }
}

// ==================== MODIFIER LE STATUT ====================
async function updateStatus(commandeId, newStatus) {
  try {
    console.log(
      `🔄 Modification du statut de la commande ${commandeId} → ${newStatus}`
    );

    const response = await fetch(`${API_URL}/commandes/${commandeId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newStatus }),
    });

    if (!response.ok) {
      throw new Error("Échec de la modification du statut");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur");
    }

    console.log("Statut modifié avec succès");

    // Rafraîchir les commandes
    await fetchCommandes();

    alert(
      `Statut modifié avec succès!\n\nCommande: ${commandeId}\nNouveau statut: ${newStatus}`
    );
  } catch (error) {
    console.error("Erreur lors de la modification du statut:", error);
    alert("Erreur lors de la modification du statut");
  }
}

// ==================== FILTRAGE ====================
function filterCommandes() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;

  console.log(`Filtrage: recherche="${searchTerm}", statut="${statusFilter}"`);

  let filtered = commandes;

  // Filtrer par terme de recherche
  if (searchTerm) {
    filtered = filtered.filter((commande) =>
      commande.NumCommande.toLowerCase().includes(searchTerm)
    );
  }

  // Filtrer par statut
  if (statusFilter) {
    filtered = filtered.filter((commande) => commande.Etat === statusFilter);
  }

  console.log(`${filtered.length} commandes après filtrage`);

  displayCommandes(filtered);
  updateStats(commandes.length, filtered.length);
}

// ==================== AUTO-REFRESH ====================
function toggleAutoRefresh() {
  const checkbox = document.getElementById("autoRefresh");

  if (checkbox.checked) {
    console.log("Auto-refresh activé (5 secondes)");
    autoRefreshInterval = setInterval(fetchCommandes, 5000);
  } else {
    console.log("Auto-refresh désactivé");
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }
}

// ==================== MODAL ====================
function openStatusModal(commandeId, currentStatus) {
  console.log(`Ouverture modal pour commande ${commandeId}`);
  currentCommandeId = commandeId;
  document.getElementById("newStatus").value = currentStatus;
  document.getElementById("statusModal").style.display = "flex";
}

function closeStatusModal() {
  console.log("Fermeture modal");
  document.getElementById("statusModal").style.display = "none";
  currentCommandeId = null;
}

// ==================== EVENT LISTENERS ====================

// Recherche et filtres
document
  .getElementById("searchInput")
  .addEventListener("input", filterCommandes);
document
  .getElementById("statusFilter")
  .addEventListener("change", filterCommandes);

// Auto-refresh
document
  .getElementById("autoRefresh")
  .addEventListener("change", toggleAutoRefresh);

// Bouton refresh
document.getElementById("refreshBtn").addEventListener("click", () => {
  console.log("🔄 Refresh manuel déclenché");
  fetchCommandes();
});

// Modal - Bouton sauvegarder
document.getElementById("saveStatus").addEventListener("click", async () => {
  const newStatus = document.getElementById("newStatus").value;
  await updateStatus(currentCommandeId, newStatus);
  closeStatusModal();
});

// Modal - Bouton annuler (déjà géré par onclick dans le HTML)

// Fermer modal en cliquant en dehors
document.getElementById("statusModal").addEventListener("click", (e) => {
  if (e.target.id === "statusModal") {
    closeStatusModal();
  }
});

// ==================== INITIALISATION ====================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Application chargée");
  console.log(`📍 API URL: ${API_URL}`);

  // Charger les commandes
  fetchCommandes();

  // Démarrer l'auto-refresh si activé
  toggleAutoRefresh();
});
