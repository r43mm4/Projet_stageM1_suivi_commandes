-- ═══════════════════════════════════════════════════════════════
-- SCHÉMA COMPLET BASE DE DONNÉES - PORTAIL SUIVI COMMANDES
-- ═══════════════════════════════════════════════════════════════
-- Inspired by Salesforce data model
-- Tables: Clients, Commandes, DetailCommande, Produits, Notifications
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les tables existantes (dans l'ordre inverse des FK)
IF OBJECT_ID('Notifications', 'U') IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('DetailCommande', 'U') IS NOT NULL DROP TABLE DetailCommande;
IF OBJECT_ID('Commandes', 'U') IS NOT NULL DROP TABLE Commandes;
IF OBJECT_ID('Produits', 'U') IS NOT NULL DROP TABLE Produits;
IF OBJECT_ID('Clients', 'U') IS NOT NULL DROP TABLE Clients;
GO

-- ═══════════════════════════════════════════════════════════════
-- TABLE: Clients
-- ═══════════════════════════════════════════════════════════════
-- Stocke les informations des clients
-- Mapping Salesforce: Account / Contact
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE Clients (
    ClientId INT PRIMARY KEY IDENTITY(1,1),
    SalesforceId NVARCHAR(50) UNIQUE NULL,                -- ID Salesforce (si sync)
    NomClient NVARCHAR(100) NOT NULL,                     -- Nom complet ou raison sociale
    Email NVARCHAR(100) UNIQUE NOT NULL,                  -- Email (utilisé pour login)
    Telephone NVARCHAR(20) NULL,                          -- Téléphone
    Adresse NVARCHAR(255) NULL,                           -- Adresse complète
    MotDePasse NVARCHAR(255) NOT NULL,                    -- Hash du mot de passe (bcrypt)
    Proprietaire NVARCHAR(100) NULL,                      -- Propriétaire du compte (commercial)
    CreePar NVARCHAR(100) NULL,                           -- Qui a créé le client
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),     -- Date de création
    DerniereModification DATETIME NOT NULL DEFAULT GETDATE(), -- Dernière modification
    DerniereModificationPar NVARCHAR(100) NULL            -- Qui a modifié
);

-- Index pour performance
CREATE INDEX IX_Clients_Email ON Clients(Email);
CREATE INDEX IX_Clients_SalesforceId ON Clients(SalesforceId);
GO

-- ═══════════════════════════════════════════════════════════════
-- TABLE: Produits
-- ═══════════════════════════════════════════════════════════════
-- Catalogue des produits informatiques
-- Mapping Salesforce: Product2
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE Produits (
    ProduitId INT PRIMARY KEY IDENTITY(1,1),
    SalesforceId NVARCHAR(50) UNIQUE NULL,                -- ID Salesforce
    NomProduit NVARCHAR(100) NOT NULL,                    -- Nom du produit
    Couleur NVARCHAR(50) NULL,                            -- Couleur (ex: Noir, Argent)
    Pointure DECIMAL(4, 1) NULL,                          -- Pointure (si chaussures, sinon NULL)
    Prix DECIMAL(10, 2) NOT NULL,                         -- Prix unitaire
    Stock INT NOT NULL DEFAULT 0,                         -- Quantité en stock
    Image NVARCHAR(255) NULL,                             -- URL de l'image
    Proprietaire NVARCHAR(100) NULL,                      -- Propriétaire (responsable produit)
    CreePar NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModification DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModificationPar NVARCHAR(100) NULL
);

-- Index
CREATE INDEX IX_Produits_NomProduit ON Produits(NomProduit);
CREATE INDEX IX_Produits_SalesforceId ON Produits(SalesforceId);
GO

