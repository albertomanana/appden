# Archivos en Cloudflare R2 (sin coste de salida)

El plan gratuito de Supabase incluye 5 GB de *egress* al mes. Casi todo ese
consumo lo generaban los audios, portadas y avatares servidos desde Supabase
Storage. Con R2 los archivos se sirven gratis: Cloudflare no cobra la salida de
datos. Supabase se queda solo con la base de datos y el login, que gastan muy poco.

```
App ──(login, datos)──────────────▶ Supabase
App ──(firmar / subir / reproducir)▶ Worker "appden-storage" ──▶ R2 (bucket appden-media)
```

El Worker comprueba tu sesión de Supabase y que perteneces al grupo del archivo.
Las URLs firmadas no cambian durante el día, así que el navegador y la PWA cachean
portadas y avatares, y el audio se sirve con `Range` (para poder avanzar en el iPhone).
Las rutas de los archivos no cambian: no hay que tocar la base de datos.

Mientras `VITE_STORAGE_URL` no esté configurada, la app sigue usando Supabase Storage.

## Límites gratuitos de R2 (al mes)

| Recurso | Gratis | Uso típico del grupo |
| --- | --- | --- |
| Almacenamiento | 10 GB | ~1.500 canciones de 6 MB |
| Salida de datos | Ilimitada y gratis | — |
| Escrituras (subidas) | 1 millón | — |
| Lecturas | 10 millones | — |
| Peticiones al Worker | 100.000 al día | — |

Cloudflare pide un método de pago para activar R2 aunque te quedes dentro del plan gratuito.

## 1. Crear el bucket

1. Crea una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com).
2. **R2 Object Storage → Create bucket** con el nombre `appden-media`.

## 2. Desplegar el Worker

```bash
cd r2-worker
npm install
npx wrangler login
```

Edita `r2-worker/wrangler.toml`:

- `SUPABASE_URL`: la URL de tu proyecto (la misma que `VITE_SUPABASE_URL`).
- `SUPABASE_ANON_KEY`: la *anon key* pública (la misma que `VITE_SUPABASE_ANON_KEY`).
- `ALLOWED_ORIGINS`: tu dominio de Vercel y `http://127.0.0.1:4173`, separados por comas.

Crea los secretos (te pedirá el valor; usa cadenas largas aleatorias):

```bash
npx wrangler secret put SIGNING_SECRET
npx wrangler secret put ADMIN_SECRET
# Opcional, si tu proyecto usa el "JWT secret" clásico (Settings → API):
npx wrangler secret put SUPABASE_JWT_SECRET
```

Despliega:

```bash
npx wrangler deploy
```

Te dará una URL del tipo `https://appden-storage.TU-SUBDOMINIO.workers.dev`.
Comprueba que responde: `https://appden-storage.TU-SUBDOMINIO.workers.dev/health` → `{"ok":true}`.

## 3. Conectar la app

Añade la URL del Worker:

- En `.env.local`: `VITE_STORAGE_URL=https://appden-storage.TU-SUBDOMINIO.workers.dev`
- En **Vercel → Settings → Environment Variables**, la misma variable, y vuelve a desplegar.

Desde ese momento todo lo nuevo (canciones, portadas, avatares, archivos y
justificantes) se sube y se sirve desde R2.

## 4. Copiar los archivos que ya existen

Descargar los archivos actuales de Supabase cuenta como *egress* **una sola vez**.
Si tu proyecto está bloqueado por haber superado la cuota, espera a que se reinicie
el ciclo mensual (o amplía el plan solo ese mes) y entonces ejecuta:

Añade a `.env.local` (nunca a Vercel ni al código):

```
SUPABASE_SERVICE_ROLE_KEY=...      # Supabase → Settings → API → service_role
STORAGE_ADMIN_SECRET=...           # el mismo valor que pusiste en ADMIN_SECRET
```

```bash
npm run storage:migrate:dry   # cuenta archivos y tamaño, no copia nada
npm run storage:migrate       # copia todo a R2 (se puede repetir; salta lo ya copiado)
```

Cuando compruebes que la app reproduce y muestra portadas desde R2, puedes vaciar
los buckets de Supabase Storage para liberar su cuota de almacenamiento.

## 5. Otras medidas que reducen el consumo de Supabase

- Portadas y avatares quedan en la caché de la PWA (`appden-images`) aunque la firma cambie cada día.
- Las firmas se piden en lote: una petición para toda la biblioteca.
- El Worker cachea la sesión y la pertenencia a grupos durante unos minutos.
