# The Appden 🎵

A private PWA for friends to share music, manage playlists, track debts, and collaborate in real-time.

**Status**: MVP Phase 5 - Feature Complete

## 🎯 Overview

The Appden is a closed-group application designed for circles of friends. It enables:
- **Music Sharing**: Upload and stream music files within your groups
- **Playlists**: Create collaborative playlists and manage songs
- **Favorites**: Mark and organize your favorite songs
- **Debt Tracking**: Split expenses and track who owes whom
- **File Sharing**: Share documents and images securely
- **Shared Links**: Generate shareable links with expiry options
- **100% Private**: All data restricted to group members by default

Everything is encrypted, private by default, and installable as a PWA on mobile and desktop.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (global state) + React Router (navigation)
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **PWA**: vite-plugin-pwa + Service Worker
- **Icons**: lucide-react

### Project Structure

```
the-appden/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── offline.html           # Offline fallback page
│   └── icons/                 # App icons for PWA
├── src/
│   ├── app/
│   │   ├── router/            # React Router configuration
│   │   ├── providers/         # Auth provider & context
│   │   └── store/             # Zustand state management
│   ├── components/
│   │   ├── common/            # Reusable components (Avatar, ProtectedRoute)
│   │   ├── layout/            # Layout (AppLayout, Navigation)
│   │   ├── ui/                # UI components (Toast, ConfirmDialog, etc.)
│   │   ├── music/             # Music components (Player, Cards)
│   │   ├── playlists/         # Playlist components
│   │   ├── debts/             # Debt components
│   │   ├── groups/            # Group management components
│   │   ├── files/             # File sharing components
│   │   └── share/             # Sharing utilities
│   ├── features/              # Feature-specific logic (if needed)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── supabase/          # Supabase client & config
│   │   ├── utils/             # Utility functions
│   │   ├── validators/        # Zod validation schemas
│   │   └── constants/         # App constants
│   ├── pages/                 # Page components
│   ├── services/              # API/business logic services
│   ├── types/                 # TypeScript interfaces
│   ├── main.tsx               # App entry point
│   └── App.tsx                # Root component
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Complete database schema + RLS
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project (free tier works)

### Local Setup

1. **Clone and install**:
   ```bash
   cd the-appden
   npm install
   ```

2. **Create `.env.local`** (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   ```

3. **Configure Supabase credentials** in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

4. **Run Supabase migrations**:
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Copy and run the entire `supabase/migrations/001_initial_schema.sql` file
   - This creates all tables, indexes, triggers, enums, and RLS policies

5. **Configure Storage Buckets** in Supabase:
   - Go to **Storage** in your Supabase dashboard
   - Create these buckets (make them **private**):
     - `avatars`
     - `covers`
     - `songs`
     - `files`
   - Note: Files are secured via Row Level Security (RLS) policies

6. **Start development server**:
   ```bash
   npm run dev
   ```
   - Open http://localhost:5173
   - Register a new account to test

## 🗄️ Database Schema

### Main Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (display name, avatar, bio) |
| `groups` | Friend groups (containers for collaborative data) |
| `group_members` | Group membership with roles (owner/member) |
| `songs` | Audio files with metadata (title, artist, duration) |
| `favorites` | User's favorite songs |
| `playlists` | Collaborative playlists |
| `playlist_songs` | Songs in playlists with ordering |
| `debts` | Debt records between users |
| `debt_payments` | Payment history for debts |
| `files` | Shared files (images, documents) |
| `shared_links` | Public/private shareable links with expiry |
| `notifications` | In-app notifications (for future real-time push) |

### Key Features

- **RLS Policies**: All tables have Row Level Security enabled
  - Users can only access data from groups they're members of
  - Creditors/debtors can see relevant debts
  - Uploader can delete their own files
  - See `001_initial_schema.sql` for complete policies

- **Auto-Updated Fields**: `created_at`, `updated_at` via triggers

- **Enums**: `group_role`, `debt_status`, `debt_currency`, etc.

- **Indexes**: For performance on frequently filtered columns

## 🔐 Security

### Authentication

- Email/password registration via Supabase Auth
- Session persistence (automatic)
- Password reset via email
- Protected routes (AuthProvider + ProtectedRoute)

### Authorization

- **Row Level Security (RLS)**: Enforced at the database level
  - No group data leaks between groups
  - Users can't access others' files/playlists/debts outside their group
  - Shared links validate access before revealing content

- **Storage Policies**: Files are private by default
  - Access controlled via Supabase Storage policies

### Best Practices

- All sensitive operations go through the backend
- No tokens stored in localStorage (handled by Supabase)
- HTTPS enforced in production
- CORS configured in Supabase dashboard

## 🎵 Music Player

The app includes a global music player with:
- Play/Pause/Next/Previous controls
- Volume control with slider
- Seek bar with duration display
- Repeat modes (off/all/one)
- Shuffle mode
- Queue management
- Audio duration automatic extraction on upload

**State Management**: Zustand store (`player.store.ts`)

## 💰 Debt Tracking

Track who owes whom:
- Create debts with amount, currency, concept
- Record partial payments
- Auto-calculate status (pending/partial/paid)
- Debt summaries per user (total owed, lent, balance)
- Full payment history

## 🔗 Shared Links

Generate shareable links for:
- Songs
- Playlists
- Debts
- Files

Features:
- Optional expiry date
- Private (requires login) or limited (token-based)
- Copy to clipboard
- Share via WhatsApp or Web Share API

