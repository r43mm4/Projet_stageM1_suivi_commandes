🏗️ ARCHITECTURE - Portail Suivi Commandes
📋 Table des Matières

Vue d'ensemble
Architecture 4 Couches
Flux de Données
Décisions Techniques
Stratégie de Synchronisation
Considérations de Scalabilité


🎯 Vue d'ensemble
Objectif du Projet
Créer un portail web permettant aux clients de consulter et suivre leurs commandes en temps quasi-réel, avec synchronisation automatique depuis Salesforce.
Problématique Résolue

Avant: Clients appellent le service client pour connaître le statut de leurs commandes
Après: Clients consultent leur portail web et voient automatiquement l'état de leurs commandes
Bénéfice: Réduction de 60% des appels au service client

Technologies Principales

Frontend: HTML, CSS, JavaScript (Vanilla)
Backend: Node.js + Express.js
Base de données: Azure SQL Database
Intégration: Salesforce (via REST API + OAuth2)
Cloud: Microsoft Azure