-- ═══════════════════════════════════════════════════════════════
-- SEED.SQL - DONNÉES DE TEST POUR PORTAIL SUIVI COMMANDES
-- ═══════════════════════════════════════════════════════════════
-- Compatible Azure SQL Database
-- Gestion intelligente des doublons avec MERGE
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- NETTOYAGE DES DONNÉES EXISTANTES (OPTIONNEL - Décommenter si besoin)
-- ═══════════════════════════════════════════════════════════════
/*
DELETE FROM Notifications;
DELETE FROM DetailCommande;
DELETE FROM Commandes;
DELETE FROM Produits;
DELETE FROM Clients;
DBCC CHECKIDENT ('Clients', RESEED, 0);
DBCC CHECKIDENT ('Produits', RESEED, 0);
DBCC CHECKIDENT ('Commandes', RESEED, 0);
DBCC CHECKIDENT ('DetailCommande', RESEED, 0);
DBCC CHECKIDENT ('Notifications', RESEED, 0);
*/

-- ═══════════════════════════════════════════════════════════════
-- INSERTION: Clients (15 enregistrements avec MERGE)
-- ═══════════════════════════════════════════════════════════════
-- Utilisation de MERGE pour éviter les doublons sur Email
-- ═══════════════════════════════════════════════════════════════

MERGE INTO Clients AS target
USING (VALUES
    ('WAFFO Raoul', 'raoulemma1999@gmail.com', '0612345678', '123 Rue de Paris, 75001 Paris', '$2b$10$K5xJ9XqZ8mW3NpYr2hV.xOeJ5kL9mNq7RsTuVwXyZ1aBcDeFgHiJk', 'Commercial A', 'Admin', 'SF-CLI-001'),
    ('Entreprise TechCorp', 'contact@techcorp.fr', '0698765432', '456 Avenue des Champs, 75008 Paris', '$2b$10$L6yK0ArA9nX4OqZs3iW.yPfK6lM0nOr8StUvWxYz2bCdEfGhIjKl', 'Commercial B', 'Admin', 'SF-CLI-002'),
    ('Sophie Martin', 'sophie.martin@example.com', '0634567890', '789 Boulevard Voltaire, 75011 Paris', '$2b$10$M7zL1BsB0oY5PrAt4jX.zQgL7mN1oPs9TuVwXyZ3cDeEfGhIjKlM', 'Commercial A', 'Admin', 'SF-CLI-003'),
    ('Jean Dupont', 'jean.dupont@webmail.fr', '0645123789', '12 Rue Victor Hugo, 69001 Lyon', '$2b$10$N8aM2CtC1pZ6QsBu5kY.aRhM8nO2pQt0UvWxYz4dEfFgGhIjKlMn', 'Commercial C', 'Admin', 'SF-CLI-004'),
    ('Marie Leblanc', 'marie.leblanc@outlook.com', '0656234890', '34 Avenue de la République, 33000 Bordeaux', '$2b$10$O9bN3DuD2qA7RtCv6lZ.bSiN9oP3qRu1VwXyZ5eGfGhHiJkLmNo', 'Commercial A', 'Admin', 'SF-CLI-005'),
    ('DataSystem SARL', 'info@datasystem.com', '0467345901', '56 Rue Lafayette, 31000 Toulouse', '$2b$10$P0cO4EvE3rB8SuDw7mA.cTjO0pQ4rSv2WxYz6fHgGhIiJkLmNop', 'Commercial B', 'Admin', 'SF-CLI-006'),
    ('Pierre Bernard', 'pierre.bernard@gmail.com', '0678456012', '78 Boulevard Haussmann, 75009 Paris', '$2b$10$Q1dP5FwF4sC9TvEx8nB.dUkP1qR5sTw3XyZ7gIhHiJjKlMnOpQ', 'Commercial C', 'Admin', 'SF-CLI-007'),
    ('Digital Solutions SAS', 'contact@digitalsol.fr', '0689567123', '90 Rue de Rivoli, 75004 Paris', '$2b$10$R2eQ6GxG5tD0UwFy9oC.eVlQ2rS6tUx4Yz8hJiIiJkKlMnOpQr', 'Commercial A', 'Admin', 'SF-CLI-008'),
    ('Claire Rousseau', 'claire.rousseau@yahoo.fr', '0601678234', '21 Place Bellecour, 69002 Lyon', '$2b$10$S3fR7HyH6uE1VxGz0pD.fWmR3sT7uVy5Za9iKjJjKlLmNnOpQrS', 'Commercial B', 'Admin', 'SF-CLI-009'),
    ('Innovatech Corp', 'sales@innovatech.com', '0612789345', '43 Quai des Chartrons, 33300 Bordeaux', '$2b$10$T4gS8IzI7vF2WyH1qE.gXnS4tU8vWz6Ab0jLkKkLmMnOoPpQrSt', 'Commercial C', 'Admin', 'SF-CLI-010'),
    ('Lucas Petit', 'lucas.petit@hotmail.com', '0623890456', '65 Rue Masséna, 06000 Nice', '$2b$10$U5hT9JaJ8wG3XzI2rF.hYoT5uV9wXa7Bc1kMlLlMnNoOpPqQrStU', 'Commercial A', 'Admin', 'SF-CLI-011'),
    ('NetServices EURL', 'admin@netservices.fr', '0634901567', '87 Avenue Jean Jaurès, 44000 Nantes', '$2b$10$V6iU0KbK9xH4YaJ3sG.iZpU6vW0xYb8Cd2lNmMmNoOpPqPrRsStUv', 'Commercial B', 'Admin', 'SF-CLI-012'),
    ('Antoine Moreau', 'antoine.moreau@laposte.net', '0645012678', '15 Rue Gambetta, 13001 Marseille', '$2b$10$W7jV1LcL0yI5ZbK4tH.jAqV7wX1yZc9De3mOnNnOpPqPrQsStUvW', 'Commercial A', 'Admin', 'SF-CLI-013'),
    ('TechnoPlus SA', 'contact@technoplus.eu', '0656123789', '28 Avenue Foch, 67000 Strasbourg', '$2b$10$X8kW2MdM1zJ6AcL5uI.kBrW8xY2zAd0Ef4nPoPpOpQrQsRtTuVwX', 'Commercial C', 'Admin', 'SF-CLI-014'),
    ('Isabelle Girard', 'isabelle.girard@free.fr', '0667234890', '52 Rue Nationale, 59000 Lille', '$2b$10$Y9lX3NeN2aK7BdM6vJ.lCsX9yZ3aBe1Fg5oQpQqPrRsRtSuUvWxY', 'Commercial B', 'Admin', 'SF-CLI-015')
) AS source (NomClient, Email, Telephone, Adresse, MotDePasse, Proprietaire, CreePar, SalesforceId)
ON target.Email = source.Email
WHEN NOT MATCHED THEN
    INSERT (NomClient, Email, Telephone, Adresse, MotDePasse, Proprietaire, CreePar, SalesforceId, DateCreation, DerniereModification)
    VALUES (source.NomClient, source.Email, source.Telephone, source.Adresse, source.MotDePasse, source.Proprietaire, source.CreePar, source.SalesforceId, GETDATE(), GETDATE());

