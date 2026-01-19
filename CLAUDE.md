# Habit Tracker - AI Desktop Agent

## Visão Geral
Aplicativo desktop Tauri + React para tracking de hábitos com controle por voz (STT/TTS) e banco de dados local SQLite.

## Stack Tecnológica
- **Frontend**: React + TypeScript + Vite + shadcn/ui + Zustand
- **Backend**: Tauri (Rust) + SQLite
- **Voz**: OpenAI Realtime API (STT) + ElevenLabs (TTS)

## Estrutura do Banco de Dados

```sql
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  name TEXT,
  frequency TEXT,
  streak INTEGER DEFAULT 0
);

CREATE TABLE completions (
  id INTEGER PRIMARY KEY,
  habit_id INTEGER,
  date TEXT,
  FOREIGN KEY(habit_id) REFERENCES habits(id)
);

-- Indexes para performance
CREATE INDEX idx_date ON completions(date);
CREATE INDEX idx_habit_id ON completions(habit_id);
```

## Funcionalidades Core

### 1. Log por Voz
- Parse de comandos: "Registre gym 30min" → insert completion + update streak
- Resposta TTS: "Gym logado! Streak 5 dias"

### 2. Dashboard
- Lista de hábitos (shadcn Table)
- Streaks (shadcn Progress)
- Heatmap calendário (Calendar + Badge)
- AI summary de progresso

### 3. Lembretes
- Notificações nativas Tauri para hábitos pendentes
- Relatório semanal por voz

## Configuração Tauri

### Plugins Necessários
```bash
cargo add tauri-plugin-sql --features sqlite
```

### main.rs
```rust
.plugin(tauri_plugin_sql::init())
```

### tauri.conf.json
- Permissões: microphone, notifications
- API keys em configuração (não no frontend)

## Padrões de Código

### Frontend (TypeScript)
```typescript
// tsconfig.json: "strict": true, "noImplicitAny": true

interface Habit {
  id: number;
  name: string;
  frequency: string;
  streak: number;
}

interface Completion {
  id: number;
  habit_id: number;
  date: string;
}
```

### Componentes Principais
- `<VoiceListener />` - captura e processa comandos de voz
- `<HabitTable data={habits} />` - lista de hábitos
- `<StreakChart />` - visualização de streaks

### Hooks Custom
- `useSQLite()` - queries ao banco
- Zustand store para habits e voice state

### Backend (Rust)
```rust
#[tauri::command]
async fn get_habits(db: State<Mutex<SqlitePool>>) -> Result<Vec<Habit>, String> {
    // implementação
}
```

## APIs de Voz

### OpenAI Realtime (STT)
- WebSocket com reconnect (exponential backoff)
- Eventos: "session.updated" para intents, "error" com toast

### ElevenLabs (TTS)
```javascript
fetch('/v1/text-to-speech/{voice_id}', {
  headers: { 'xi-api-key': apiKey }
}) // → play com AudioContext
```
- Fallback: Web Speech API se offline

## Segurança
- Queries parametrizadas sempre (evitar SQL injection)
- Validar inputs de voz contra injeções
- API keys no backend, nunca no frontend

## Performance
- SQLite: PRAGMA journal_mode=WAL
- React: memo/useMemo para listas grandes
- Debounce na captura de voz
- Bundle target: <50MB

## Testes
- **Unit**: Vitest (frontend) + cargo test (Rust)
- **E2E**: Playwright com mock MediaStream
- **Performance**: Lighthouse <50ms input latency

## Comandos de Desenvolvimento
```bash
# Frontend
npm install
npm run dev

# Tauri
cargo tauri dev
cargo tauri build
```
