# apps/web — Frontend Playprint (Astro + React Islands, Cloudflare Workers)

## Règles non négociables

- **Composant `.astro` par défaut.** Un composant `.tsx` avec directive `client:*` n'est autorisé
  que s'il gère un état qui change sur action utilisateur, ou s'il utilise une API navigateur.
- **Rendu à la requête par défaut** (`output: 'server'`). `export const prerender = true`
  est réservé aux pages identiques pour tous les visiteurs (aucune lecture de session).
- **La session appartient à l'API (Lucia).** Ne jamais activer Astro Sessions (`session: false`).
- **Aucun nouveau runtime** : pas de second framework UI, pas de fetch côté client
  quand le serveur peut rendre la donnée.
- Couleurs : uniquement les utilitaires sémantiques (bg-surface, text-score-high…).
  La palette Tailwind par défaut est purgée ; aucun hex dans un composant.
- `--muted` n'est jamais une couleur de texte lisible (contraste 2.3:1).

## Commandes (depuis la racine du monorepo)

- `npm run dev:web` — serveur de dev (workerd). `npm run dev` lance API + web.
- `npm run typecheck -w apps/web` — régénère `worker-configuration.d.ts` puis `astro check`.
- `npm run build:web` — build de production.
- Après toute modification de `wrangler.jsonc` : relancer le typecheck (types Workers).

## Documentation

- Routing et middleware : https://docs.astro.build/en/guides/routing/
- Composants de framework (islands) : https://docs.astro.build/en/guides/framework-components/
- Adapter Cloudflare : https://docs.astro.build/en/guides/integrations-guide/cloudflare/