PRINT 'Clients insérés ou mis à jour avec succès';
GO

-- ═══════════════════════════════════════════════════════════════
-- INSERTION: Produits (15 enregistrements avec MERGE)
-- ═══════════════════════════════════════════════════════════════

MERGE INTO Produits AS target
USING (VALUES
    ('MacBook Pro 14"', 'Gris Sidéral',  2499.00, 25, 'https://cdn.example.com/macbook-pro-14.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-001'),
    ('MacBook Pro 16"', 'Argent', 3199.00, 18, 'https://cdn.example.com/macbook-pro-16.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-002'),
    ('iPhone 15 Pro', 'Titane Naturel',  1229.00, 45, 'https://cdn.example.com/iphone-15-pro.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-003'),
    ('iPhone 15', 'Noir',  969.00, 60, 'https://cdn.example.com/iphone-15.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-004'),
    ('AirPods Pro', 'Blanc',  279.00, 80, 'https://cdn.example.com/airpods-pro.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-005'),
    ('AirPods Max', 'Argent',  629.00, 35, 'https://cdn.example.com/airpods-max.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-006'),
    ('Magic Mouse', 'Noir',  99.00, 70, 'https://cdn.example.com/magic-mouse.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-007'),
    ('Magic Keyboard', 'Blanc',  129.00, 55, 'https://cdn.example.com/magic-keyboard.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-008'),
    ('Dell XPS 15', 'Argent',  1899.00, 22, 'https://cdn.example.com/dell-xps-15.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-009'),
    ('Dell XPS 13', 'Noir',  1499.00, 30, 'https://cdn.example.com/dell-xps-13.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-010'),
    ('Lenovo ThinkPad X1', 'Noir',  1799.00, 20, 'https://cdn.example.com/thinkpad-x1.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-011'),
    ('HP Spectre x360', 'Argent',  1699.00, 15, 'https://cdn.example.com/hp-spectre.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-012'),
    ('iPad Pro 12.9"', 'Gris Sidéral',  1469.00, 40, 'https://cdn.example.com/ipad-pro-12.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-013'),
    ('Samsung Galaxy S24 Ultra', 'Noir Titane',  1299.00, 50, 'https://cdn.example.com/galaxy-s24.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-014'),
    ('Apple Watch Series 9', 'Minuit',  449.00, 65, 'https://cdn.example.com/apple-watch-9.jpg', 'Responsable Produits', 'Admin', 'SF-PRD-015')
) AS source (NomProduit, Couleur, Prix, Stock, Image, Proprietaire, CreePar, SalesforceId)
ON target.SalesforceId = source.SalesforceId
WHEN NOT MATCHED THEN
    INSERT (NomProduit, Couleur, Prix, Stock, Image, Proprietaire, CreePar, SalesforceId, DateCreation, DerniereModification)
    VALUES (source.NomProduit, source.Couleur, source.Prix, source.Stock, source.Image, source.Proprietaire, source.CreePar, source.SalesforceId, GETDATE(), GETDATE());

