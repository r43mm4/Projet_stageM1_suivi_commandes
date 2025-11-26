/**
 * ═══════════════════════════════════════════════════════════════
 * ADMIN DASHBOARD - GESTION COMPLÈTE
 * ═══════════════════════════════════════════════════════════════
 */

// Configuration API
const API_BASE_URL = "http://localhost:3000";
const API_URL = `${API_BASE_URL}/api`;

console.log("📍 API URL:", API_URL);

// Variables globales
let commandes = [];
let stats = {};
let autoRefreshInterval = null;
let currentUser = null;

/**
 * Initialisation
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin dashboard initialisé");

  // Vérifier l'authentification admin
  currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    console.warn("⚠️  Accès admin refusé, redirection...");
    window.location.href = "../login.html";
    return;
  }

  console.log("👤 Admin connecté:", currentUser.name);

  // Charger les données
  loadAllData();

  // Setup auto-refresh
  setupAutoRefresh();

  // Setup event listeners
  setupEventListeners();
});

/**
 * Charger toutes les données
 */
async function loadAllData() {
  await Promise.all([fetchStats(), fetchCommandes()]);
}

/**
 * Récupérer les statistiques
 */
async function fetchStats() {
  try {
    console.log("📊 Chargement des statistiques...");

    const response = await fetch(`${API_URL}/commandes/stats`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    stats = data.data;

    console.log("✅ Stats reçues:", stats);
    displayStats(stats);
  } catch (error) {
    console.error("❌ Erreur fetchStats:", error);
    showError("Impossible de charger les statistiques");
  }
}

/**
 * Afficher les statistiques
 */
function displayStats(stats) {
  // Total commandes
  const totalEl =
    document.querySelector('[id*="total"]') ||
    document.querySelector('h3:contains("Total")');
  if (totalEl) {
    const valueEl = totalEl.nextElementSibling || totalEl;
    valueEl.textContent = stats.total || 0;
  }

  // En préparation
  const prepEl = document.querySelector('[id*="preparation"]');
  if (prepEl) {
    prepEl.textContent = stats.parEtat?.["En préparation"] || 0;
  }

  // Expédiées
  const expedEl = document.querySelector('[id*="expedie"]');
  if (expedEl) {
    expedEl.textContent = stats.parEtat?.["Expédié"] || 0;
  }

  // Chiffre d'affaires
  const caEl = document.querySelector('[id*="affaires"]');
  if (caEl) {
    caEl.textContent = formatMontant(stats.montantTotal || 0);
  }

  console.log("✅ Statistiques affichées");
}

/**
 * Récupérer toutes les commandes
 */
async function fetchCommandes() {
  try {
    showLoading(true);

    console.log("📦 Chargement des commandes...");

    const response = await fetch(`${API_URL}/commandes?limit=100`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    commandes = data.data || [];

    console.log("✅ Commandes reçues:", commandes.length);
    displayCommandes(commandes);
    showLoading(false);
  } catch (error) {
    console.error("❌ Erreur fetchCommandes:", error);
    showError("Impossible de charger les commandes");
    showLoading(false);
  }
}

/**
 * Afficher les commandes
 */
function displayCommandes(commandesToDisplay) {
  const container =
    document.querySelector("#commandesList") ||
    document.querySelector(".commandes-list") ||
    document.querySelector("main");

  if (!container) {
    console.error("❌ Container commandes introuvable");
    return;
  }

  // Effacer le contenu existant
  container.innerHTML = "";

  if (commandesToDisplay.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #fff;">
        <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
        <h3>Aucune commande</h3>
        <p>Les commandes apparaîtront ici après synchronisation</p>
        <button onclick="syncNow()" style="margin-top: 20px; padding: 10px 20px; background: #fff; color: #5865f2; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
          🔄 Synchroniser maintenant
        </button>
      </div>
    `;
    return;
  }

  // Créer un tableau
  const table = document.createElement("table");
  table.style.cssText =
    "width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;";

  table.innerHTML = `
    <thead style="background: rgba(255,255,255,0.2);">
      <tr>
        <th style="padding: 15px; text-align: left; color: #fff;">Numéro</th>
        <th style="padding: 15px; text-align: left; color: #fff;">Client</th>
        <th style="padding: 15px; text-align: right; color: #fff;">Montant</th>
        <th style="padding: 15px; text-align: center; color: #fff;">État</th>
        <th style="padding: 15px; text-align: left; color: #fff;">Date</th>
        <th style="padding: 15px; text-align: center; color: #fff;">Actions</th>
      </tr>
    </thead>
    <tbody id="commandesTableBody"></tbody>
  `;

  container.appendChild(table);

  const tbody = document.getElementById("commandesTableBody");

  commandesToDisplay.forEach((cmd) => {
    const row = document.createElement("tr");
    row.style.cssText = "border-bottom: 1px solid rgba(255,255,255,0.1);";
    row.onmouseenter = () => (row.style.background = "rgba(255,255,255,0.05)");
    row.onmouseleave = () => (row.style.background = "transparent");

    row.innerHTML = `
      <td style="padding: 15px; color: #fff; font-weight: bold;">${escapeHtml(
        cmd.NumCommande
      )}</td>
      <td style="padding: 15px; color: #fff;">${escapeHtml(
        cmd.NomClient || "N/A"
      )}</td>
      <td style="padding: 15px; color: #fff; text-align: right;">${formatMontant(
        cmd.MontantTotal
      )}</td>
      <td style="padding: 15px; text-align: center;">
        <span style="padding: 5px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; ${getEtatStyle(
          cmd.Etat
        )}">
          ${getEtatIcon(cmd.Etat)} ${escapeHtml(cmd.Etat)}
        </span>
      </td>
      <td style="padding: 15px; color: #fff;">${formatDate(
        cmd.DateCommande
      )}</td>
      <td style="padding: 15px; text-align: center;">
        <button onclick="viewCommande(${
          cmd.CommandeId
        })" style="padding: 6px 12px; background: rgba(255,255,255,0.2); color: #fff; border: none; border-radius: 4px; cursor: pointer;">
          👁️ Voir
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  console.log("✅ Commandes affichées:", commandesToDisplay.length);
}

