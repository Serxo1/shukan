# Changelog

Todas as mudanças notáveis do projeto serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
-

### Alterado
-

### Corrigido
-

---

## [0.1.0] - 2025-01-21

### Adicionado
- Interface do orbe flutuante com controle por voz
- Integração com OpenAI GPT-4o-mini para processamento de comandos
- Text-to-speech via ElevenLabs
- Sistema de hábitos com streaks
- Dashboard completo com estatísticas
- Sincronização na nuvem via Supabase (opcional)
- Armazenamento local com SQLite
- Atalho global `Win+Shift+H` para toggle do orbe
- Tray icon com menu de contexto
- Onboarding para novos usuários
- Suporte a português e inglês

### Técnico
- Tauri 2 + React + TypeScript
- Zustand para state management
- Sistema de autenticação Supabase
- Edge Functions para proxy de APIs

---

[Unreleased]: https://github.com/sergi/habit-tracker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sergi/habit-tracker/releases/tag/v0.1.0
