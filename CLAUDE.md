# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run tauri dev          # Run Tauri app with hot reload

# Build
npm run tauri build        # Build production executable (.exe/.msi)

# Frontend only
npm run dev                # Run Vite dev server (frontend only)
npm run build              # Build frontend

# Supabase Edge Functions
supabase functions serve   # Local edge function testing
supabase functions deploy  # Deploy to production
```

## Architecture Overview

This is a **Tauri 2 + React** desktop app for habit tracking with voice control. It uses a **multi-window architecture** with different routes loading different components.

### Window System

| Window | Route | Component | Size | Purpose |
|--------|-------|-----------|------|---------|
| main (orb) | `/` | App.tsx → SpotlightInterface | 500x64px | Floating voice/text input |
| settings | `/settings` | MainWindow → DashboardPage | 900x640px | Full dashboard |
| onboarding | `/onboarding` | OnboardingWindow | 450x520px | First-time setup |

**Routing** is handled in `src/main.tsx` via `window.location.pathname` (not React Router).

### State Management (Zustand)

- `useHabitStore` - Habits, completions, voice state
- `useSettingsStore` - API keys, TTS settings, API mode (default/custom)
- `useAuthStore` - Supabase auth state
- `useWidgetStore` - Active widget overlays

### Data Flow

```
Frontend Hooks → SQLite (local) + Supabase (cloud)
                      ↓
           useDatabase (local queries)
           useCloudSync (real-time sync)
           useAuth (authentication)
```

### API Mode System

- **Default mode**: Uses Supabase Edge Functions (requires auth, no voice input)
- **Custom mode**: User's own API keys (full features including voice input)

Voice input requires custom API keys because OpenAI Realtime API needs direct WebSocket connection.

## Key Patterns

### ⚠️ Window Creation from Invoke Handlers

**ALWAYS** use `std::thread::spawn` when creating windows from Tauri commands to avoid deadlock:

```rust
#[tauri::command]
fn open_my_window(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(50));

        if let Some(window) = app.get_webview_window("my_window") {
            let _ = window.show();
            let _ = window.set_focus();
            return;
        }

        let _ = WebviewWindowBuilder::new(&app, "my_window", WebviewUrl::App("/route".into()))
            .title("Window Title")
            .inner_size(800.0, 600.0)
            .build();
    });
}
```

**Why?** Calling `WebviewWindowBuilder::build()` directly from an invoke handler causes deadlock because both need the event loop.

### Edge Functions Structure

Located in `supabase/functions/`:
- `/chat` - Proxies OpenAI API with auth
- `/tts` - Proxies ElevenLabs API with auth

Both require Supabase session token and read API keys from Supabase secrets.

### Voice Pipeline

1. User speaks → `useOpenAIRealtime` WebSocket → live transcription
2. Speech end → `useHabitAgent` processes with GPT-4o-mini
3. AI response → `useSpeech` → TTS playback (ElevenLabs or Web Speech API)

### i18n

Languages: Portuguese (pt), English (en)
Files: `src/i18n/locales/{pt,en}.json`
Usage: `const { t } = useTranslation(); t("key.path")`

## Database

### Local SQLite
Tables: `habits`, `completions`, `goals`, `achievements`, `settings`
Migrations: `src-tauri/src/lib.rs` (get_migrations function)

### Cloud (Supabase)
Tables: `profiles`, `friendships`, `competitions`, etc.
Migrations: `supabase/migrations/`

## Important Files

- `src-tauri/src/lib.rs` - Rust backend, window management, Tauri commands
- `src/main.tsx` - Route-based component selection
- `src/components/SpotlightInterface.tsx` - Main orb UI
- `src/pages/DashboardPage.tsx` - Full dashboard with tabs
- `src/hooks/useHabitAgent.ts` - Voice command processing
- `src/store/useSettingsStore.ts` - API mode and settings
