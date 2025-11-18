require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== ROUTES ====================
const commandesRouter = require("./routes/commandes");
app.use("/api/commandes", commandesRouter);

// Route santé
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Route racine
app.get("/", (req, res) => {
  res.send(
    '<h1>API Portail Suivi Commandes</h1><p>Endpoints disponibles: <a href="/api/health">/api/health</a>, <a href="/api/commandes">/api/commandes</a></p>'
  );
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`\n📋 Endpoints disponibles:`);
  console.log(`   GET    /api/health              - Health check`);
  console.log(`   GET    /api/commandes           - Liste des commandes`);
  console.log(`   GET    /api/commandes/:id       - Détail d'une commande`);
  console.log(`   POST   /api/commandes           - Créer une commande`);
  console.log(`   PUT    /api/commandes/:id/status - Modifier le statut`);
  console.log(`   DELETE /api/commandes/:id       - Supprimer une commande\n`);
});
