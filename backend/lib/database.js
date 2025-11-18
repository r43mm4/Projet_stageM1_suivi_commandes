// ==================== CHARGER LES VARIABLES D'ENVIRONNEMENT ====================

require("dotenv").config();

const sql = require("mssql");

// ==================== CONFIGURATION SQL ====================

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// ==================== CONNEXION À LA BASE DE DONNÉES ====================
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log(" Database connectée avec succès!");
    console.log("   Server:", config.server);
    console.log("   Database:", config.database);
    console.log("");
    return pool;
  })
  .catch((err) => {
    console.error(" Échec de connexion à la base de données\n");
    console.error("Détails de l'erreur:");
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);
    console.error("");

    // ==================== GESTION D'ERREURS ====================
    if (err.code === "ELOGIN") {
      console.error("💡 Erreur de login:");
      console.error("   → Vérifie DB_USER et DB_PASSWORD dans .env");
      console.error("   → Vérifie que l'utilisateur SQL existe dans Azure");
    } else if (err.code === "ETIMEOUT") {
      console.error("💡 Timeout de connexion:");
      console.error("   → Vérifie DB_SERVER dans .env");
      console.error("   → Vérifie le firewall Azure (doit autoriser ton IP)");
      console.error("   → Vérifie ta connexion internet");
    } else if (err.message.includes("getaddrinfo")) {
      console.error("💡 Impossible de résoudre le nom du serveur:");
      console.error("   → Vérifie l'orthographe de DB_SERVER");
      console.error(
        "   → Doit être: stagedigiinfo-server.database.windows.net"
      );
    }

    console.error("");
    process.exit(1);
  });

// ==================== HELPER FUNCTION ====================
async function query(sqlQuery, params = []) {
  try {
    const pool = await poolPromise;
    const request = pool.request();

    // Ajouter les paramètres
    params.forEach((p) => {
      request.input(p.name, p.type, p.value);
    });

    const result = await request.query(sqlQuery);
    return result;
  } catch (error) {
    console.error("❌ Erreur SQL Query:", error.message);
    throw error;
  }
}

// ==================== EXPORTS ====================
module.exports = {
  sql,
  poolPromise,
  query,
};