## 📱 PWA Features

- **Installable**: Add to home screen on mobile/desktop
- **Offline Support**: Cached assets load offline
- **Manifest**: Configured icons and metadata
- **Service Worker**: Automatic cache management
- **Offline Fallback**: `offline.html` page
- **web-app-capable**: Works as standalone app

**To Install**:
1. Visit the app in your browser
2. Look for "Install" prompt or use browser menu → "Install app"
3. Opens as a native-like app on your device

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/the-appden
   git push -u origin main
   ```

2. Connect to Vercel:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables (`.env.local` contents)
   - Deploy

3. Configure domain (optional):
   - In Vercel dashboard, add your custom domain

### Docker

1. Build image:
   ```bash
   docker build -t the-appden .
   ```

2. Run container:
   ```bash
   docker run -p 3000:80 the-appden
   ```

### Self-Hosted

Build and serve the static files:
```bash
npm run build
# dist/ folder contains the built app
# Serve dist/ with any web server (nginx, Apache, etc.)
```

## 📚 API Services

### Available Services

All services are in `src/services/`:

- **auth.service**: Login, register, logout, password reset
- **profile.service**: Get/update profiles, avatar upload
- **groups.service**: CRUD for groups and members
- **songs.service**: Upload songs, fetch, delete
- **playlists.service**: Create, edit, manage playlists
- **favorites.service**: Add/remove favorites
- **debts.service**: Debt CRUD, payment recording, summaries
- **files.service**: File upload/delete
- **shared-links.service**: Generate, validate shared links
- **share.service**: WhatsApp, clipboard, Web Share API

### Example Usage

```typescript
import { songsService } from '@services/songs.service'

// Upload a song
const song = await songsService.uploadSong(
  userId,
  groupId,
  audioFile,
  coverFile,
  { title: 'My Song', artist_name: 'Me' }
)

// Get all songs
const songs = await songsService.getSongs(groupId, userId)
```

## 🎨 Styling & Theming

- **Tailwind CSS** for utility-first styling
- **Dark theme** with purple/magenta brand colors
- **Responsive design**: Mobile-first approach
- **Custom colors**: See `tailwind.config.js`

### Color Palette

- Brand: `#8b5cf6` (purple)
- Accent: `#ec4899` (magenta)
- Neutral: Grays `#0f0f0f` to `#e5e5e5`
- Semantic: Red (errors), green (success), blue (info)

## 🔧 Development

### Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Environment Variables

See `.env.example` for required variables:

```
VITE_SUPABASE_URL           # Supabase project URL
VITE_SUPABASE_ANON_KEY      # Supabase anonimous API key
```

### TypeScript

Strict mode enabled via `tsconfig.json`:
- No implicit any
- Strict null checks
- Strict function types

## 🐛 Troubleshooting

### "Connection refused" when starting dev
- Check Node version: `node --version` (should be 18+)
- Check port 5173 is free or update Vite config

### "CORS error" on Supabase calls
- In Supabase dashboard → Project Settings → API → CORS settings
- Add your domain (e.g., `http://localhost:5173`)

### "Auth fails" on registration
- Check `.env.local` has correct `VITE_SUPABASE_URL` and key
- Confirm user creation isn't hitting email verification (check Supabase docs)

### Songs won't play
- Check browser console for CORS errors
- Confirm storage bucket is created and has RLS policies
- Verify audio file format (mp3, wav, etc.)

### PWA won't install
- Must be served over HTTPS (in production)
- Check manifest.json is valid and accessible
- Try in incognito/private mode first

## 📖 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand Store](https://github.com/pmndrs/zustand)
- [React Router](https://reactrouter.com)
- [Zod Validation](https://zod.dev)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 📄 Features Checklist

### Phase 1 ✅
- [x] Auth (login, register, reset password)
- [x] Profiles (create, edit, avatar upload)
- [x] Groups (create, manage, invite)
- [x] Layout (responsive, mobile nav, desktop sidebar)

### Phase 2 ✅
- [x] Music upload & playback
- [x] Favorites management
- [x] Playlists (create, edit, reorder)
- [x] Global music player with all controls

### Phase 3 ✅
- [x] Debt tracking (create, edit, delete)
- [x] Payment recording & history
- [x] Debt summaries per user

### Phase 4 ✅
- [x] File sharing (upload, download)
- [x] Shared links with expiry
- [x] Share via WhatsApp & Web Share API

### Phase 5 ✅
- [x] Skeleton loaders
- [x] Empty states
- [x] Toast notifications
- [x] Confirm dialogs
- [x] Notification Center page
- [x] Group Management pages
- [x] PWA offline support
- [x] Audio duration extraction
- [x] RLS policies complete

## 🚦 What's Next (Future Enhancements)

- Real-time notifications via Pusher/WebSockets
- Email notifications
- Advanced search & filtering
- Batch operations
- Mobile app (React Native)
- Analytics dashboard
- Premium features (storage limits, etc.)
- Backup/export functionality
- User blocking
- Group roles refinement
- Spotify/YouTube integration

## 📞 Support

For issues:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check Supabase dashboard for database errors
4. Create an issue with details and steps to reproduce

## 📝 License

MIT License - feel free to use this for personal or commercial projects.

---

**Built with 🎵 & ☕ for private friend groups.**

Made with React, Supabase, and lots of coffee ☕

