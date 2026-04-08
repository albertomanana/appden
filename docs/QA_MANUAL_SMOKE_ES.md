# QA Manual Smoke - The Appden

Fecha: 2026-04-08

## Objetivo

Este flujo sirve para probar la app con datos temporales y realistas sin depender de `SUPABASE_SERVICE_ROLE_KEY`.

Esta pensado para validar sobre todo:

- subida de canciones
- listado de musica
- reproduccion
- playlists
- comentarios, reacciones y favoritos
- deudas
- reports
- archivos
- estados vacios

## Archivos

- `supabase/seeds/qa_manual_smoke_reset.sql`
- `supabase/seeds/qa_manual_smoke_seed.sql`

## Como usarlo

1. Aplica las migraciones `001` -> `012`.
2. Abre Supabase SQL Editor.
3. Si quieres limpiar una pasada anterior, ejecuta:

```sql
-- supabase/seeds/qa_manual_smoke_reset.sql
```

4. Ejecuta:

```sql
-- supabase/seeds/qa_manual_smoke_seed.sql
```

5. Entra a la app con cualquier usuario ya existente.
6. Busca estos grupos:
   - `QA Temp: Music Smoke`
   - `QA Temp: Empty Corners`

## Que crea

El seed intenta reutilizar todos los perfiles existentes para que cualquier usuario real del proyecto pueda ver al menos el grupo principal.

### Grupo principal

`QA Temp: Music Smoke`

Incluye:

- canciones con audio funcional
- una cancion sin portada
- artistas multiples
- artistas vinculados a perfiles
- artistas manuales
- playlists con canciones
- comentarios y reply
- likes y reacciones
- letras y lineas sincronizadas
- actividad social
- archivos
- deudas con pago parcial y total
- reports
- changelog

### Grupo secundario

`QA Temp: Empty Corners`

Incluye:

- playlist vacia
- grupo casi vacio
- invitacion pendiente si hay suficientes perfiles

## Checklist de prueba

## 1. Smoke base

- `[BLOQUEANTE]` Login correcto.
- `[BLOQUEANTE]` El usuario ve `QA Temp: Music Smoke`.
- `[BLOQUEANTE]` La navegacion no rompe al entrar en Musica, Playlists, Reports, Deudas y Files.
- `[BLOQUEANTE]` No hay errores visibles en consola ni pantallas en blanco.

## 2. Musica

- `[BLOQUEANTE]` Entra en Musica y confirma que aparecen varias canciones.
- `[BLOQUEANTE]` Verifica que cada card muestre titulo, artista y portada o fallback visual.
- `[BLOQUEANTE]` Abre una cancion y comprueba:
  - detalle visible
  - creditos de artista renderizados
  - comentarios visibles
  - reacciones visibles
- `[BLOQUEANTE]` Reproduce una cancion desde la lista.
- `[BLOQUEANTE]` El mini player aparece.
- `[BLOQUEANTE]` Abre el full player y prueba:
  - play
  - pause
  - seek
  - siguiente
  - anterior
- `[RECOMENDADO]` Prueba una cancion sin portada.
- `[RECOMENDADO]` Prueba una cancion con varios artistas.
- `[RECOMENDADO]` Prueba una cancion con artista manual externo.

Resultado esperado:

- el audio suena
- la cola no se rompe
- el player no desaparece
- las canciones existen realmente en la lista

## 3. Subida de canciones

- `[BLOQUEANTE]` Sube una cancion nueva con MP3 valido.
- `[BLOQUEANTE]` Comprueba que tras subir:
  - aparece en la lista
  - aparece en detalle
  - se puede reproducir
- `[BLOQUEANTE]` Sube una cancion sin portada.
- `[RECOMENDADO]` Sube una cancion con varios artistas:
  - un perfil existente
  - un artista manual
- `[RECOMENDADO]` Edita una cancion ya creada y revisa que persistan los creditos.

Resultado esperado:

