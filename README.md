# 🛠 VSCode Helper

> **Умный помощник для VS Code**: подсветка проблем, подсказки лучших практик, обнаружение ошибок и автоматическое исправление кода (Quick Fix) для **JavaScript, TypeScript, Python, Java, C/C++, Go, Rust**.

[![CI](https://github.com/anom-developer/vscode-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/anom-developer/vscode-helper/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-007acc)

---

## 📥 Как установить расширение (Installation)

Файл готового расширения `vscode-helper-0.2.0.vsix` уже собран и находится прямо в корне проекта! Любой пользователь может установить его за пару секунд:

### Способ 1: Через интерфейс VS Code (Графический интерфейс)
1. Откройте **VS Code**.
2. Перейдите во вкладку **Расширения** (`Ctrl + Shift + X` на Windows/Linux или `Cmd + Shift + X` на macOS).
3. Нажмите на значок **`...` (Ещё)** в правом верхнем углу панели расширений.
4. Выберите пункт **Установить из VSIX...** (*Install from VSIX...*).
5. Выберите файл `vscode-helper-0.2.0.vsix` из этой папки. Расширение сразу готово к работе!

---

### Способ 2: Через командную строку (Терминал)
Выполните одну команду в терминале:

```bash
code --install-extension vscode-helper-0.2.0.vsix
```

---

### Способ 3: Сборка свежего .vsix своими руками
Если вы внесли изменения в код и хотите собрать новый `.vsix`:

```bash
npm install
npm run package
```
Команда скомпилирует проект и упакует свежий файл `.vsix`.

---

## ✨ Возможности (Features)

| Функция | Описание |
|---|---|
| 🔍 **Обнаружение ошибок и антипаттернов** | Мгновенно выявляет потенциальные баги, утечки и устаревший синтаксис на сохранении или при вводе. |
| 🔧 **Авто-исправление (QuickFix & Fix All)** | Исправление в один клик (`Ctrl+.` / `Cmd+.`): замена `var` на `const`, нестрогих равенств `==` на `===`, `== None` на `is None`, удаление `debugger;` и очистка висячих пробелов. |
| 📊 **Информативная строка состояния (Status Bar)** | Индикатор в правом нижнем углу: `$(check) Helper: OK` или `$(warning) Helper: 3 issues`, клик по которому сразу открывает список рекомендаций. |
| 🛡️ **Игнорирование правил (Inline Suppression)** | Добавление комментариев `// vscode-helper-disable-line` или `// vscode-helper-disable-next-line` одной кнопкой из меню QuickFix. |
| 💡 **Умные подсказки при наведении (Hover)** | Наведите курсор на подчеркнутый код, чтобы прочитать подробное объяснение, почему это считается проблемой и как её решить. |
| 🎨 **Визуальные маркеры (Decorations)** | Аккуратная подсветка в коде и метки на полосе прокрутки (Overview Ruler). |
| 📝 **Сниппеты лучших практик** | Шаблоны для `try-catch` с логированием, безопасных функций, датаклассов, обработки ошибок в Go/Rust. |

---

## 🔎 Поддерживаемые языки и правила (Rules)

### 🟨 JavaScript / TypeScript
- `no-var` — замена устаревшего `var` на `const`/`let` *(авто-исправление)*
- `eqeqeq` — строгое равенство `===` и `!==` вместо `==` и `!=` *(авто-исправление)*
- `no-debugger` — случайный `debugger;` в коде *(авто-исправление: удаление)*
- `no-nan-compare` — предотвращает бесполезные проверки `x === NaN` *(авто-исправление)*
- `no-console` — предупреждение о `console.log/warn/error` перед релизом
- `no-alert` — блокирующие модальные окна `alert()`, `confirm()`, `prompt()`
- `empty-catch` — пустые блоки `catch {}` без логирования *(авто-исправление)*
- `no-eval` — критическая уязвимость вызова `eval()`
- `magic-number` — предупреждение о магических числах без констант
- `todo-comment` — подсветка `TODO`, `FIXME`, `HACK`, `BUG`

### 🐍 Python
- `py-bare-except` — опасный `except:` перехватывает `SystemExit` *(авто-исправление на `except Exception:`)*
- `py-mutable-default` — изменяемые значения по умолчанию `def f(x=[])` или `def f(x={})`
- `py-none-compare` — правильное сравнение с `None`: `is None` и `is not None` *(авто-исправление)*
- `py-boolean-compare` — сравнения с булевыми значениями `== True` / `== False` (PEP 8)
- `py-wildcard-import` — `from module import *` загрязняет пространство имен
- `py-print` — использование `print()` вместо модуля `logging` в продакшене
- `py-todo` — напоминания `# TODO`, `# FIXME`

### ☕ Java
- `java-string-eq` — сравнение строк через `==` вместо `.equals()`
- `java-system-out` — прямой вывод в `System.out.println` вместо логгера
- `java-print-stack-trace` — `e.printStackTrace()` в продакшене
- `java-empty-catch` — пустой перехват исключений

### ⚙️ C / C++
- `c-unsafe-gets` — критически опасная функция `gets()` (удалена в C11)
- `c-unsafe-strcpy` — риск переполнения буфера в `strcpy`, `strcat`, `sprintf`
- `cpp-null` — устаревший макрос `NULL` в современном C++ *(авто-исправление на `nullptr`)*
- `c-goto` — неструктурированные переходы `goto`

### 🔷 Go
- `go-builtin-println` — встроенный `println` вместо `fmt.Println` *(авто-исправление)*
- `go-panic` — вызовы `panic()` в обычной бизнес-логике

### 🦀 Rust
- `rust-unwrap` — риск паники при `.unwrap()` без контекста ошибки
- `rust-println` — использование `println!` вместо макросов библиотеки `log` / `tracing`
- `rust-unsafe` — маркер блока `unsafe { ... }` для проверки инвариантов безопасности

### 🌐 Общие правила (Generic)
- `trailing-whitespace` — лишние пробелы в конце строк *(авто-исправление)*
- `long-line` — слишком длинные строки (по умолчанию больше 120 символов)

---

## 🛡️ Подавление проверок в коде (Suppression)

Вы можете отключать проверки точечно прямо в кодовой базе:

```typescript
// Отключить все правила для следующей строки:
// vscode-helper-disable-next-line
var legacyVariable = 1;

// Отключить конкретное правило для текущей строки:
console.log("Debug info"); // vscode-helper-disable-line no-console

/* vscode-helper-disable */
// Целый блок кода без проверок
/* vscode-helper-enable */
```

> **Совет:** Вы можете просто нажать `Ctrl+.` на проблемной строке и выбрать **«🛡️ Ignore rule on this line»**!

---

## ⚙️ Настройки (Settings)

В настройках VS Code (`settings.json`) доступны следующие параметры:

```json
{
  // Включение/отключение помощника
  "vscodeHelper.enable": true,

  // Анализ файла при сохранении
  "vscodeHelper.analyzeOnSave": true,

  // Анализ на лету при наборе текста (с плавной задержкой 300мс)
  "vscodeHelper.analyzeOnType": false,

  // Минимальный уровень серьезности для отображения: "error", "warning", "information", "hint"
  "vscodeHelper.severity": "hint",

  // Визуальное выделение рамочками в редакторе
  "vscodeHelper.showDecorations": true,

  // Отображение счетчика в строке состояния
  "vscodeHelper.showStatusBar": true,

  // Порог максимальной длины строки
  "vscodeHelper.maxLineLength": 120,

  // Список глобально отключенных правил
  "vscodeHelper.disabledRules": [
    "magic-number"
  ]
}
```

---

## ⌨️ Команды (Commands)

Откройте командную палитру (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `VSCode Helper: Analyze Current File` — запустить полный анализ текущего файла
- `VSCode Helper: Fix All Issues in File` — применить все автоматические исправления в файле
- `VSCode Helper: Show Suggestions List` — открыть быстрый список найденных замечаний с переходом к строке
- `VSCode Helper: Toggle Enable/Disable` — быстро включить или выключить помощник
- `VSCode Helper: Clear Diagnostics & Highlights` — очистить подсветку и замечания
- `VSCode Helper: Show File Analysis Summary` — показать подробную сводку (кол-во ошибок, предупреждений, подсказок)

---

## 🧪 Тестирование и разработка

```bash
# Установка зависимостей
npm install

# Компиляция TypeScript
npm run compile

# Проверка кода линтером ESLint
npm run lint

# Запуск тестов (19 юнит-тестов)
npm test

# Сборка пакета .vsix
npm run package
```

---

## 📄 Лицензия

MIT © 2026 [anom-developer](https://github.com/anom-developer)
