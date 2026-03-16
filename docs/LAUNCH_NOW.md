# The Appden - Launch Now

## 1) Variables de entorno
Configura estas variables en tu hosting:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 2) Base de datos
Ejecuta migraciones en Supabase SQL Editor:

- `001_initial_schema.sql`
- `002_song_lyrics_social.sql`
- `003_lyrics_social_pro_features.sql`
- `004_debts_pro_retention_admin.sql`

## 3) Deploy rapido
### Vercel
- Importa el repo.
- Vercel detecta `vercel.json` y hace rewrite SPA.
- Build command: `npm run build`
- Output: `dist`

### Netlify
- Importa el repo.
- Usa `netlify.toml`.
- Build command: `npm run build`
- Publish directory: `dist`

## 4) Si en navegador normal falla y en incognito no
- En login usa: `Reparar sesion local (si solo funciona en incognito)`.
- Esto limpia auth local, caches y service workers viejos.

## 5) Checklist final
- Login/Register funcionando.
- Subida de canciones y portadas OK.
- Deudas: reparto, recordatorios, cuotas, export.
- Compartir URL de produccion con tus amigos.
