# Feature Status (Roadmap 1-43)

Status legend:

- `Implemented`: present in code and wired in UI/flow
- `Partial`: core logic exists but still needs production-hardening or missing endpoint/integration details
- `Pending`: not found in current code

## 1-10 Advanced Player

1. Dynamic background from cover: `Implemented`
   - `src/features/player/utils/colorExtraction.ts`, `usePlayer`, `FullPlayer`
2. Full-screen + mini player modes: `Implemented`
   - `src/features/player/components/MiniPlayer.tsx`, `FullPlayer.tsx`
3. Real crossfade: `Implemented`
   - `src/features/player/player.engine.ts` (`crossfadeToSong`)
4. Gapless-oriented preloading: `Implemented`
   - `player.engine.ts` (`setUpcomingSong`, preload handling)
5. EQ presets: `Implemented`
   - `player.equalizer.ts`, controls in `PlayerControls.tsx`
6. Volume normalization: `Implemented`
   - normalized gain + compressor chain in `player.engine.ts`
7. Editable queue + drag/drop: `Implemented`
   - `QueuePanel.tsx`, queue actions in `player.store.ts`
8. Playback history: `Implemented`
   - `player.store.ts` + `player.persistence.ts`
9. Continue listening: `Partial`
   - snapshot/store logic exists; explicit resume prompt UX is limited
10. Auto radio: `Implemented`
   - `player.queue.ts` + `startRadioFromSong` in store/UI

## 11-17 Lyrics

11. Auto lyrics detection with ASR on upload: `Implemented`
   - `SongUploadForm.tsx` + `lyricsService.autoTranscribeOnUpload`
12. Line timestamp sync for karaoke mode: `Implemented`
   - timed parsing/highlight in `LyricsPanel.tsx`
13. Owner editor with live preview: `Implemented`
   - `LyricsPanel.tsx`
14. Community proposals + owner approval: `Implemented`
   - `song_lyrics_proposals` + panel actions
15. Versioning + rollback: `Implemented`
   - `song_lyrics_versions`, rollback flows
16. Optional ES/EN translation: `Implemented`
   - `lyricsService.translateLyrics`, translation table/fallback
17. Verified/not-verified indicator: `Implemented`
   - `is_verified` metadata + UI label/toggle

## 18-23 Song Social

18. Comments with replies: `Implemented`
   - parent-child comments in `SongSocialPanel.tsx`
19. Likes on song and comment: `Implemented`
   - `song_likes`, `song_comment_likes`
20. Quick reactions (`fire`, `heart`, `headphones`): `Implemented`
   - `song_reactions` and UI toggles
21. `@user` mentions in comments: `Implemented`
   - mention suggestions/token insertion in panel
22. Share exact timestamp in comments: `Implemented`
   - `[mm:ss]` tokens + jump playback
23. Group activity feed: `Implemented`
   - `group_activity` + `GroupActivityFeed`

## 24-30 UI/UX Pro

24. Large cover + glass controls: `Implemented`
   - `FullPlayer` + `.glass` styles
25. Mobile gestures (swipe next/prev, double-tap like): `Implemented`
   - touch handlers in `FullPlayer.tsx`
26. Compact/expanded player mode: `Implemented`
   - `isCompactMode` in player state + UI switches
27. Premium empty states: `Implemented`
   - multiple feature pages with styled empty states
28. Visual themes (Dark, Neon, Minimal): `Implemented`
   - CSS theme vars + player setting
29. Premium typography/spacing: `Implemented`
   - global typography and spacing refinements
30. Rhythm progress animation: `Implemented`
   - `rhythm-progress` animation + tempo-aware option

## 31-38 Debts Pro

31. Split calculator (equal/percent/exact): `Implemented`
   - `DebtSplitCalculator`, `debtProService.calculateSplitShares`
32. Who paid what + ticket/photo: `Implemented`
   - payment receipt fields + upload in debt flow
33. Auto reminders (push/email/whatsapp link): `Partial`
   - local notification + WhatsApp URL present; full backend email/push pipeline not complete
34. Reminder frequency profile: `Implemented`
   - `suave/normal/estricto` in reminder config
35. Payment plans/installments: `Implemented`
   - `debt_installments` + plan UI
36. Smart settlement minimization: `Implemented`
   - settlement algorithm in `debtProService.getSettlementPlan`
37. Monthly balance summary: `Implemented`
   - `getMonthlySummary` + UI
38. Group financial health score: `Implemented`
   - `getFinancialHealth` + UI

## 39-43 Retention/Admin

39. Push notifications web/mobile: `Partial`
   - permission and local Notification API support only
40. Group goals: `Implemented`
   - `group_goals` + panel UI
41. Badges/gamification: `Implemented`
   - `user_badges` + recompute flow
42. Backup/export CSV/JSON: `Implemented`
   - `debtProService.exportGroupData`
43. Group admin role permissions: `Implemented`
   - `group_member_permissions` + `GroupPermissionsPanel`

## Post 43 Additions (2026-03-19)

- Internal changelog module: `Implemented`
  - `src/features/changelog/*`, route `/changelog`, table `changelog_entries`
- In-app reports module: `Implemented`
  - `src/features/reports/*`, route `/report`, table `reports`
