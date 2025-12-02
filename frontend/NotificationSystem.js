/**
 * ═══════════════════════════════════════════════════════════════
 * SYSTÈME DE NOTIFICATIONS - EPIC 5 - Story 5.1
 * Gestionnaire complet de notifications en temps réel
 * ═══════════════════════════════════════════════════════════════
 */

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
    this.preferences = this.loadPreferences();

    console.log("🔔 Système de notifications initialisé");
  }

  // ============================================
  // INITIALISATION
  // ============================================

  init() {
    if (this.isInitialized) return;

    this.loadNotifications();
    this.createNotificationCenter();
    this.createBadge();
    this.updateBadge();

    this.isInitialized = true;
    console.log("✅ Centre de notifications prêt");
  }

  // ============================================
  // CRÉATION DES ÉLÉMENTS UI
  // ============================================

  createNotificationCenter() {
    // Créer le bouton d'ouverture
    const notifButton = document.createElement("button");
    notifButton.id = "notificationButton";
    notifButton.className = "notification-button";
    notifButton.innerHTML = `
      🔔
      <span class="notification-badge" id="notificationBadge">0</span>
    `;
    notifButton.onclick = () => this.toggleNotificationCenter();

    // Créer le panneau de notifications
    const notifPanel = document.createElement("div");
    notifPanel.id = "notificationPanel";
    notifPanel.className = "notification-panel";
    notifPanel.style.display = "none";
    notifPanel.innerHTML = `
      <div class="notification-panel-header">
        <h3>🔔 Notifications</h3>
        <div class="notification-actions">
          <button class="btn-icon" onclick="notificationSystem.markAllAsRead()" title="Tout marquer comme lu">
            ✓
          </button>
          <button class="btn-icon" onclick="notificationSystem.clearAll()" title="Tout effacer">
            🗑️
          </button>
          <button class="btn-icon" onclick="notificationSystem.toggleNotificationCenter()" title="Fermer">
            ✕
          </button>
        </div>
      </div>
      <div class="notification-panel-body" id="notificationList">
        <div class="notification-empty">
          <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
          <p>Aucune notification</p>
        </div>
      </div>
      <div class="notification-panel-footer">
        <label class="notification-toggle">
          <input type="checkbox" id="notificationSound" ${
            this.preferences.sound ? "checked" : ""
          } 
                 onchange="notificationSystem.toggleSound()">
          <span>🔊 Sons activés</span>
        </label>
      </div>
    `;

    // Ajouter au DOM
    document.body.appendChild(notifButton);
    document.body.appendChild(notifPanel);

    // Fermer si clic à l'extérieur
    document.addEventListener("click", (e) => {
      if (!notifPanel.contains(e.target) && !notifButton.contains(e.target)) {
        notifPanel.style.display = "none";
      }
    });
  }

  createBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge) {
      badge.style.display = this.unreadCount > 0 ? "flex" : "none";
    }
  }

  // ============================================
  // GESTION DES NOTIFICATIONS
  // ============================================

  /**
   * Ajouter une nouvelle notification
   * @param {Object} notification - Données de la notification
   */
  addNotification(notification) {
    const notif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    this.notifications.unshift(notif);

    // Limiter à 50 notifications max
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.unreadCount++;
    this.updateBadge();
    this.saveNotifications();
    this.updateNotificationList();

    // Afficher le toast
    this.showToast(notif);

    // Jouer le son
    if (this.preferences.sound) {
      this.playNotificationSound();
    }

    console.log("🔔 Nouvelle notification:", notif);
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notifId) {
    const notif = this.notifications.find((n) => n.id === notifId);
    if (notif && !notif.read) {
      notif.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateBadge();
      this.saveNotifications();
      this.updateNotificationList();
    }
  }

  /**
   * Marquer toutes comme lues
   */
  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.unreadCount = 0;
    this.updateBadge();
    this.saveNotifications();
    this.updateNotificationList();

    this.showToast({
      type: "success",
      title: "Notifications",
      message: "Toutes les notifications ont été marquées comme lues",
    });
  }

  /**
   * Supprimer une notification
   */
  deleteNotification(notifId) {
    const index = this.notifications.findIndex((n) => n.id === notifId);
    if (index !== -1) {
      const notif = this.notifications[index];
      if (!notif.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      this.notifications.splice(index, 1);
      this.updateBadge();
      this.saveNotifications();
      this.updateNotificationList();
    }
  }

  /**
   * Effacer toutes les notifications
   */
  clearAll() {
    if (this.notifications.length === 0) return;

    if (confirm("Voulez-vous vraiment effacer toutes les notifications ?")) {
      this.notifications = [];
      this.unreadCount = 0;
      this.updateBadge();
      this.saveNotifications();
      this.updateNotificationList();

      this.showToast({
        type: "info",
        title: "Notifications",
        message: "Toutes les notifications ont été effacées",
      });
    }
  }

  // ============================================
  // AFFICHAGE
  // ============================================

  toggleNotificationCenter() {
    const panel = document.getElementById("notificationPanel");
    if (panel) {
      const isVisible = panel.style.display === "block";
      panel.style.display = isVisible ? "none" : "block";

      if (!isVisible) {
        this.updateNotificationList();
      }
    }
  }

  updateBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? "flex" : "none";
    }
  }

  updateNotificationList() {
    const list = document.getElementById("notificationList");
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div class="notification-empty">
          <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
          <p>Aucune notification</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.notifications
      .map((notif) => this.createNotificationItem(notif))
      .join("");
  }

  createNotificationItem(notif) {
    const icon = this.getNotificationIcon(notif.type);
    const timeAgo = this.getTimeAgo(notif.timestamp);
    const unreadClass = notif.read ? "" : "notification-item-unread";

    return `
      <div class="notification-item ${unreadClass}" 
           onclick="notificationSystem.markAsRead(${notif.id})"
           data-id="${notif.id}">
        <div class="notification-icon ${notif.type}">
          ${icon}
        </div>
        <div class="notification-content">
          <div class="notification-title">${this.escapeHtml(notif.title)}</div>
          <div class="notification-message">${this.escapeHtml(
            notif.message
          )}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
        <button class="notification-delete" 
                onclick="event.stopPropagation(); notificationSystem.deleteNotification(${
                  notif.id
                })"
                title="Supprimer">
          ✕
        </button>
      </div>
    `;
  }

  /**
   * Afficher un toast (notification temporaire)
   */
  showToast(notification) {
    const toast = document.createElement("div");
    toast.className = `notification-toast notification-toast-${notification.type}`;

    const icon = this.getNotificationIcon(notification.type);

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(notification.title)}</div>
        <div class="toast-message">${this.escapeHtml(
          notification.message
        )}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    // Container pour les toasts
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Animation d'entrée
    setTimeout(() => toast.classList.add("toast-show"), 10);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // ============================================
  // SONS
  // ============================================

  playNotificationSound() {
    // Son de notification simple
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  toggleSound() {
    this.preferences.sound = !this.preferences.sound;
    this.savePreferences();

    this.showToast({
      type: "info",
      title: "Paramètres",
      message: this.preferences.sound ? "Sons activés" : "Sons désactivés",
    });
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  getNotificationIcon(type) {
    const icons = {
      success: "✅",
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      order: "📦",
      delivery: "🚚",
      update: "🔄",
    };
    return icons[type] || "🔔";
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // en secondes

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;

    return time.toLocaleDateString("fr-FR");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // PERSISTANCE
  // ============================================

  saveNotifications() {
    try {
      localStorage.setItem("notifications", JSON.stringify(this.notifications));
      localStorage.setItem(
        "notificationUnreadCount",
        this.unreadCount.toString()
      );
    } catch (error) {
      console.error("Erreur sauvegarde notifications:", error);
    }
  }

  loadNotifications() {
    try {
      const saved = localStorage.getItem("notifications");
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.unreadCount = parseInt(
          localStorage.getItem("notificationUnreadCount") || "0"
        );
      }
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      this.notifications = [];
      this.unreadCount = 0;
    }
  }

  savePreferences() {
    try {
      localStorage.setItem(
        "notificationPreferences",
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error("Erreur sauvegarde préférences:", error);
    }
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem("notificationPreferences");
      return saved ? JSON.parse(saved) : { sound: true, desktop: false };
    } catch (error) {
      return { sound: true, desktop: false };
    }
  }
}

// Créer l'instance globale
const notificationSystem = new NotificationSystem();

// Exposer globalement
window.notificationSystem = notificationSystem;

console.log("✅ NotificationSystem chargé et prêt");