- no hay falsa sensacion de exito
- la cancion queda visible y reproducible
- el summary `artist_name` y los creditos estructurados se ven coherentes

## 4. Playlists

- `[BLOQUEANTE]` Abre `Smoke Rotation`.
- `[BLOQUEANTE]` Reproduce una cancion desde la playlist.
- `[BLOQUEANTE]` Abre `Road Test Mix` y verifica orden correcto.
- `[BLOQUEANTE]` Abre `Empty Playlist Check` y revisa el estado vacio.
- `[RECOMENDADO]` Agrega una cancion a una playlist.
- `[RECOMENDADO]` Quita una cancion de una playlist.
- `[RECOMENDADO]` Refresca y confirma persistencia.

Resultado esperado:

- las canciones de playlist hidratan bien
- se pueden reproducir
- el vacio se ve intencional, no roto

## 5. Social

- `[RECOMENDADO]` Abre una cancion con comentarios y responde uno.
- `[RECOMENDADO]` Agrega o quita favorito.
- `[RECOMENDADO]` Agrega o quita like.
- `[RECOMENDADO]` Cambia reaccion.
- `[RECOMENDADO]` Comprueba que la actividad del grupo no se vea vacia.
- `[RECOMENDADO]` Revisa si existe una solicitud global en Connections.
- `[RECOMENDADO]` Revisa si existe una solicitud de amistad por grupo.

## 6. Deudas

- `[BLOQUEANTE]` Entra en Deudas y abre las creadas por el seed.
- `[BLOQUEANTE]` Verifica un caso parcial y uno pagado.
- `[RECOMENDADO]` Comprueba:
  - historial de pagos
  - reminder
  - installments
  - goal
  - badges
- `[RECOMENDADO]` Crea una deuda nueva y registra un pago.

Resultado esperado:

- importes, estados y pagos encajan
- no hay balances imposibles

## 7. Reports

- `[BLOQUEANTE]` Entra en Reports y verifica que hay al menos dos registros.
- `[BLOQUEANTE]` Comprueba uno con imagen y otro sin imagen.
- `[RECOMENDADO]` Filtra por estado o busca por texto.
- `[RECOMENDADO]` Crea un report nuevo.

## 8. Files

- `[BLOQUEANTE]` Entra en Files y verifica:
  - documento PDF
  - documento markdown o texto
  - imagen
- `[RECOMENDADO]` Abre cada uno.
- `[RECOMENDADO]` Sube un archivo nuevo.

## 9. Changelog

- `[BLOQUEANTE]` Entra en Changelog y confirma que hay entradas reales.
- `[RECOMENDADO]` Comprueba que el orden por fecha y release date tiene sentido.

## 10. Estados vacios y bordes

- `[BLOQUEANTE]` Entra en `QA Temp: Empty Corners`.
- `[BLOQUEANTE]` Verifica la playlist vacia.
- `[RECOMENDADO]` Si tienes invitacion pendiente, revisa ese flujo.
- `[RECOMENDADO]` Revisa que un grupo casi sin contenido no parezca roto.

## 11. Senales de que todavia hay fallo real

Marca como bug si ocurre cualquiera de estas:

- subes una cancion y no aparece en lista
- aparece en lista pero no reproduce
- reproduce en detalle pero no desde playlist
- playlist muestra entradas pero sin hidratar cancion
- creditos de artista desaparecen al refrescar
- la cancion nueva solo se ve tras recargar varias veces
- la UI muestra exito pero Supabase no ha persistido nada
- el player se rompe al cambiar de cancion
- el scroll deja de funcionar dentro de musica o playlists

## Limpieza

Cuando termines, puedes borrar solo estos datos temporales ejecutando:

```sql
-- supabase/seeds/qa_manual_smoke_reset.sql
```

## Nota

Para un barrido mucho mas completo sigue usando tambien:

- `docs/QA_TEST_CHECKLIST.md`

Este documento esta mas centrado en un smoke test manual rapido y repetible.
