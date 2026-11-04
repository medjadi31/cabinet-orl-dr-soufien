# CABINET ORL — Dr M. SOFIANE

Application web responsive (ordinateur, tablette et téléphone), interface en français.

## Contenu de cette version
- Tableau de bord et navigation responsive.
- Aperçu des patients avec recherche et création.
- Création de rendez-vous associés à un patient.
- Pages de structure pour consultations, facturation, statistiques et paramètres.
- Connexion Supabase prévue et schéma SQL avec Row Level Security.
- Mode démonstration sans connexion : toutes les données sont fictives et locales à la session.

## Démarrage local
Prérequis : Node.js 20+.

```bash
npm install
cp .env.example .env
npm run dev
```

Sans variables Supabase, l'application démarre en mode aperçu avec des données fictives.
Pour construire les fichiers statiques : `npm run build` (sortie dans `dist/`).

## Activation de la synchronisation en ligne
1. Créer un projet Supabase dédié au cabinet, avec région d'hébergement choisie après vérification des exigences de confidentialité et de transfert des données de santé.
2. Exécuter `supabase/schema.sql` dans SQL Editor.
3. Créer les comptes du médecin et de la secrétaire dans Authentication.
4. Ajouter une ligne `profiles` pour chaque compte, avec `role='doctor'` ou `role='secretary'` et le même UUID que l'utilisateur Auth.
5. Copier l'URL du projet et la clé publique `anon` dans `.env` (jamais la clé `service_role`).
6. Déployer l'application sur un hébergement HTTPS privé et configurer les domaines autorisés.

## Limites importantes
Cette livraison est un **prototype de départ**, pas un logiciel médical prêt pour une mise en production clinique. Le module de consultations détaillées, les ordonnances PDF, les pièces jointes, la facturation complète, l'audit des accès, les sauvegardes/restauration testées et les règles de conservation doivent être finalisés et testés avant d'y saisir de vraies données.
Les données de santé sont particulièrement sensibles. Avant usage réel, faire valider l'hébergement, les accès, le chiffrement, le contrat du fournisseur, la conformité au droit algérien applicable et les procédures de sauvegarde par un professionnel compétent. Ne jamais utiliser des données réelles dans la démo.