-- ═══════════════════════════════════════════════════════════════
-- TABLE: Commandes
-- ═══════════════════════════════════════════════════════════════
-- Commandes passées par les clients
-- Mapping Salesforce: Commande__c (custom object)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE Commandes (
    CommandeId INT PRIMARY KEY IDENTITY(1,1),
    SalesforceId NVARCHAR(50) UNIQUE NULL,                -- ID Salesforce
    NumCommande NVARCHAR(20) UNIQUE NOT NULL,             -- Numéro de commande (ex: CMD-001)
    ClientId INT NOT NULL,                                -- Référence au client
    ReferenceCommande NVARCHAR(50) NULL,                  -- Référence externe
    MontantTotal DECIMAL(10, 2) NOT NULL,                 -- Montant total de la commande
    Etat NVARCHAR(50) NOT NULL DEFAULT 'En préparation',  -- Statut
    Descriptions NVARCHAR(500) NULL,                      -- Description / notes
    DateCommande DATETIME NOT NULL DEFAULT GETDATE(),     -- Date de la commande
    Proprietaire NVARCHAR(100) NULL,                      -- Propriétaire (commercial)
    CreePar NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModification DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModificationPar NVARCHAR(100) NULL,
    DerniereSynchro DATETIME NULL,                        -- Dernière synchro avec Salesforce
    
    -- Contrainte
    CONSTRAINT FK_Commandes_Clients FOREIGN KEY (ClientId) REFERENCES Clients(ClientId) ON DELETE CASCADE,
    CONSTRAINT CK_Commandes_Etat CHECK (Etat IN ('En préparation', 'Expédié', 'Livré', 'Annulé'))
);

-- Index pour performance
CREATE INDEX IX_Commandes_ClientId ON Commandes(ClientId);
CREATE INDEX IX_Commandes_NumCommande ON Commandes(NumCommande);
CREATE INDEX IX_Commandes_Etat ON Commandes(Etat);
CREATE INDEX IX_Commandes_DateCommande ON Commandes(DateCommande DESC);
CREATE INDEX IX_Commandes_SalesforceId ON Commandes(SalesforceId);
CREATE INDEX IX_Commandes_DerniereSynchro ON Commandes(DerniereSynchro);
GO

-- ═══════════════════════════════════════════════════════════════
-- TABLE: DetailCommande
-- ═══════════════════════════════════════════════════════════════
-- Détails des produits dans chaque commande (lignes de commande)
-- Mapping Salesforce: OpportunityLineItem ou custom DetailCommande__c
-- Relation: Principal-Détails (Master-Detail)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE DetailCommande (
    DetailId INT PRIMARY KEY IDENTITY(1,1),
    SalesforceId NVARCHAR(50) UNIQUE NULL,                -- ID Salesforce
    CommandeId INT NOT NULL,                              -- Référence à la commande (Principal)
    ProduitId INT NOT NULL,                               -- Référence au produit
    NomDetail NVARCHAR(100) NULL,                         -- Nom du détail (optionnel)
    Quantite INT NOT NULL DEFAULT 1,                      -- Quantité commandée
    PrixUnitaire DECIMAL(10, 2) NOT NULL,                 -- Prix unitaire au moment de la commande
    CreePar NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModification DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModificationPar NVARCHAR(100) NULL,
    
    -- Contraintes
    CONSTRAINT FK_DetailCommande_Commandes FOREIGN KEY (CommandeId) REFERENCES Commandes(CommandeId) ON DELETE CASCADE,
    CONSTRAINT FK_DetailCommande_Produits FOREIGN KEY (ProduitId) REFERENCES Produits(ProduitId),
    CONSTRAINT CK_DetailCommande_Quantite CHECK (Quantite > 0),
    CONSTRAINT CK_DetailCommande_PrixUnitaire CHECK (PrixUnitaire >= 0)
);

-- Index
CREATE INDEX IX_DetailCommande_CommandeId ON DetailCommande(CommandeId);
CREATE INDEX IX_DetailCommande_ProduitId ON DetailCommande(ProduitId);
CREATE INDEX IX_DetailCommande_SalesforceId ON DetailCommande(SalesforceId);
GO

