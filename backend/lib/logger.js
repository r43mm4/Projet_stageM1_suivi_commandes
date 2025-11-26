/**
 * ═══════════════════════════════════════════════════════════
 * WINSTON LOGGER CONFIGURATION
 * ═══════════════════════════════════════════════════════════
 *
 * Configuration du système de logging avec Winston.
 *
 * NIVEAUX DE LOG (du plus au moins important) :
 * - error   : Erreurs critiques qui arrêtent l'application
 * - warn    : Avertissements, comportements anormaux
 * - info    : Informations importantes sur le fonctionnement
 * - debug   : Détails pour le débogage
 *
 * DESTINATIONS :
 * - Console : Tous les logs (colorés)
 * - error.log : Seulement les erreurs
 * - combined.log : Tous les logs
 */

const winston = require("winston");
const path = require("path");

// Créer le dossier logs s'il n'existe pas
const fs = require("fs");
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Affiche la stack trace des erreurs
  winston.format.printf(({ timestamp, level, message, stack }) => {
    // Si c'est une erreur avec stack trace
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
  })
);

// Configuration du logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: customFormat,
  transports: [
    // 1. Fichier pour les erreurs uniquement
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5, // Garder 5 fichiers de backup
    }),

    // 2. Fichier pour tous les logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // 3. Console (avec couleurs)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
  ],
});

// Message de démarrage
logger.info("Logger initialisé avec succès ✓");

module.exports = logger;
