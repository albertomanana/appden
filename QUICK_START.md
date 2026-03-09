# 🚀 QUICK START - The Appden

## ⚡ En 5 Minutos

### 1. Instala dependencias (1 min)
```bash
npm install
```

### 2. Crea `.env.local` (30 sec)
```bash
copy .env.example .env.local
```

**Edita `.env.local`** y pega tus credenciales Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**¿De dónde sacas las credenciales?**
- Ve a https://supabase.com
- Crea proyecto (o entra a uno existente)
- Vé a **Settings** → **API**
- Copia `Project URL` y `anon public key`

### 3. Database Setup (1 min)
1. En Supabase → **SQL Editor**
2. Abre el archivo `supabase/migrations/001_initial_schema.sql`
3. Cópialo TODO
4. Pégalo en una nueva query de Supabase
5. Click ▶️ **Run**

### 4. Storage Buckets (1 min)
En Supabase → **Storage**, crea 4 buckets **privados**:
- `avatars`
- `song-covers`
- `songs`
- `files`

### 5. Lanza la app (30 sec)
```bash
npm run dev
```

✅ Abre http://localhost:5173

---

## 🐛 Si se queda cargando

### Opción A: Usa check-setup
```bash
./check-setup.bat
```

### Opción B: Verifica en DevTools
1. Abre F12 (DevTools)
2. Vé a **Console**
3. Mira los mensajes con emojis 🔐✅❌

**Si ves "timeout"** → credenciales están mal

---

## ✅ ¿Funciona?

- [ ] Ves "Login" o "Register"
- [ ] Puedes entrar con email/password
- [ ] Ves el dashboard
- [ ] Puedes crear un grupo

Si todo está ✅ → **¡Listo para usar!**

---

## 📚 Siguientes pasos

- Ver [README.md](README.md) para docs completas
- Invita amigos: Grupos → Copy Invite Link
- Sube música: Música → Upload Song
- Crea playlists

---

¿Preguntas? Mira la sección **Troubleshooting** en [README.md](README.md)
