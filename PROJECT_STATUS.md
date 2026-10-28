# The Appden — Estado del proyecto

Actualizado: 2026-10-28

## Estado

Versión estable en local: `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
Nada está commiteado todavía.

## Qué hay que hacer en Supabase (en este orden)

1. `supabase/migrations/015_auth_approval_invites_posts_notifications.sql` — arregla el
   registro ("Database error saving new user"), la aprobación de cuentas, los likes
   de posts, los enlaces de invitación, salir de un grupo y crea notificaciones reales.
2. `supabase/migrations/016_albums.sql` — álbumes como entidad (`albums`, `songs.album_id`).
   Sin ella la app agrupa por `album_name`.
3. `supabase/migrations/017_debts_group_members.sql` — deudas entre cualquier par de
   miembros (necesaria para la calculadora de reparto), pagos registrados por
   cualquiera de las dos partes y fecha límite.
4. Ajustes de Auth y cómo hacerse administrador: `docs/SUPABASE_AUTH_SETUP.md`.

## Hecho en esta revisión

- Auth: sin bloqueo del lock de Supabase (doble login), recuperación de contraseña
  completa, aviso de cuenta pendiente, invitaciones que sobreviven al login, limpieza
  del reproductor al cerrar sesión.
- Grupos: "mis grupos" solo incluye grupos donde eres miembro, selector de grupo en la
  cabecera, invitación por enlace, salir/eliminar, feedback visible.
- Amigos: página unificada (amigos, solicitudes, buscar) e invitar amigos a grupos.
- Música: filas compactas con menú de acciones, álbumes, artistas (miembros),
  reproductor con gestos, color de portada, controles en pantalla de bloqueo,
  arreglo de reproducción en iOS.
- Cuentas: calculadora de reparto (varios pagadores, iguales/partes/exacto/
  consumiciones, propina, redondeo, transferencias mínimas) en
  `src/features/debts/split.ts`; formulario "Me deben / Debo yo".
- Interfaz: rediseño móvil (bottom sheets, tabs, tipografía, inputs de 16 px) y
  escritorio con menú lateral plegable y barra de reproductor.

## Pendiente (siguiente sesión)

- Rediseño visual (funcionan, pero con el estilo antiguo): ficha de canción
  (`SongDetailPage`, `LyricsPanel`, comentarios), playlists, favoritas, página de
  artista (`ArtistProfilePage`), ficha de deuda (`DebtDetailPage`), paneles de
  estadísticas de deudas, reportes, novedades, archivos y la página pública `/shared`.
- Selector de álbum existente en el formulario de subida (la API ya está en
  `src/features/music/services/albums.service.ts`).
- Pasada de tildes en textos antiguos ("cancion", "musica"…).
- Verificación con una cuenta real tras aplicar 015–017.
- Dejar de versionar `.env.local` (ver `docs/SUPABASE_AUTH_SETUP.md`).
