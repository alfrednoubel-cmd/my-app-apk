# MON VTC GESTION — LOGICIEL COMMERCIAL VTC (FRANCE)

Application mobile professionnelle de gestion d'activité, facturation, bons de commande réglementaires et comptabilité pour chauffeur VTC indépendant en France.

---

## 1. Contexte Juridique & Réglementaire Intégré

L'application intègre nativement l'ensemble des obligations légales françaises :
- **Arrêté du 6 août 2025** relatif au justificatif de réservation préalable des voitures de transport avec chauffeur (VTC) et article R. 3122-11 du Code des transports.
- **Loi n° 2022-172 du 14 février 2022** : mention obligatoire **« EI »** accolée au nom et prénom de l'exploitant individuel.
- **Régime Micro-Entrepreneur & Franchise en base de TVA** (Article 293 B du Code Général des Impôts) : mention automatique *« TVA non applicable, art. 293 B du CGI »*.
- **Code de commerce (Art. L. 441-10 et D. 441-5)** : mentions B2B obligatoires de pénalités de retard et indemnité forfaitaire de recouvrement de 40 €.
- **Livre chronologique des recettes** (Art. L. 123-28 du Code de commerce et art. 286 du CGI) avec assiette de calcul de cotisations URSSAF.
- **Réforme de la facturation électronique** (2026-2027) : module Factur-X XML (CII UN/CEFACT profil Basic/Minimum).

---

## 2. Architecture & Modules Développés

```
mon-vtc-gestion/
├── App.tsx                                 # Routeur réactif principal & point d'entrée
├── app.json                                # Configuration Expo & identifiants bundles
├── package.json                            # Dépendances applicatives
├── tsconfig.json                           # Configuration TypeScript strict
│
├── supabase/
│   └── migrations/
│       ├── 01_initial_schema.sql           # Schéma relationnel complet (PostgreSQL)
│       ├── 02_security_rls.sql             # Politiques Row-Level Security strictes
│       └── 03_functions_triggers.sql       # Compteurs atomiques, inaltérabilité, livre des recettes
│
└── src/
    ├── constants/
    │   ├── theme.ts                        # Design system luxe (Qonto / Revolut Pro)
    │   └── legal.ts                        # Constantes juridiques et fiscales
    ├── types/
    │   └── models.ts                       # Types TypeScript (Client, Booking, Invoice, Payment)
    ├── services/
    │   ├── supabase.ts                     # Client Supabase HTTPS / WSS
    │   ├── storage.ts                      # Cache local sécurisé (AsyncStorage / Local-First)
    │   ├── numberingService.ts             # Séquenceur chronologique continu garanti sans trou
    │   ├── pdfService.ts                   # Moteur PDF du Justificatif VTC (Arrêté 6 août 2025)
    │   ├── invoicePdfService.ts            # Moteur PDF Factures & Avoirs réglementaires
    │   ├── shareService.ts                 # Partage WhatsApp direct (+33), Email, Impression
    │   ├── receiptBookExportService.ts     # Export officiel CSV (Excel) et PDF du Livre des Recettes
    │   ├── alertsService.ts                # Alertes factures impayées, seuils TVA et courses du jour
    │   ├── syncEngine.ts                   # File d'attente hors-ligne & synchronisation réconciliée
    │   └── einvoicingService.ts            # Générateur structuré Factur-X XML (Réforme 2026/2027)
    ├── stores/
    │   ├── useAuthStore.ts                 # Authentification chauffeur
    │   ├── useProfileStore.ts              # Paramètres exploitant (SIRET, REVTC, IBAN, mention EI)
    │   ├── useClientStore.ts               # Répertoire Particuliers / Entreprises
    │   ├── useBookingStore.ts              # Réservations préalables & horodatages immuables
    │   ├── useInvoiceStore.ts              # Facturation, suppléments et factures d'avoir
    │   └── usePaymentStore.ts              # Règlements multi-modes & livre des recettes
    ├── components/ui/
    │   ├── Button.tsx                      # Boutons haute précision
    │   ├── Input.tsx                       # Saisie avec libellé et validations
    │   ├── Card.tsx                        # Surfaces contrastées
    │   ├── Badge.tsx                       # Statuts couleur normalisés
    │   └── Header.tsx                      # En-têtes d'écrans
    └── screens/
        ├── auth/LoginScreen.tsx            # Écran de connexion & mode démo
        ├── settings/ProfileSettingsScreen.tsx # Configuration unique de l'entreprise
        ├── dashboard/DashboardScreen.tsx   # Tableau de bord financier & alertes
        ├── bookings/
        │   ├── QuickBookingScreen.tsx      # Bon de commande express en < 30 secondes
        │   └── BookingDetailScreen.tsx     # Fiche justificatif de contrôle police/DREAL
        ├── clients/ClientsListScreen.tsx   # Annuaire et recherche clients
        ├── invoices/
        │   ├── ConvertBookingToInvoiceScreen.tsx # Conversion 1-clic course ➔ facture
        │   ├── InvoiceDetailScreen.tsx     # Fiche facture, encaissement, Factur-X et avoirs
        │   └── InvoicesListScreen.tsx      # Registre chronologique des factures
        └── accounting/ReceiptBookScreen.tsx# Livre des recettes, calculs URSSAF & exports
```

---

## 3. Guide de Démarrage Rapide

### Prérequis
- Node.js (version 18 ou supérieure).
- Application mobile **Expo Go** (téléchargeable gratuitement sur l'App Store iOS ou Google Play Store).

### Lancement en développement
```bash
# Se placer dans le dossier du projet
cd mon-vtc-gestion

# Installer les dépendances
npm install

# Démarrer le serveur de développement Expo
npx expo start
```
- Scannez le QR code affiché dans le terminal avec l'appareil photo de votre iPhone ou avec l'application Expo Go sur Android. L'application se charge instantanément sur votre smartphone.

---

## 4. Configuration de la Base de Données Supabase

1. Créez un projet gratuit ou Pro sur [Supabase](https://supabase.com).
2. Rendez-vous dans **SQL Editor**.
3. Exécutez les trois scripts de migration dans l'ordre :
   - `supabase/migrations/01_initial_schema.sql`
   - `supabase/migrations/02_security_rls.sql`
   - `supabase/migrations/03_functions_triggers.sql`
4. Récupérez vos clés dans **Project Settings > API** :
   - Renseignez `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans votre fichier `.env`.

---

## 5. Procédure de Sauvegarde et Restauration

### Sauvegarde Cloud Automatique (PostgreSQL)
- Supabase réalise des sauvegardes quotidiennes automatiques.
- Pour une sauvegarde manuelle instantanée :
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > mon_vtc_backup_$(date +%Y%m%d).sql
```

### Sauvegarde Locale Sécurisée (Sur Smartphone)
- Depuis l'écran **Livre des Recettes**, appuyez sur **Export Excel / CSV** ou **Export PDF** chaque fin de mois.
- Conservez les fichiers exportés dans votre dossier comptable ou cloud personnel (Google Drive / iCloud) pendant 10 ans conformément à l'article L. 123-22 du Code de commerce.

---

## 6. Publication sur l'App Store et Google Play

Le projet utilise **EAS (Expo Application Services)** pour générer les paquets natifs de production :
```bash
# Installation du CLI EAS
npm install -g eas-cli

# Connexion à votre compte Expo
eas login

# Configuration initiale du projet
eas build:configure

# Génération du binaire Android (.aab pour Google Play Store)
eas build --platform android --profile production

# Génération du binaire iOS (.ipa pour App Store Connect)
eas build --platform ios --profile production

# Soumission automatique aux stores
eas submit --platform all
```
