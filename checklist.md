Setup SQLite
Instale cargo add tauri-plugin-sql --features sqlite em src-tauri; no main.rs: .plugin(tauri_plugin_sql::init()).
​

Frontend: npm i tauri-plugin-sql-api; abra DB com const db = await SQLite.open('sqlite:history.db') — path relativo a AppData garante portabilidade Win/Mac.
​

Crie schema no init: await db.execute('CREATE TABLE IF NOT EXISTS habits (id INTEGER PRIMARY KEY, name TEXT, frequency TEXT, streak INTEGER DEFAULT 0); CREATE TABLE completions (id INTEGER PRIMARY KEY, habit_id INTEGER, date TEXT, FOREIGN KEY(habit_id) REFERENCES habits(id))');.
​

Checklist Atualizado
Permissões: Confirme microphone/notifications no tauri.conf.json e plist; teste navigator.mediaDevices.getUserMedia em dev tools.
​

Estado DB: Manage pool com Mutex<Connection> no Rust state; evite lifetime errors em async commands usando state.blocking_lock().await ou spawn_blocking.
​

Queries Seguras: Sempre use params em execute/query para evitar SQL injection (ex: db.select('SELECT * FROM habits WHERE name = ?', [name])); migração via raw SQL no app start.
​

Integração Voz/DB
Após STT (OpenAI/ElevenLabs), parse intent e chame DB: ex: "registre ler" → insert completion, update streak com query UPDATE habits SET streak = streak + 1 WHERE id = ?.
​

shadcn: Table para lista hábitos, Progress para streaks; debounce voz para evitar spam inserts.
​

Offline: Toda lógica voz/DB local; sync com Supabase no futuro via export db.dump() para JSON.

Testes e Erros Comuns
Erro "database locked": Use single writer com Mutex; teste multi-thread com cargo test.
​

Path DB falha: Sempre './history.db' (AppDir); limpe appdata em uninstall tests.
​

Build: tauri build gera .db no bundle; teste em clean installs Win/Mac VMs.
​

Funções Core do App
Log Voz: Parse comandos ("Registre gym 30min") → insert completion, calcule streak diário/semanal; responda TTS "Gym logado! Streak 5 dias".
​

Dashboard Insights: Query streaks médios, heatmap calendário (shadcn Calendar + Badge), AI summary ("Melhorei 20% em leitura via LLM").
​

Lembretes/Relatórios: Notificações nativas Tauri para hábitos devidos; relatório semanal voz ("Você completou 80% dos hábitos").
​

Config/Personalização: Vozes ElevenLabs custom (PT-BR), temas shadcn, export JSON para migração Supabase.

Boas Práticas Código Frontend
TS strict: tsconfig.json com "strict": true, "noImplicitAny": true; defina interfaces ex: interface Habit { id: number; name: string; streak: number; }.
​

Componentes shadcn: Crie <VoiceListener />, <HabitTable data={habits} />, <StreakChart />; use hooks custom como useSQLite() para queries.
​

Estado: Zustand store para habits/realtime voice state; memoize com React.memo/useMemo para listas grandes.
​

Boas Práticas Código Backend/Rust
Comandos Tauri: Exponha #[tauri::command] async fn get_habits(db: State<Mutex<SqlitePool>>) -> Result<Vec<Habit>, String>; use rusqlite ou sqlx para pool.
​

Error handling: Result<T, String> com ?; log com tauri::api::dialog para user-friendly ("Erro DB: tente reiniciar").
​

Otimização SQLite: Indexes em date/habit_id (CREATE INDEX idx_date ON completions(date)); VACUUM/PRAGMA journal_mode=WAL para perf.
​

Voz e APIs Práticas
OpenAI Realtime: WebSocket com reconnect (expo backoff); trate "session.updated" para intents, "error" com toast shadcn.
​

ElevenLabs: fetch('/v1/text-to-speech/{voice_id}', { headers: { 'xi-api-key': apiKey } }) → play AudioContext; fallback Web Speech se offline.
​

Segurança: API keys em tauri.conf.json (não frontend); valide inputs voz contra SQLi/injeções.

Testes e Otimização
Unit: Vitest para hooks/DB mocks; cargo test para Rust commands.
​

E2E: Playwright para fluxos voz (mock MediaStream); performance: Lighthouse <50ms input latency.
​

Bundle: Code split routes com Vite; target <50MB final app.
​