/**
 * Synchroniser maintenant
 */
async function syncNow() {
  try {
    console.log("🔄 Synchronisation manuelle...");

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = "⏳ Synchronisation...";

    const response = await fetch(`${API_URL}/admin/sync`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Échec de la synchronisation");
    }

    const data = await response.json();
    console.log("✅ Sync terminée:", data);

    alert(
      `Synchronisation réussie !\n\n${data.data.inserted} insérées\n${data.data.updated} mises à jour`
    );

    // Recharger les données
    await loadAllData();
  } catch (error) {
    console.error("❌ Erreur sync:", error);
    alert("Erreur lors de la synchronisation");
  }
}

/**
 * Voir une commande
 */
function viewCommande(id) {
  const cmd = commandes.find((c) => c.CommandeId === id);
  if (!cmd) return;

  alert(
    `Commande ${cmd.NumCommande}\n\nMontant: ${formatMontant(
      cmd.MontantTotal
    )}\nÉtat: ${cmd.Etat}\n\n${cmd.Descriptions || ""}`
  );
}

/**
 * Setup auto-refresh
 */
function setupAutoRefresh() {
  autoRefreshInterval = setInterval(() => {
    console.log("🔄 Auto-refresh...");
    loadAllData();
  }, 60000); // 1 minute

  console.log("✅ Auto-refresh activé (60s)");
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Bouton actualiser
  const refreshBtn =
    document.getElementById("btnRefresh") ||
    document.querySelector('[onclick*="refresh"]') ||
    document.querySelector('button:contains("Actualiser")');

  if (refreshBtn) {
    refreshBtn.onclick = () => {
      console.log("🔄 Refresh manuel");
      loadAllData();
    };
  }

  // Bouton déconnexion
  const logoutBtn =
    document.getElementById("btnLogout") ||
    document.querySelector('[onclick*="logout"]') ||
    document.querySelector('button:contains("Déconnexion")');

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
        logout();
      }
    };
  }

  // Filtre par statut
  const statusFilter = document.querySelector("select");
  if (statusFilter) {
    statusFilter.onchange = (e) => {
      const etat = e.target.value;
      if (etat === "" || etat === "Tous les statuts") {
        displayCommandes(commandes);
      } else {
        const filtered = commandes.filter((cmd) => cmd.Etat === etat);
        displayCommandes(filtered);
      }
    };
  }

  // Recherche
  const searchInput = document.querySelector('input[type="text"]');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const term = e.target.value.toLowerCase();
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
 * Helpers
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
}

function logout() {
  sessionStorage.removeItem("currentUser");
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  window.location.href = "../login.html";
}

function showLoading(show) {
  const loader =
    document.getElementById("loading") || document.querySelector(".loading");
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showError(message) {
  console.error("❌", message);
  alert(message);
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

function getEtatStyle(etat) {
  const styles = {
    "En préparation": "background: #ffc107; color: #000;",
    Expédié: "background: #17a2b8; color: #fff;",
    Livré: "background: #28a745; color: #fff;",
    Annulé: "background: #dc3545; color: #fff;",
  };
  return styles[etat] || "background: #6c757d; color: #fff;";
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

// Exposer globalement
window.syncNow = syncNow;
window.viewCommande = viewCommande;
window.logout = logout;
