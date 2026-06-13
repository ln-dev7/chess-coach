# Chess Coach — Guide post-MVP (à lire par l'IA avant toute évolution)

> Ce document oriente les futures sessions de travail (humain + IA) sur ce projet.
> Lis-le en entier avant de proposer ou d'implémenter quoi que ce soit au-delà du MVP.

## Vision produit

Chess Coach transforme les parties d'un joueur en **coaching personnalisé** : analyse moteur,
détection des faiblesses récurrentes, leçons interactives et puzzles tirés de **ses propres parties**.

Trajectoire : outil perso (MVP actuel) → app publique multi-utilisateurs → **abonnement payant**.

## État actuel (MVP — ne pas casser)

- **Zéro backend** : pas de base de données, pas de compte. Tout vit dans `localStorage`
  (voir `src/lib/storage.ts`, clés `cc:*`). Choix délibéré (limite de comptes Supabase atteinte
  + simplicité). Le code d'accès aux données passe UNIQUEMENT par `storage.ts` — c'est
  l'interface à réimplémenter quand on ajoutera une vraie DB.
- **Tout tourne dans le navigateur** : fetch des parties (APIs publiques chess.com/lichess,
  CORS ok), analyse Stockfish WASM en Web Worker (`src/lib/engine.ts`), génération des leçons.
- **i18n FR/EN** : `src/lib/i18n/` (contexte React, locale persistée). Les leçons sont des
  **templates localisés** (`src/lib/lessons.ts`) : on stocke des données (positions, stats),
  jamais du texte — le texte est rendu dans la langue courante. Conserver ce principe.
- **Pédagogie** : suivre `docs/teaching-principles.md` (skill `teach` de Matt Pocock).
  Un concept par leçon, mission ancrée dans les données du joueur, quiz à réponses de
  longueur similaire, source primaire par leçon.

## Ce que le propriétaire veut après le MVP (par ordre)

### Phase 1 — Persistance & déploiement
1. **Migrer localStorage → IndexedDB** (via `idb` ou Dexie) : localStorage sature (~5 Mo)
   au-delà de ~300 parties analysées. Garder exactement la même interface que `storage.ts`
   (mêmes signatures, devenir async est acceptable).
2. **Déployer sur Vercel** (statique/client-only, aucun secret requis).
3. **Auto-sync hebdo côté client** : au chargement, si dernier sync > 7 jours → sync auto
   (stocker `cc:lastSync`). Un cron serveur n'a de sens qu'avec une DB (phase 2).

### Phase 2 — Backend & comptes
1. Réintroduire une DB hébergée. Schéma de référence : voir l'historique git (le fichier
   `supabase/migrations/001_init.sql` supprimé au passage au MVP sans DB) — tables `games`,
   `analyses`, `puzzles`, `lessons`, `settings`, avec RLS. Alternatives acceptables :
   Supabase (si compte dispo), Neon + Drizzle, ou Turso.
2. **Auth** (magic link / OAuth). Ajouter `user_id` partout + politiques RLS par utilisateur.
3. Migration douce : importer les données localStorage existantes vers le compte à la
   première connexion.
4. Déplacer le fetch des parties côté serveur (route handlers) + cron Vercel hebdo.

### Phase 3 — Monétisation
1. **Stripe** (abonnement mensuel). Gratuit : N parties analysées/mois + leçons de base.
   Payant : analyses illimitées/plus profondes, toutes les leçons, suivi long terme.
2. Analyse serveur optionnelle (queue + Stockfish natif) pour les abonnés.

### Phase 4 — Produit pédagogique (différenciation)
1. **Leçons générées par IA** : ✅ FAIT (en avance de phase). Voir `src/lib/dossier.ts`
   (dossier de coaching factuel : faiblesses, positions clés, gestion du temps %clk,
   conversion des positions gagnantes) + `src/app/api/coach-lesson/route.ts` (appel Claude,
   contrat anti-hallucination : les échiquiers ne peuvent référencer que des positions du
   dossier par id, les FEN sont réattachés côté serveur). Fallback : sans ANTHROPIC_API_KEY,
   le bouton IA est masqué et les leçons templates restent. Améliorations possibles :
   mémoire des leçons passées (learning records du teach skill), streaming, choix du modèle.
2. **Répétition espacée** des puzzles (revoir les puzzles ratés à J+1/J+3/J+7).
3. Détection de motifs plus fine (clouages, enfilades, surcharge, zeitnot via les timestamps
   `%clk` des PGN chess.com).
4. Coach conversationnel (chat contextuel sur une partie/position donnée).

## Conventions & contraintes techniques

- Next.js App Router + TypeScript strict + Tailwind v4. Pas de lib UI externe — le design
  actuel (zinc sombre + accent émeraude) est volontairement sobre, le proprio est designer/dev front.
- `chess.js` pour la logique échecs ; l'échiquier est un composant maison (`Board.tsx`)
  avec calques « lines of force » (NE PAS remplacer par react-chessboard sans demande explicite).
- Stockfish : copié dans `public/stockfish/` par `scripts/copy-stockfish.mjs` (postinstall).
  Build single-thread (pas de SharedArrayBuffer → pas de headers COOP/COEP à gérer).
- i18n : toute nouvelle string passe par `src/lib/i18n/en.ts` + `fr.ts` (mêmes formes).
  Jamais de texte en dur dans les composants.
- Données : tout accès passe par `storage.ts`. Si tu ajoutes une entité, ajoute-la là.
- Avant de livrer : `npm run build` doit passer (type-check inclus).

## Pièges connus

- L'API chess.com renvoie les archives par mois ; dédupliquer par `platform:external_id`.
- Les évals Stockfish sont du point de vue du trait → normalisées POV Blancs dans `engine.ts`.
- Les puzzles multi-coups : le PuzzlePlayer valide coup par coup mais n'auto-joue pas
  la réponse adverse sur l'échiquier (limitation MVP assumée, voir note dans le code).
- `localStorage` est par navigateur ET par device — prévenir l'utilisateur (déjà fait dans
  Réglages) tant que la phase 2 n'est pas faite.