PRINT 'Produits insérés ou mis à jour avec succès';
GO

-- ═══════════════════════════════════════════════════════════════
-- INSERTION: Commandes (12 enregistrements avec MERGE)
-- ═══════════════════════════════════════════════════════════════
-- Utilise les ClientId réels de la base (récupérés par Email)
-- ═══════════════════════════════════════════════════════════════

DECLARE @Client1 INT = (SELECT ClientId FROM Clients WHERE Email = 'raoulemma1999@gmail.com');
DECLARE @Client2 INT = (SELECT ClientId FROM Clients WHERE Email = 'contact@techcorp.fr');
DECLARE @Client3 INT = (SELECT ClientId FROM Clients WHERE Email = 'sophie.martin@example.com');
DECLARE @Client4 INT = (SELECT ClientId FROM Clients WHERE Email = 'jean.dupont@webmail.fr');
DECLARE @Client5 INT = (SELECT ClientId FROM Clients WHERE Email = 'marie.leblanc@outlook.com');
DECLARE @Client6 INT = (SELECT ClientId FROM Clients WHERE Email = 'info@datasystem.com');
DECLARE @Client7 INT = (SELECT ClientId FROM Clients WHERE Email = 'pierre.bernard@gmail.com');
DECLARE @Client8 INT = (SELECT ClientId FROM Clients WHERE Email = 'contact@digitalsol.fr');
DECLARE @Client9 INT = (SELECT ClientId FROM Clients WHERE Email = 'claire.rousseau@yahoo.fr');
DECLARE @Client10 INT = (SELECT ClientId FROM Clients WHERE Email = 'sales@innovatech.com');

