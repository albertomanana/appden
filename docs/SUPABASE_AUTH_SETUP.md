# Autenticación de Supabase: puesta a punto

Guía para dejar el registro, el login, la aprobación de cuentas y la recuperación
de contraseña funcionando en el proyecto de Supabase de The Appden.

## 1. Aplica las migraciones pendientes

En **Supabase → SQL Editor**, ejecuta en orden los archivos de `supabase/migrations/`
que aún no hayas aplicado. Para la autenticación la clave es:

- `015_auth_approval_invites_posts_notifications.sql`

Todas las migraciones nuevas se pueden ejecutar varias veces sin romper nada.

## 2. Hazte administrador

Las cuentas nuevas solo necesitan aprobación si existe al menos un administrador.
Ejecuta esto una vez, con tu email:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'tu@email.com'
ON CONFLICT DO NOTHING;
```

A partir de ese momento verás **Perfil → Solicitudes de cuenta** para aprobar o
rechazar a quien se registre. Si prefieres que cualquiera con cuenta pueda entrar sin
aprobación, no crees ningún administrador.

## 3. Ajustes del panel (Authentication → URL Configuration)

| Ajuste | Valor |
| --- | --- |
| Site URL | La URL de producción, p. ej. `https://the-appden.vercel.app` (nunca `localhost` en producción) |
| Redirect URLs | `https://TU-DOMINIO/**` y, para desarrollo, `http://127.0.0.1:4173/**` |

Sin esas URLs, el enlace de confirmación de email y el de recuperar contraseña te
mandan a la URL por defecto y parece que "no hace nada".

En **Authentication → Providers → Email**:

- *Confirm email*: actívalo en producción. En un proyecto de pruebas puedes
  desactivarlo para no depender del email ni del límite de envíos.
- El SMTP integrado de Supabase solo envía unos pocos emails por hora. Si os
  registráis varios a la vez, configura un SMTP propio (Resend, Brevo…).

## 4. Problemas típicos

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Al registrarse: "Database error saving new user" | Trigger de la migración 013 (insertaba un email nulo) | Aplica la 015 |
| Entras y la app te devuelve al login con el aviso "pendiente de aprobación" | La cuenta tiene `is_approved = false` | Apruébala desde *Solicitudes de cuenta* o con `UPDATE profiles SET is_approved = true WHERE id = '...'` |
| Había que iniciar sesión dos veces / la app se quedaba cargando | La app llamaba a Supabase dentro del callback de `onAuthStateChange` (bloqueo del lock de auth) | Corregido en `AuthProvider.tsx` |
| El enlace de "recuperar contraseña" abre la app pero no deja poner una nueva | La pantalla solo sabía pedir el email | Corregido en `ResetPasswordPage.tsx`; revisa las Redirect URLs |
| Funciona en incógnito pero no en la pestaña normal | Sesión o service worker antiguos en el navegador | Login → "¿Problemas para entrar? Reparar la sesión de este dispositivo" |

## 5. Seguridad

`.env.local` está en `.gitignore`, pero sigue versionado en Git desde la v1.0.
La `anon key` es pública por diseño, pero si ese archivo llegó a contener la
`service_role key`, rótala en **Settings → API**. Para dejar de versionarlo:

```bash
git rm --cached .env.local
```