-- ═══════════════════════════════════════════════════════════════
-- TABLE: Notifications
-- ═══════════════════════════════════════════════════════════════
-- Historique des notifications envoyées aux clients
-- Mapping Salesforce: custom Notification__c
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE Notifications (
    NotificationId INT PRIMARY KEY IDENTITY(1,1),
    SalesforceId NVARCHAR(50) UNIQUE NULL,                -- ID Salesforce
    CommandeId INT NOT NULL,                              -- Commande concernée
    NomNotifications NVARCHAR(100) NULL,                  -- Nom de la notification
    TypeNotification NVARCHAR(20) NOT NULL DEFAULT 'Email', -- Type: Email ou SMS
    Destinataire NVARCHAR(100) NOT NULL,                  -- Email ou numéro de téléphone
    Message NVARCHAR(1000) NOT NULL,                      -- Contenu du message
    StatutDeclencheur NVARCHAR(50) NULL,                  -- Statut qui a déclenché la notif
    DateEnvoi DATETIME NULL,                              -- Date d'envoi effective
    StatutEnvoi NVARCHAR(20) NOT NULL DEFAULT 'En attente', -- Statut: En attente, Envoyé, Échoué
    ErreurMessage NVARCHAR(500) NULL,                     -- Message d'erreur si échec
    Proprietaire NVARCHAR(100) NULL,
    CreePar NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModification DATETIME NOT NULL DEFAULT GETDATE(),
    DerniereModificationPar NVARCHAR(100) NULL,
    
    -- Contrainte
    CONSTRAINT FK_Notifications_Commandes FOREIGN KEY (CommandeId) REFERENCES Commandes(CommandeId) ON DELETE CASCADE,
    CONSTRAINT CK_Notifications_Type CHECK (TypeNotification IN ('Email', 'SMS')),
    CONSTRAINT CK_Notifications_Statut CHECK (StatutEnvoi IN ('En attente', 'Envoyé', 'Échoué'))
);

-- Index
CREATE INDEX IX_Notifications_CommandeId ON Notifications(CommandeId);
CREATE INDEX IX_Notifications_StatutEnvoi ON Notifications(StatutEnvoi);
CREATE INDEX IX_Notifications_DateEnvoi ON Notifications(DateEnvoi);
CREATE INDEX IX_Notifications_SalesforceId ON Notifications(SalesforceId);
GO

-- ═══════════════════════════════════════════════════════════════
-- DONNÉES DE TEST
-- ═══════════════════════════════════════════════════════════════

-- Insertion de 3 clients de test
INSERT INTO Clients (NomClient, Email, Telephone, Adresse, MotDePasse, Proprietaire, CreePar) VALUES
('WAFFO Raoul', 'raoulemma1999@gmail.com', '0612345678', '123 Rue de Paris, 75001 Paris', '$2b$10$hashedpassword1', 'Commercial A', 'Admin'),
('Entreprise TechCorp', 'contact@techcorp.fr', '0698765432', '456 Avenue des Champs, 75008 Paris', '$2b$10$hashedpassword2', 'Commercial B', 'Admin'),
('Sophie Martin', 'sophie.martin@example.com', '0634567890', '789 Boulevard Voltaire, 75011 Paris', '$2b$10$hashedpassword3', 'Commercial A', 'Admin');

-- Insertion de 5 produits de test (matériel informatique)
INSERT INTO Produits (NomProduit, Couleur, Prix, Stock, Image, Proprietaire, CreePar) VALUES
('MacBook Pro 14"', 'Gris Sidéral', 2499.00, 15, 'https://example.com/macbook.jpg', 'Responsable Produits', 'Admin'),
('iPhone 15 Pro', 'Titane Naturel', 1229.00, 30, 'https://example.com/iphone.jpg', 'Responsable Produits', 'Admin'),
('AirPods Pro', 'Blanc', 279.00, 50, 'https://example.com/airpods.jpg', 'Responsable Produits', 'Admin'),
('Magic Mouse', 'Noir', 99.00, 40, 'https://example.com/mouse.jpg', 'Responsable Produits', 'Admin'),
('Dell XPS 15', 'Argent', 1899.00, 10, 'https://example.com/dell.jpg', 'Responsable Produits', 'Admin');

-- Insertion de 5 commandes de test
INSERT INTO Commandes (NumCommande, ClientId, ReferenceCommande, MontantTotal, Etat, Descriptions, Proprietaire, CreePar) VALUES
('CMD-001', 1, 'REF-2025-001', 2778.00, 'Expédié', 'Commande MacBook + AirPods', 'Commercial A', 'System'),
('CMD-002', 2, 'REF-2025-002', 5697.00, 'En préparation', 'Commande entreprise: 3 MacBook', 'Commercial B', 'System'),
('CMD-003', 1, 'REF-2025-003', 1229.00, 'Livré', 'iPhone 15 Pro', 'Commercial A', 'System'),
('CMD-004', 3, 'REF-2025-004', 558.00, 'En préparation', 'AirPods x2', 'Commercial A', 'System'),
('CMD-005', 2, 'REF-2025-005', 1899.00, 'Annulé', 'Commande annulée par le client', 'Commercial B', 'System');

