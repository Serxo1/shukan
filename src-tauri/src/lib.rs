use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

// Get the path to the onboarding flag file
fn get_onboarding_flag_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("onboarding-complete"))
}

// Check if onboarding has been completed
fn is_onboarding_complete(app: &tauri::AppHandle) -> bool {
    get_onboarding_flag_path(app)
        .map(|path| path.exists())
        .unwrap_or(false)
}

// Mark onboarding as complete
fn mark_onboarding_complete(app: &tauri::AppHandle) -> Result<(), String> {
    let path = get_onboarding_flag_path(app)
        .ok_or_else(|| "Could not get app data directory".to_string())?;

    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Create the flag file
    fs::write(&path, "complete").map_err(|e| e.to_string())?;
    Ok(())
}

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create habits and completions tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS habits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    frequency TEXT NOT NULL DEFAULT 'daily',
                    streak INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS completions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    habit_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    notes TEXT,
                    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
                CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON completions(habit_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create settings table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add quantitative habits and achievements",
            sql: r#"
                -- Add quantitative tracking fields to habits
                ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT 'star';
                ALTER TABLE habits ADD COLUMN color TEXT DEFAULT '#8B5CF6';
                ALTER TABLE habits ADD COLUMN target_type TEXT DEFAULT 'boolean';
                ALTER TABLE habits ADD COLUMN target_value REAL DEFAULT 1;
                ALTER TABLE habits ADD COLUMN target_unit TEXT;
                ALTER TABLE habits ADD COLUMN best_streak INTEGER DEFAULT 0;

                -- Add value field to completions for quantitative tracking
                ALTER TABLE completions ADD COLUMN value REAL DEFAULT 1;

                -- Goals table for streak/weekly/monthly goals
                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    habit_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    target_value INTEGER NOT NULL,
                    achieved_at TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
                );

                -- Achievements table for gamification
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    icon TEXT,
                    unlocked_at TEXT,
                    habit_id INTEGER,
                    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
                );

                -- Index for goals lookup
                CREATE INDEX IF NOT EXISTS idx_goals_habit_id ON goals(habit_id);
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.center();
            // Force focus after a small delay to ensure window is ready
            let window_clone = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(50));
                let _ = window_clone.set_focus();
            });
        }
    }
}

fn hide_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn open_settings_window(app: &tauri::AppHandle) {
    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    // Create new settings window
    let _window = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("/settings".into()))
        .title("Habit Tracker")
        .inner_size(900.0, 640.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .decorations(false)
        .center()
        .build();
}

fn open_onboarding_window(app: &tauri::AppHandle) {
    // Check if onboarding window already exists
    if let Some(window) = app.get_webview_window("onboarding") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    // Create new onboarding window
    if let Ok(window) = WebviewWindowBuilder::new(app, "onboarding", WebviewUrl::App("/onboarding".into()))
        .title("Welcome to Habit Tracker")
        .inner_size(450.0, 520.0)
        .resizable(false)
        .decorations(false)
        .transparent(false)
        .center()
        .focused(true)
        .build()
    {
        // Enable devtools in debug mode
        #[cfg(debug_assertions)]
        window.open_devtools();
    }
}

#[tauri::command]
fn show_onboarding(app: tauri::AppHandle) {
    open_onboarding_window(&app);
    hide_window(&app);
}

#[tauri::command]
fn hide_orb(app: tauri::AppHandle) {
    println!("[Command] hide_orb called");
    hide_window(&app);
}

#[tauri::command]
fn open_dashboard(app: tauri::AppHandle) {
    println!("[Command] open_dashboard called");
    open_settings_window(&app);
}

#[tauri::command]
fn check_onboarding_complete(app: tauri::AppHandle) -> bool {
    is_onboarding_complete(&app)
}

#[tauri::command]
fn complete_onboarding(app: tauri::AppHandle) -> Result<(), String> {
    // Mark onboarding as complete
    mark_onboarding_complete(&app)?;

    // Close onboarding window
    if let Some(window) = app.get_webview_window("onboarding") {
        let _ = window.close();
    }

    // Show and focus the main window (orb)
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.center();
        let _ = window.set_focus();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:habits.db", get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Create tray menu
            let settings_item = MenuItem::with_id(app, "settings", "Configurações", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Habit Tracker")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => {
                        open_settings_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        toggle_window(app);
                    }
                })
                .build(app)?;

            // Register global shortcut
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH);
                let app_handle = app.handle().clone();

                // Unregister first in case it's already registered from a previous instance
                let _ = app.global_shortcut().unregister(shortcut);

                match app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                    // Only trigger on key press, not release
                    if event.state == ShortcutState::Pressed {
                        println!("[Shortcut] Win+Shift+H pressed, toggling window");
                        toggle_window(&app_handle);
                    }
                }) {
                    Ok(_) => println!("[Shortcut] Successfully registered Win+Shift+H"),
                    Err(e) => eprintln!("[Shortcut] Failed to register: {}", e),
                }
            }

            // Check if onboarding is complete
            let app_handle = app.handle().clone();
            if !is_onboarding_complete(&app_handle) {
                // First time running - show onboarding, hide orb
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
                open_onboarding_window(&app_handle);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_onboarding,
            check_onboarding_complete,
            complete_onboarding,
            hide_orb,
            open_dashboard
        ])
        .on_window_event(|window, event| {
            // Hide main window instead of closing when clicking X or pressing Escape
            // But allow other windows (like settings) to close normally
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
