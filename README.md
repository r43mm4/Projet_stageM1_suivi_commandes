# Portail Suivi Commandes - DigiInfo Stage

## Vue d'Ensemble

**Portail web** permettant aux clients de consulter et suivre leurs commandes en temps quasi-réel, avec synchronisation automatique depuis Salesforce.

**Période**: 12 semaines (Septembre - Decembre 2025)  

**Stagiaire**: Raoul WAFFO  

**Mentor**: Monsieur Joly  DONFACK  

**Ecole**: IONIS STM  


---

## Objectifs du Projet

### Problématique
- **Avant**: Clients appellent le service client pour connaître le statut de leurs commandes
- **Après**: Clients consultent un portail web autonome
- **Bénéfice**: Réduction estimée de 60% des appels au service client

### Fonctionnalités Principales
- Consultation des commandes en temps quasi-réel (délai max: 1 heure)
- Recherche par numéro de commande
- Synchronisation automatique avec Salesforce (toutes les heures)
- Modifications de statut (admin)
- Notifications email lors de changements de statut
- Interface responsive (mobile-friendly)

---

### Technologies

**Frontend**
- HTML5, CSS3, JavaScript (Vanilla)
- Responsive Design (mobile-first)

**Backend**
- Node.js 18+
- Express.js 4.x
- mssql (Azure SQL driver)

**Base de Données**
- Azure SQL Database
- 5 tables: Commandes, Clients, Notifications, Produits, DetailCommandes

**Intégration**
- Salesforce REST API
- OAuth2 authentication
- SOQL queriescd

**Cloud & DevOps**
- Azure App Service
- GitHub (version control)
- Postman (API testing)

---