-- Insertion de détails de commandes
-- CMD-001: MacBook + AirPods
INSERT INTO DetailCommande (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar) VALUES
(1, 1, 'MacBook Pro 14" pour développement', 1, 2499.00, 'System'),
(1, 3, 'AirPods Pro', 1, 279.00, 'System');

-- CMD-002: 3 MacBook
INSERT INTO DetailCommande (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar) VALUES
(2, 1, 'MacBook Pro 14" pour équipe dev', 3, 2499.00, 'System');

-- CMD-003: 1 iPhone
INSERT INTO DetailCommande (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar) VALUES
(3, 2, 'iPhone 15 Pro Titane', 1, 1229.00, 'System');

-- CMD-004: 2 AirPods
INSERT INTO DetailCommande (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar) VALUES
(4, 3, 'AirPods Pro x2', 2, 279.00, 'System');

-- CMD-005: 1 Dell (annulée)
INSERT INTO DetailCommande (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar) VALUES
(5, 5, 'Dell XPS 15', 1, 1899.00, 'System');

-- Insertion de notifications de test
INSERT INTO Notifications (CommandeId, NomNotifications, TypeNotification, Destinataire, Message, StatutDeclencheur, DateEnvoi, StatutEnvoi, Proprietaire, CreePar) VALUES
(1, 'Notification expédition', 'Email', 'raoulemma1999@gmail.com', 'Votre commande CMD-001 a été expédiée.', 'Expédié', GETDATE(), 'Envoyé', 'System', 'System'),
(3, 'Notification livraison', 'Email', 'raoulemma1999@gmail.com', 'Votre commande CMD-003 a été livrée.', 'Livré', GETDATE(), 'Envoyé', 'System', 'System'),
(4, 'Notification création', 'Email', 'sophie.martin@example.com', 'Votre commande CMD-004 a été créée.', 'En préparation', GETDATE(), 'Envoyé', 'System', 'System'),
(5, 'Notification annulation', 'Email', 'contact@techcorp.fr', 'Votre commande CMD-005 a été annulée.', 'Annulé', GETDATE(), 'Envoyé', 'System', 'System');

GO

-- ═══════════════════════════════════════════════════════════════
-- VUES UTILES
-- ═══════════════════════════════════════════════════════════════

-- Vue: Commandes avec informations client
CREATE VIEW VueCommandesComplete AS
SELECT 
    c.CommandeId,
    c.NumCommande,
    c.ReferenceCommande,
    c.MontantTotal,
    c.Etat,
    c.Descriptions,
    c.DateCommande,
    cl.NomClient,
    cl.Email,
    cl.Telephone,
    c.DerniereSynchro,
    c.SalesforceId
FROM Commandes c
INNER JOIN Clients cl ON c.ClientId = cl.ClientId;
GO

-- Vue: Statistiques par état
CREATE VIEW VueStatistiquesCommandes AS
SELECT 
    Etat,
    COUNT(*) AS NombreCommandes,
    SUM(MontantTotal) AS MontantTotal,
    AVG(MontantTotal) AS MontantMoyen
FROM Commandes
GROUP BY Etat;
GO

-- ═══════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

PRINT 'Schéma créé avec succès !';
PRINT '';
PRINT 'Tables créées:';
PRINT '  - Clients (3 enregistrements)';
PRINT '  - Produits (5 enregistrements)';
PRINT '  - Commandes (5 enregistrements)';
PRINT '  - DetailCommande (8 enregistrements)';
PRINT '  - Notifications (4 enregistrements)';
PRINT '';
PRINT 'Vues créées:';
PRINT '  - VueCommandesComplete';
PRINT '  - VueStatistiquesCommandes';
PRINT '';
PRINT 'Pour tester:';
PRINT '  SELECT * FROM VueCommandesComplete;';
PRINT '  SELECT * FROM VueStatistiquesCommandes;';