MERGE INTO Commandes AS target
USING (VALUES
    ('CMD-001', @Client1, 'REF-2025-001', 2778.00, 'Livré', 'Commande MacBook Pro 14" + AirPods Pro', 'Commercial A', 'System', 'SF-CMD-001', '2025-01-20 14:30:00'),
    ('CMD-002', @Client2, 'REF-2025-002', 7497.00, 'Expédié', 'Commande entreprise: 3x MacBook Pro 14"', 'Commercial B', 'System', 'SF-CMD-002', '2025-01-22 09:15:00'),
    ('CMD-003', @Client1, 'REF-2025-003', 1229.00, 'Livré', 'iPhone 15 Pro Titane Naturel', 'Commercial A', 'System', 'SF-CMD-003', '2025-01-18 16:45:00'),
    ('CMD-004', @Client3, 'REF-2025-004', 558.00, 'En préparation', 'AirPods Pro x2 pour équipe', 'Commercial A', 'System', 'SF-CMD-004', '2025-01-23 11:20:00'),
    ('CMD-005', @Client2, 'REF-2025-005', 1899.00, 'Annulé', 'Commande annulée - changement de besoin', 'Commercial B', 'System', 'SF-CMD-005', '2025-01-21 13:00:00'),
    ('CMD-006', @Client4, 'REF-2025-006', 3495.00, 'Expédié', 'Dell XPS 15 + Accessoires', 'Commercial C', 'System', 'SF-CMD-006', '2025-01-24 08:30:00'),
    ('CMD-007', @Client5, 'REF-2025-007', 969.00, 'Livré', 'iPhone 15 Noir', 'Commercial A', 'System', 'SF-CMD-007', '2025-01-19 10:00:00'),
    ('CMD-008', @Client6, 'REF-2025-008', 5397.00, 'En préparation', 'Commande entreprise: 3x Lenovo ThinkPad X1', 'Commercial B', 'System', 'SF-CMD-008', '2025-01-25 15:45:00'),
    ('CMD-009', @Client7, 'REF-2025-009', 1918.00, 'Expédié', 'iPad Pro 12.9" + Apple Watch Series 9', 'Commercial C', 'System', 'SF-CMD-009', '2025-01-24 12:30:00'),
    ('CMD-010', @Client8, 'REF-2025-010', 4797.00, 'Livré', 'Commande 3x Dell XPS 13 pour dev team', 'Commercial A', 'System', 'SF-CMD-010', '2025-01-20 17:00:00'),
    ('CMD-011', @Client9, 'REF-2025-011', 857.00, 'En préparation', 'AirPods Max + Magic Mouse', 'Commercial B', 'System', 'SF-CMD-011', '2025-01-25 14:15:00'),
    ('CMD-012', @Client10, 'REF-2025-012', 3398.00, 'Expédié', 'HP Spectre x360 x2 pour commercial', 'Commercial C', 'System', 'SF-CMD-012', '2025-01-23 09:45:00')
) AS source (NumCommande, ClientId, ReferenceCommande, MontantTotal, Etat, Descriptions, Proprietaire, CreePar, SalesforceId, DerniereSynchro)
ON target.NumCommande = source.NumCommande
WHEN NOT MATCHED THEN
    INSERT (NumCommande, ClientId, ReferenceCommande, MontantTotal, Etat, Descriptions, Proprietaire, CreePar, SalesforceId, DerniereSynchro, DateCommande, DateCreation, DerniereModification)
    VALUES (source.NumCommande, source.ClientId, source.ReferenceCommande, source.MontantTotal, source.Etat, source.Descriptions, source.Proprietaire, source.CreePar, source.SalesforceId, source.DerniereSynchro, GETDATE(), GETDATE(), GETDATE());

PRINT 'Commandes insérées ou mises à jour avec succès';
GO

-- ═══════════════════════════════════════════════════════════════
-- INSERTION: DetailCommande (25 enregistrements avec MERGE)
-- ═══════════════════════════════════════════════════════════════
-- Récupère les ID réels des commandes et produits
-- ═══════════════════════════════════════════════════════════════

DECLARE @CMD1 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-001');
DECLARE @CMD2 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-002');
DECLARE @CMD3 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-003');
DECLARE @CMD4 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-004');
DECLARE @CMD5 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-005');
DECLARE @CMD6 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-006');
DECLARE @CMD7 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-007');
DECLARE @CMD8 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-008');
DECLARE @CMD9 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-009');
DECLARE @CMD10 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-010');
DECLARE @CMD11 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-011');
DECLARE @CMD12 INT = (SELECT CommandeId FROM Commandes WHERE NumCommande = 'CMD-012');

DECLARE @PRD1 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-001');
DECLARE @PRD2 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-002');
DECLARE @PRD3 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-003');
DECLARE @PRD4 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-004');
DECLARE @PRD5 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-005');
DECLARE @PRD6 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-006');
DECLARE @PRD7 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-007');
DECLARE @PRD8 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-008');
DECLARE @PRD9 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-009');
DECLARE @PRD10 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-010');
DECLARE @PRD11 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-011');
DECLARE @PRD12 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-012');
DECLARE @PRD13 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-013');
DECLARE @PRD15 INT = (SELECT ProduitId FROM Produits WHERE SalesforceId = 'SF-PRD-015');

