# Changelog

All notable changes to **VSCode Helper** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [0.2.0] - 2026-11-01

### Added
- 🇷🇺 **Полная поддержка русского языка (Russian Language Support)**:
  - Двуязычный интерфейс и сообщения диагностики: поддержка автоопределения или принудительного выбора через настройку `vscodeHelper.language` (`"auto"`, `"ru"`, `"en"`).
  - Локализация манифеста расширения (`package.nls.json` и `package.nls.ru.json`) для всех команд и параметров конфигурации в интерфейсе VS Code.
  - Поиск и авто-исправление скрытых русских букв-омоглифов в латинском коде (`cyrillic-in-code`): предотвращает трудноуловимые синтаксические ошибки при случайном наборе кириллицы (например, русских 'а', 'с', 'е', 'о', 'р', 'х' внутри имен переменных и ключевых слов).
  - Распознавание русских маркеров в комментариях: `// НАДО:`, `// ИСПРАВИТЬ:`, `// КОСТЫЛЬ:`, `// ВНИМАНИЕ:`, `// БАГ:`.
  - Русские сниппеты для быстрой вставки комментариев (`nado`, `ispravit`, `kostyl`, `vnimanie`).
- 🚀 **Multi-Language Support**: Added rules for Java, C/C++, Go, and Rust alongside JavaScript, TypeScript, and Python.
  - **Java**: `java-string-eq` (`==` vs `.equals()`), `java-system-out`, `java-print-stack-trace`, `java-empty-catch`.
  - **C / C++**: `c-unsafe-gets` (dangerous `gets`), `c-unsafe-strcpy`, `cpp-null` (`NULL` to `nullptr`), `c-goto`.
  - **Go**: `go-builtin-println`, `go-panic`.
  - **Rust**: `rust-unwrap` (safe unwrap suggestion), `rust-println`, `rust-unsafe` audit notice.
  - **Python**: `py-none-compare` (`== None` -> `is None`), `py-boolean-compare`, `py-bare-except`, `py-mutable-default`.
  - **JS / TS**: `no-debugger` (auto-removes `debugger;`), `no-nan-compare`, `no-alert`, `empty-catch` auto-fix.
- 🛡️ **In-Code Rule Suppression**:
  - `// vscode-helper-disable-line [rule-id]` (or `# vscode-helper-disable-line`)
  - `// vscode-helper-disable-next-line [rule-id]`
  - `/* vscode-helper-disable */` ... `/* vscode-helper-enable */`
  - Quick-fix code action to automatically add inline ignore comment.
- 📊 **Status Bar Item**: Live count of errors and warnings with one-click access to suggestions and fixes.
- ⚙️ **Configurable Severity & Options**:
  - Filter by `vscodeHelper.severity` (`hint`, `information`, `warning`, `error`).
  - `vscodeHelper.disabledRules` to globally disable chosen rules.
  - `vscodeHelper.maxLineLength` custom line threshold.
  - `vscodeHelper.showStatusBar` and `vscodeHelper.showDecorations`.
- ⚡ **Debounced Live Typing**: Fast, non-blocking live checks without editor stutter.
- 🔧 **New Commands**:
  - `VSCode Helper: Toggle Enable/Disable`
  - `VSCode Helper: Clear Diagnostics & Highlights`
  - `VSCode Helper: Show File Analysis Summary`
- 🧪 **Unit Test Suite**: 19 automated tests validating rules, scanner, auto-fixes, and suppressions.
- 🎨 **Official Extension Icon & Themed Colors**: Brand new 128x128 icon and registered theme decorations.

### Fixed
- Fixed bug where `vscodeHelper.severity` setting was ignored in diagnostics.
- Fixed mutable default argument regex in Python incorrectly flagging immutable tuples `()`.
- Fixed false positive warnings inside comments and string literals.
- Fixed hover popup triggering across the entire line instead of the hovered issue range.
- Fixed theme color object bug in text editor decoration type.
- Fixed `fixAll` edit overlap conflict when a line had multiple fixes.
- Fixed missing ESLint configuration and missing test runner script.

### Changed
- Migrated publisher and repository ownership to **anom-developer**.

---

## [0.1.0] - 2025-05-25

### Added
- 🔍 Diagnostics provider — errors, warnings, hints with related info
- 💡 Code action provider — quick-fix lightbulb for auto-fixable issues
- 📖 Hover provider — inline explanations for flagged code
- ✍️ Completion provider — best-practice snippets
- 🎨 Decoration provider — colour highlights + overview ruler markers
- JS/TS rules: `no-var`, `eqeqeq`, `no-eval`, `no-console`, `empty-catch`, `todo-comment`, `magic-number`
- Python rules: `py-bare-except`, `py-mutable-default`, `py-wildcard-import`, `py-print`
- Generic rules: `long-line`, `trailing-whitespace`
- `Analyze Current File`, `Fix All Issues`, `Show Suggestions` commands
- Settings: `enable`, `analyzeOnSave`, `analyzeOnType`, `severity`
