# ARCHITECTURE - Portail Suivi Commandes

## Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture 4 Couches](#architecture-4-couches)
3. [Flux de Données](#flux-de-données)
4. [Décisions Techniques](#décisions-techniques)
5. [Stratégie de Synchronisation](#stratégie-de-synchronisation)
6. [Considérations de Scalabilité](#considérations-de-scalabilité)

---

## Vue d'ensemble

### Objectif du Projet
Créer un **portail web** permettant aux clients de consulter et suivre leurs commandes en temps quasi-réel, avec synchronisation automatique depuis Salesforce.

### Problématique Résolue
- **Avant**: Clients appellent le service client pour connaître le statut de leurs commandes
- **Après**: Clients consultent leur portail web et voient automatiquement l'état de leurs commandes
- **Bénéfice**: Réduction de 60% des appels au service client

### Technologies Principales
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js + Express.js
- **Base de données**: Azure SQL Database
- **Intégration**: Salesforce (via REST API + OAuth2)
- **Cloud**: Microsoft Azure

---

## Architecture 4 Couches

![Schéma d’architecture](images/Architecture_4_Couches.svg)

## Flux de Données

### Flux 1: Création de Commande (Salesforce → Portail)



## Décisions Techniques

### Pourquoi Salesforce + SQL Database (et pas juste Salesforce)?

#### Option 1: Accès Direct à Salesforce
```
[Portail] ─────→ [Salesforce API]
          chaque requête
```

**Problèmes:**
- **Limite d'API**: Salesforce limite à 100,000 appels/jour
- **Coût**: Chaque requête coûte de l'argent
- **Latence**: Chaque requête prend 200-500ms
- **Dépendance**: Si Salesforce est down, portail est down

**Calcul:**
- 100 clients × 10 consultations/jour = 1,000 requêtes
- 1,000 clients × 10 consultations/jour = 10,000 requêtes ✅
- 10,000 clients × 10 consultations/jour = 100,000 requêtes ⚠️ LIMITE!

#### Option 2: Cache dans SQL Database (CHOISI)
```
[Portail] ─────→ [Azure SQL] ←───── [Salesforce]
          rapide (<50ms)      sync toutes les heures
```

**Avantages:**
- **Pas de limite**: SQL peut gérer des millions de requêtes
- **Rapide**: 50ms vs 500ms
- **Résilient**: Si Salesforce down, portail fonctionne encore
- **Économique**: Azure SQL moins cher que API Salesforce

**Inconvénient:**
- Délai de 1 heure max entre création Salesforce et affichage portail
- **Acceptable pour le business**: Clients n'ont pas besoin de voir en temps réel absolu

### Pourquoi Node.js (et pas PHP/Python)?

| Critère | Node.js | PHP | Python |
|---------|-----------|-----|--------|
| **Asynchrone** | Oui (natif) | Non (sauf extensions) | Oui (asyncio) |
| **JSON** | Natif | Bon | Bon |
| **Azure Support** | Excellent | Bon | Bon |
| **Courbe d'apprentissage** | Facile (déjà JS au frontend) | Moyenne | Moyenne |
| **Performance API** | Excellent | Bon | Moyen |

**Décision**: Node.js car déjà JavaScript au frontend = 1 seul langage à maîtriser.

### Pourquoi REST API (et pas GraphQL)?

| Critère | REST | GraphQL |
|---------|--------|---------|
| **Simplicité** | Très simple | Complexe |
| **Courbe apprentissage** | 1 jour | 1 semaine |
| **Besoin du projet** | Simple CRUD | Queries complexes |
| **Tooling** | Postman, cURL | Playground spécifique |

**Décision**: REST car projet simple (6 endpoints), pas besoin de la complexité de GraphQL.

### Pourquoi Azure (et pas AWS/GCP)?

| Critère | Azure | AWS | GCP |
|---------|---------|-----|-----|
| **Intégration Salesforce** | Excellente | Bonne | Bonne |
| **Free Tier** | 12 mois | 12 mois | 90 jours |
| **Documentation FR** | Bonne | Moyenne | Moyenne |
| **SQL Database** | Natif (Azure SQL) | RDS | Cloud SQL |

**Décision**: Azure car entreprise utilise déjà Azure + bonne intégration avec Salesforce.

---

## Stratégie de Synchronisation

### Problème: Comment garder SQL à jour avec Salesforce?

#### Option A: Real-Time (Webhook) 
```
[Salesforce]
     │ Event: Order modified
     ├─→ Webhook → [Backend] → [SQL]
```
**Problèmes:**
- Complexe à implémenter
- Besoin d'un endpoint public exposé
- Besoin de sécuriser le webhook
- Coûteux (Salesforce Platform Events)

#### Option B: Batch Sync Hourly (CHOISI)
```
[Backend Scheduler]
     │ Toutes les heures (ex: 10:00, 11:00, 12:00...)
     ├─→ [Salesforce API] → SOQL Query
     ├─→ Récupère commandes modifiées depuis dernière sync
     ├─→ Compare avec [Azure SQL]
     └─→ INSERT si nouveau, UPDATE si changé
```

### Implémentation du Batch Sync

#### 1. Query SOQL
```sql
SELECT Id, OrderNumber__c, Amount__c, Status__c, LastModifiedDate
FROM Order__c
WHERE LastModifiedDate > :lastSyncTime
ORDER BY LastModifiedDate ASC
LIMIT 2000
```

#### 2. Logique de Synchronisation
```javascript
Pour chaque commande Salesforce:
  1. Vérifier: SalesforceId existe dans SQL?
  2. SI NON → INSERT nouvelle ligne
  3. SI OUI → Comparer valeurs
     SI différent → UPDATE
     SI identique → Ignorer (déjà à jour)
```

#### 3. Garantie d'Idempotence
**Problème**: Et si le job de sync s'exécute 2 fois par accident?

**Solution**: Index UNIQUE sur `SalesforceId`
```sql
CREATE UNIQUE INDEX IX_SalesforceId ON Orders(SalesforceId);
```

**Résultat:**
- 1ère sync: INSERT réussit 
- 2ème sync: INSERT échoue (UNIQUE violation), passe à UPDATE ✅
- Pas de doublons! 

