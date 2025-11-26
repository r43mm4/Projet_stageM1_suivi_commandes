// backend/server.js
// ============================================
// IMPORTANT: Cette ligne DOIT être LA PREMIÈRE
// ============================================
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Maintenant les autres imports
const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const commandesRoutes = require("./routes/commandes");
app.use("/api", commandesRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔧 Environnement: ${process.env.NODE_ENV || "development"}`);

  // Vérifier que les variables d'environnement sont chargées
  if (process.env.SF_CLIENT_ID) {
    console.log("✅ Variables Salesforce chargées");
  } else {
    console.error("❌ ERREUR: Variables Salesforce NON chargées!");
    console.error("→ Vérifiez que le fichier .env existe dans backend/");
  }
});