MERGE INTO DetailCommande AS target
USING (VALUES
    -- CMD-001: MacBook Pro 14" + AirPods Pro
    (@CMD1, @PRD1, 'MacBook Pro 14" Gris Sidéral', 1, 2499.00, 'System', 'SF-DTL-001'),
    (@CMD1, @PRD5, 'AirPods Pro Blanc', 1, 279.00, 'System', 'SF-DTL-002'),
    
    -- CMD-002: 3x MacBook Pro 14"
    (@CMD2, @PRD1, 'MacBook Pro 14" pour équipe dev', 3, 2499.00, 'System', 'SF-DTL-003'),
    
    -- CMD-003: 1x iPhone 15 Pro
    (@CMD3, @PRD3, 'iPhone 15 Pro Titane Naturel', 1, 1229.00, 'System', 'SF-DTL-004'),
    
    -- CMD-004: 2x AirPods Pro
    (@CMD4, @PRD5, 'AirPods Pro pour équipe', 2, 279.00, 'System', 'SF-DTL-005'),
    
    -- CMD-005: 1x Dell XPS 15 (annulée)
    (@CMD5, @PRD9, 'Dell XPS 15 Argent', 1, 1899.00, 'System', 'SF-DTL-006'),
    
    -- CMD-006: Dell XPS 15 + Accessoires
    (@CMD6, @PRD9, 'Dell XPS 15 config standard', 1, 1899.00, 'System', 'SF-DTL-007'),
    (@CMD6, @PRD8, 'Magic Keyboard Blanc', 1, 129.00, 'System', 'SF-DTL-008'),
    (@CMD6, @PRD7, 'Magic Mouse Noir x3', 3, 99.00, 'System', 'SF-DTL-009'),
    (@CMD6, @PRD5, 'AirPods Pro x3', 3, 279.00, 'System', 'SF-DTL-010'),
    
    -- CMD-007: 1x iPhone 15
    (@CMD7, @PRD4, 'iPhone 15 Noir standard', 1, 969.00, 'System', 'SF-DTL-011'),
    
    -- CMD-008: 3x Lenovo ThinkPad X1
    (@CMD8, @PRD11, 'Lenovo ThinkPad X1 Carbon pour bureau', 3, 1799.00, 'System', 'SF-DTL-012'),
    
    -- CMD-009: iPad Pro + Apple Watch
    (@CMD9, @PRD13, 'iPad Pro 12.9" Gris Sidéral', 1, 1469.00, 'System', 'SF-DTL-013'),
    (@CMD9, @PRD15, 'Apple Watch Series 9 Minuit', 1, 449.00, 'System', 'SF-DTL-014'),
    
    -- CMD-010: 3x Dell XPS 13 + Magic Mouse
    (@CMD10, @PRD10, 'Dell XPS 13 pour développeurs', 3, 1499.00, 'System', 'SF-DTL-015'),
    (@CMD10, @PRD7, 'Magic Mouse accessoire', 3, 99.00, 'System', 'SF-DTL-016'),
    
    -- CMD-011: AirPods Max + Magic Mouse + Magic Keyboard
    (@CMD11, @PRD6, 'AirPods Max Argent', 1, 629.00, 'System', 'SF-DTL-017'),
    (@CMD11, @PRD7, 'Magic Mouse Noir', 1, 99.00, 'System', 'SF-DTL-018'),
    (@CMD11, @PRD8, 'Magic Keyboard Blanc', 1, 129.00, 'System', 'SF-DTL-019'),
    
    -- CMD-012: 2x HP Spectre x360
    (@CMD12, @PRD12, 'HP Spectre x360 pour commercial', 2, 1699.00, 'System', 'SF-DTL-020')
) AS source (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar, SalesforceId)
ON target.SalesforceId = source.SalesforceId
WHEN NOT MATCHED THEN
    INSERT (CommandeId, ProduitId, NomDetail, Quantite, PrixUnitaire, CreePar, SalesforceId, DateCreation, DerniereModification)
    VALUES (source.CommandeId, source.ProduitId, source.NomDetail, source.Quantite, source.PrixUnitaire, source.CreePar, source.SalesforceId, GETDATE(), GETDATE());

PRINT 'Détails de commandes insérés ou mis à jour avec succès';
GO