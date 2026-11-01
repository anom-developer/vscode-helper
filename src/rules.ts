import type * as vscode from 'vscode';
import { getEffectiveLanguage, replaceCyrillicHomoglyphs } from './i18n';

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3
}

export interface CodeIssue {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  message: string;
  severity: DiagnosticSeverity | vscode.DiagnosticSeverity;
  code: string;
  fix?: string;
  suggestion?: string;
}

export interface LanguageRule {
  id: string;
  description: string;
  pattern: RegExp;
  severity: DiagnosticSeverity | vscode.DiagnosticSeverity;
  message: (match: RegExpExecArray | RegExpMatchArray) => string;
  fix?: (match: RegExpExecArray | RegExpMatchArray, line: string) => string;
  suggestion?: string;
  /** If true, this rule will not trigger inside comments or string literals */
  codeOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isEscaped(str: string, pos: number): boolean {
  let count = 0;
  for (let i = pos - 1; i >= 0 && str.charCodeAt(i) === 92; i--) {
    count++;
  }
  return count % 2 === 1;
}

/**
 * Checks if index is inside a string literal ('...', "...", `...`)
 */
export function isInsideStringLiteral(line: string, index: number): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === "'" && !inDoubleQuote && !inBacktick && !isEscaped(line, i)) {
      inSingleQuote = !inSingleQuote;
      if (i === index) return true;
    } else if (char === '"' && !inSingleQuote && !inBacktick && !isEscaped(line, i)) {
      inDoubleQuote = !inDoubleQuote;
      if (i === index) return true;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote && !isEscaped(line, i)) {
      inBacktick = !inBacktick;
      if (i === index) return true;
    }

    if (i === index) {
      return inSingleQuote || inDoubleQuote || inBacktick;
    }
  }

  return false;
}

const REGEX_PREFIX_CHARS = new Set([
  '=', '(', '{', '[', ',', ':', ';', '!', '&', '|', '?', '+', '-', '~', '^', '*', '>'
]);

/**
 * Checks if a character index in a line of code is inside a string, comment, or RegExp literal.
 */
export function isInsideStringOrComment(line: string, index: number): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inRegex = false;
  let inCharClass = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    // Check single-line comment start (only when outside quotes and regex)
    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inRegex) {
      if (char === '/' && line[i + 1] === '/') {
        return index >= i;
      }
      if (char === '#') {
        return index >= i;
      }
    }

    if (char === "'" && !inDoubleQuote && !inBacktick && !inRegex && !isEscaped(line, i)) {
      inSingleQuote = !inSingleQuote;
      if (i === index) return true;
    } else if (char === '"' && !inSingleQuote && !inBacktick && !inRegex && !isEscaped(line, i)) {
      inDoubleQuote = !inDoubleQuote;
      if (i === index) return true;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote && !inRegex && !isEscaped(line, i)) {
      inBacktick = !inBacktick;
      if (i === index) return true;
    } else if (char === '/' && !inSingleQuote && !inDoubleQuote && !inBacktick && !isEscaped(line, i)) {
      if (inRegex) {
        if (!inCharClass) {
          inRegex = false;
          if (i === index) return true;
        }
      } else {
        // Preceding non-whitespace char
        let prevIdx = i - 1;
        while (prevIdx >= 0 && /\s/.test(line[prevIdx])) {
          prevIdx--;
        }
        const prevChar = prevIdx >= 0 ? line[prevIdx] : '';
        if (prevIdx === -1 || REGEX_PREFIX_CHARS.has(prevChar)) {
          inRegex = true;
          inCharClass = false;
          if (i === index) return true;
        }
      }
    } else if (inRegex && !isEscaped(line, i)) {
      if (char === '[') inCharClass = true;
      else if (char === ']') inCharClass = false;
    }

    if (i === index) {
      return inSingleQuote || inDoubleQuote || inBacktick || inRegex;
    }
  }

  return false;
}

// ─── Non-magic numbers set ───────────────────────────────────────────────────
export const COMMON_NON_MAGIC = new Set([
  '0', '1', '2', '10', '16', '24', '32', '60', '64', '80', '100', '120', '128',
  '200', '201', '204', '250', '300', '365', '400', '401', '403', '404', '500',
  '512', '1000', '1024', '2048', '3000', '4096', '5000', '8000', '8080'
]);

// ─── Russian & Global Homoglyph Detection ─────────────────────────────────────
export const CYRILLIC_IN_CODE_RULE: LanguageRule = {
  id: 'cyrillic-in-code',
  description: 'Cyrillic homoglyph inside code identifier',
  pattern: /[a-zA-Z0-9_$]*[а-яА-ЯёЁ]+[a-zA-Z0-9_$]*/g,
  severity: DiagnosticSeverity.Error,
  message: (m) => {
    const chars = Array.from(new Set(Array.from(m[0]).filter((c) => /[а-яА-ЯёЁ]/.test(c)))).join(', ');
    return getEffectiveLanguage() === 'ru'
      ? `🚫 Обнаружены русские буквы (${chars}) в коде! Это приведёт к ошибке выполнения.`
      : `🚫 Cyrillic character(s) (${chars}) inside code identifier! This will break execution.`;
  },
  fix: (match, line) => {
    const fixedWord = replaceCyrillicHomoglyphs(match[0]);
    return line.replace(match[0], fixedWord);
  },
  suggestion:
    getEffectiveLanguage() === 'ru'
      ? 'Замените случайно набранные кириллические буквы на латинские аналоги.'
      : 'Replace accidental Cyrillic characters with Latin equivalents.',
  codeOnly: true
};

// ─── JavaScript / TypeScript rules ────────────────────────────────────────────
export const JS_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'no-var',
    description: 'Prefer let or const over var',
    pattern: /\bvar\s+([a-zA-Z_$][\w$]*)/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Избегайте `var` — используйте `let` или `const`.'
        : '⚠️ Avoid `var` — use `let` or `const` instead.',
    fix: (_match, line) => line.replace(/\bvar\b/, 'const'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Замените `var` на `const` (или `let`, если переменная перезаписывается).'
        : 'Replace `var` with `const` (or `let` if the value will be reassigned).',
    codeOnly: true
  },
  {
    id: 'no-debugger',
    description: 'Debugger statement left in code',
    pattern: /\bdebugger\s*;?/g,
    severity: DiagnosticSeverity.Error,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '🚫 Удалите инструкцию `debugger;` перед коммитом.'
        : '🚫 Remove `debugger;` statement before shipping.',
    fix: (_match, line) => line.replace(/\bdebugger\s*;?/, '').trimEnd(),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Удалите точки останова debugger перед фиксацией кода.'
        : 'Remove debugger breakpoint statements before committing code.',
    codeOnly: true
  },
  {
    id: 'no-console',
    description: 'console.* call in code',
    pattern: /console\.(log|warn|error|info|debug)\s*\(/g,
    severity: DiagnosticSeverity.Information,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `ℹ️ Обнаружен \`console.${m[1]}\` — удалите или замените на модуль логирования.`
        : `ℹ️ \`console.${m[1]}\` detected — remove or replace with a dedicated logger.`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте библиотеку логирования (winston, pino) или удалите отладочный вывод.'
        : 'Use a proper logging library (e.g. winston, pino) or remove debug logs.',
    codeOnly: true
  },
  {
    id: 'eqeqeq',
    description: 'Use strict equality (=== / !==)',
    pattern: /([^=!<>])(==|!=)(?!=)([^=])/g,
    severity: DiagnosticSeverity.Warning,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `⚠️ Используйте строгое равенство (\`${m[2]}==\`) вместо нестрогого (\`${m[2]}\`).`
        : `⚠️ Use strict equality (\`${m[2]}==\`) instead of loose comparison (\`${m[2]}\`).`,
    fix: (_match, line) =>
      line.replace(/([^=!<>])==(?!=)([^=])/g, '$1===$2').replace(/([^=!<>])!=(?!=)([^=])/g, '$1!==$2'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Строгое равенство предотвращает неожиданное приведение типов в JavaScript.'
        : 'Strict equality prevents subtle bugs caused by JavaScript type coercion.',
    codeOnly: true
  },
  {
    id: 'no-nan-compare',
    description: 'Comparing with NaN directly',
    pattern: /(?:===?|!==?)\s*NaN\b|\bNaN\s*(?:===?|!==?)/g,
    severity: DiagnosticSeverity.Error,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '🚫 Прямое сравнение с `NaN` всегда возвращает false. Используйте `Number.isNaN()`.'
        : '🚫 Direct comparison with `NaN` always yields false. Use `Number.isNaN()` instead.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Замените `x === NaN` на `Number.isNaN(x)`.'
        : 'Replace `x === NaN` with `Number.isNaN(x)`.',
    codeOnly: true
  },
  {
    id: 'no-alert',
    description: 'Browser UI modal (alert/confirm/prompt)',
    pattern: /\b(alert|confirm|prompt)\s*\([^)]*\)/g,
    severity: DiagnosticSeverity.Warning,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `⚠️ \`${m[1]}()\` блокирует UI-поток браузера — используйте модальные окна или уведомления.`
        : `⚠️ \`${m[1]}()\` blocks the browser UI thread — use modern dialogs or toast notifications.`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте стилизованные диалоги или toast-уведомления.'
        : 'Use custom modals or notification UI rather than native browser popups.',
    codeOnly: true
  },
  {
    id: 'no-unused-var-hint',
    description: 'Variable prefixed with underscore looks intentionally unused',
    pattern: /(?:const|let|var)\s+_([a-zA-Z0-9_$]+)\s*=/g,
    severity: DiagnosticSeverity.Hint,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `💡 Переменная \`_${m[1]}\` помечена как неиспользуемая — удалите её, если она не нужна.`
        : `💡 Variable \`_${m[1]}\` is marked as unused — document or remove if not needed.`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Если переменная действительно не используется, удалите её.'
        : 'If the variable is truly unused, consider removing it.',
    codeOnly: true
  },
  {
    id: 'empty-catch',
    description: 'Empty catch block silently swallowing errors',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Пустой блок catch молча скрывает ошибки.'
        : '⚠️ Empty catch block silently swallows errors.',
    fix: (_match, line) => line.replace(/catch\s*\(([^)]*)\)\s*\{\s*\}/, 'catch ($1) { console.error($1); }'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Залогируйте ошибку или пробросьте её дальше.'
        : 'Log the caught error or re-throw it to avoid hidden bugs.',
    codeOnly: true
  },
  {
    id: 'no-eval',
    description: 'Dangerous eval() usage',
    pattern: /\beval\s*\(/g,
    severity: DiagnosticSeverity.Error,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '🚫 `eval()` выполняет произвольный код и создаёт критическую уязвимость.'
        : '🚫 `eval()` executes arbitrary code and creates critical security vulnerabilities.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте JSON.parse() или реструктурируйте логику без eval().'
        : 'Use JSON.parse(), modern functions, or restructure logic instead of eval().',
    codeOnly: true
  },
  {
    id: 'magic-number',
    description: 'Unexplained magic number in code',
    pattern: /(?<![.'\w])(?<!\/\/.*)(?:[-+]?\d{3,}|(?<!\d)\d+\.\d+)(?!\w)(?!\s*[:,\]])(?!['"`])/g,
    severity: DiagnosticSeverity.Hint,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `💡 Магическое число \`${m[0]}\` — рекомендуется вынести его в именованную константу.`
        : `💡 Magic number \`${m[0]}\` — consider extracting it to a named constant.`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Именованные константы делают код понятным и облегчают рефакторинг.'
        : 'Named constants make code more readable and self-documenting.',
    codeOnly: true
  },
  {
    id: 'todo-comment',
    description: 'TODO or FIXME comment detected (supports RU/EN)',
    pattern: /\/\/\s*(TODO|FIXME|HACK|BUG|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ|БАГ|КОСТЫЛЬ|ВНИМАНИЕ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── Python rules ──────────────────────────────────────────────────────────────
export const PY_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'py-print',
    description: 'print() call in production code',
    pattern: /^\s*print\s*\(/g,
    severity: DiagnosticSeverity.Information,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? 'ℹ️ Обнаружен `print()` — в продакшене рекомендуется использовать модуль `logging`.'
        : 'ℹ️ `print()` detected — prefer the standard `logging` module in production.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Замените на `logging.info(...)` или `logging.debug(...)`.'
        : 'Replace with `logging.info(...)` or `logging.debug(...)`.',
    codeOnly: true
  },
  {
    id: 'py-bare-except',
    description: 'Bare except catches SystemExit and KeyboardInterrupt',
    pattern: /^\s*except\s*:/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Пустой `except:` перехватывает всё, включая `SystemExit` и `KeyboardInterrupt`.'
        : '⚠️ Bare `except:` catches everything including `SystemExit` and `KeyboardInterrupt`.',
    fix: (_match, line) => line.replace(/except\s*:/, 'except Exception:'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Перехватывайте конкретные исключения (`except ValueError:`) или `except Exception:`.'
        : 'Catch specific exceptions (e.g. `except ValueError:`) or at least `except Exception:`.',
    codeOnly: true
  },
  {
    id: 'py-mutable-default',
    description: 'Mutable default argument (shared across calls)',
    pattern: /def\s+\w+\([^)]*=\s*(?:\[\]|\{\})/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Изменяемое значение по умолчанию (список/словарь) является общим для всех вызовов функции!'
        : '⚠️ Mutable default argument (list/dict) is shared across all function calls!',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте `None` по умолчанию и создавайте список/словарь внутри функции.'
        : 'Use `None` as the default and initialize the list/dict inside the function body.',
    codeOnly: true
  },
  {
    id: 'py-none-compare',
    description: 'Comparison with None should use is/is not',
    pattern: /(==|!=)\s*None\b|\bNone\s*(==|!=)/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Используйте `is None` или `is not None` вместо `== None` / `!= None` (PEP 8).'
        : '⚠️ Use `is None` or `is not None` instead of `== None` / `!= None` (PEP 8).',
    fix: (_match, line) =>
      line
        .replace(/==\s*None\b/g, 'is None')
        .replace(/!=\s*None\b/g, 'is not None')
        .replace(/\bNone\s*==/g, 'None is')
        .replace(/\bNone\s*!=/g, 'None is not'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Сравнение с `None` всегда должно производиться через операторы идентичности `is` / `is not`.'
        : 'Comparing singletons like `None` should always be done with `is` or `is not`.',
    codeOnly: true
  },
  {
    id: 'py-boolean-compare',
    description: 'Comparison with True/False (PEP 8)',
    pattern: /(?:==|!=)\s*(True|False)\b/g,
    severity: DiagnosticSeverity.Warning,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `⚠️ Не сравнивайте напрямую с булевым литералом (\`== ${m[1]}\`) — используйте \`if condition:\` (PEP 8).`
        : `⚠️ Do not compare boolean values directly with \`== ${m[1]}\` (PEP 8).`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте `if condition:` или `if not condition:`.'
        : 'Use `if condition:` or `if not condition:` instead.',
    codeOnly: true
  },
  {
    id: 'py-wildcard-import',
    description: 'Wildcard import pollutes module namespace',
    pattern: /from\s+\S+\s+import\s+\*/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Звёздочный импорт `from ... import *` засоряет пространство имён модуля.'
        : '⚠️ Wildcard `from ... import *` pollutes the namespace and obscures dependencies.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Импортируйте конкретные сущности: `from module import ClassA, func_b`.'
        : 'Import specific names: `from module import ClassA, func_b`.',
    codeOnly: true
  },
  {
    id: 'py-todo',
    description: 'TODO or FIXME comment in Python (supports RU/EN)',
    pattern: /#\s*(TODO|FIXME|HACK|BUG|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ|БАГ|КОСТЫЛЬ|ВНИМАНИЕ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── Java rules ───────────────────────────────────────────────────────────────
export const JAVA_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'java-string-eq',
    description: 'String comparison using == instead of .equals()',
    pattern: /(?:".*?"\s*==\s*\w+|\w+\s*==\s*".*?")/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Сравнение строк через `==` сравнивает ссылки, а не значения. Используйте `.equals()`.'
        : '⚠️ String comparison with `==` compares references, not contents. Use `.equals()`.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте `str1.equals(str2)` или `Objects.equals(str1, str2)`.'
        : 'Use `str1.equals(str2)` or `Objects.equals(str1, str2)`.',
    codeOnly: true
  },
  {
    id: 'java-system-out',
    description: 'System.out.println in production code',
    pattern: /System\.(out|err)\.(println|print)\s*\(/g,
    severity: DiagnosticSeverity.Information,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? 'ℹ️ Обнаружен `System.out.println` — используйте структурированный логгер (SLF4J, Log4j2).'
        : 'ℹ️ `System.out.println` detected — use a structured logger (SLF4J, Log4j2).',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте библиотеку логирования вместо стандартного вывода.'
        : 'Use a proper logging framework instead of standard output in production.',
    codeOnly: true
  },
  {
    id: 'java-print-stack-trace',
    description: 'e.printStackTrace() called directly',
    pattern: /\.printStackTrace\s*\(\s*\)/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ `printStackTrace()` пишет напрямую в stderr. Используйте логгер.'
        : '⚠️ `printStackTrace()` prints directly to stderr. Use logger to log the exception.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Залогируйте исключение: `logger.error("Error occurred", e)`.'
        : 'Log the exception: `logger.error("Error occurred", e)`.',
    codeOnly: true
  },
  {
    id: 'java-empty-catch',
    description: 'Empty catch block in Java',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Пустой блок catch в Java скрывает исключения.'
        : '⚠️ Empty catch block silently swallows exceptions.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Залогируйте исключение или оберните его в RuntimeException.'
        : 'Log the exception or re-throw it wrapped in a runtime exception.',
    codeOnly: true
  },
  {
    id: 'java-todo',
    description: 'TODO or FIXME in Java',
    pattern: /\/\/\s*(TODO|FIXME|HACK|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── C / C++ rules ────────────────────────────────────────────────────────────
export const CPP_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'c-unsafe-gets',
    description: 'Dangerous gets() function',
    pattern: /\bgets\s*\(/g,
    severity: DiagnosticSeverity.Error,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '🚫 Функция `gets()` небезопасна, вызывает переполнение буфера и удалена из C11. Используйте `fgets()`.'
        : '🚫 `gets()` is unsafe, prone to buffer overflows, and removed from C11. Use `fgets()`.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Замените на `fgets(buffer, sizeof(buffer), stdin)`.'
        : 'Replace with `fgets(buffer, sizeof(buffer), stdin)`.',
    codeOnly: true
  },
  {
    id: 'c-unsafe-strcpy',
    description: 'Potentially unsafe string function',
    pattern: /\b(strcpy|strcat|sprintf)\s*\(/g,
    severity: DiagnosticSeverity.Warning,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `⚠️ \`${m[1]}()\` может вызвать переполнение буфера. Используйте \`strncpy\` или \`snprintf\`.`
        : `⚠️ \`${m[1]}()\` can cause buffer overflows. Consider safer alternatives (\`strncpy\`, \`snprintf\`).`,
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте ограниченные по размеру функции (`snprintf`, `strncpy`) или `std::string` в C++.'
        : 'Use bounded functions like `snprintf`, `strncpy`, or `std::string` in C++.',
    codeOnly: true
  },
  {
    id: 'cpp-null',
    description: 'NULL used in C++',
    pattern: /\bNULL\b/g,
    severity: DiagnosticSeverity.Hint,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '💡 В современном C++ рекомендуется использовать `nullptr` вместо `NULL`.'
        : '💡 Prefer `nullptr` over `NULL` in modern C++ (C++11 and newer).',
    fix: (_match, line) => line.replace(/\bNULL\b/g, 'nullptr'),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? '`nullptr` строго типизирован и предотвращает неоднозначности перегрузок.'
        : '`nullptr` is strongly typed and avoids overload ambiguities.',
    codeOnly: true
  },
  {
    id: 'c-goto',
    description: 'goto statement used',
    pattern: /\bgoto\s+[a-zA-Z_]\w*\s*;/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Оператор `goto` усложняет чтение потока выполнения. Используйте циклы или функции.'
        : '⚠️ `goto` statements make control flow harder to follow. Prefer loops or structured control flow.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Отрефакторите в структурированные циклы или отдельные вспомогательные функции.'
        : 'Refactor into structured loops or helper functions.',
    codeOnly: true
  },
  {
    id: 'cpp-todo',
    description: 'TODO or FIXME in C/C++',
    pattern: /\/\/\s*(TODO|FIXME|HACK|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── Go rules ─────────────────────────────────────────────────────────────────
export const GO_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'go-builtin-println',
    description: 'Builtin println used instead of fmt.Println',
    pattern: /\bprintln\s*\(/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Встроенный `println` предназначен для начальной загрузки среды. Используйте `fmt.Println`.'
        : '⚠️ Builtin `println` is intended for bootstrapping. Use `fmt.Println` or a logger.',
    fix: (_match, line) => line.replace(/\bprintln\s*\(/, 'fmt.Println('),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте `fmt.Println` или пакет `log/slog`.'
        : 'Use `fmt.Println` or `slog.Info`.',
    codeOnly: true
  },
  {
    id: 'go-panic',
    description: 'panic() used in normal application code',
    pattern: /\bpanic\s*\(/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ Избегайте вызова `panic()` для обычной обработки ошибок в Go. Возвращайте `error`.'
        : '⚠️ Avoid `panic()` for regular error handling in Go. Return errors instead.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Возвращайте ошибки явным образом в соответствии с идиомами Go.'
        : 'Return errors explicitly according to standard Go conventions.',
    codeOnly: true
  },
  {
    id: 'go-todo',
    description: 'TODO comment in Go',
    pattern: /\/\/\s*(TODO|FIXME|HACK|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── Rust rules ───────────────────────────────────────────────────────────────
export const RUST_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'rust-unwrap',
    description: 'unwrap() can cause panics',
    pattern: /\.unwrap\s*\(\s*\)/g,
    severity: DiagnosticSeverity.Warning,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '⚠️ `.unwrap()` приведёт к панике (panic), если значение равно None/Err. Используйте `?` или `.expect(...)`.'
        : '⚠️ `.unwrap()` will panic if the value is None/Err. Use `?`, `match`, or `.expect("...")`.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Используйте оператор `?` или метод `.expect("Причина ожидания значения")`.'
        : 'Use the `?` operator or `.expect("Reason for invariant")` to provide context.',
    codeOnly: true
  },
  {
    id: 'rust-println',
    description: 'println! in library/production code',
    pattern: /\bprintln!\s*\(/g,
    severity: DiagnosticSeverity.Information,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? 'ℹ️ `println!` выводит в stdout. Используйте крейт `log` или `tracing` для логирования.'
        : 'ℹ️ `println!` writes to stdout. Use the `log` or `tracing` crate for production diagnostics.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Замените на `log::info!` или `tracing::info!`.'
        : 'Replace with `log::info!` or `tracing::info!`.',
    codeOnly: true
  },
  {
    id: 'rust-unsafe',
    description: 'unsafe block marker',
    pattern: /\bunsafe\s*\{/g,
    severity: DiagnosticSeverity.Hint,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '💡 Блок `unsafe` — убедитесь, что инварианты безопасности задокументированы комментарием `// SAFETY:`.'
        : '💡 `unsafe` block detected — ensure all safety invariants are thoroughly documented.',
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Добавьте комментарий `// SAFETY:` с обоснованием корректности блока.'
        : 'Add a `// SAFETY:` comment explaining why this block is safe.',
    codeOnly: true
  },
  {
    id: 'rust-todo',
    description: 'TODO comment in Rust',
    pattern: /\/\/\s*(TODO|FIXME|HACK|НАДО|СДЕЛАТЬ|ИСПРАВИТЬ)[:：]?\s*(.+)/gi,
    severity: DiagnosticSeverity.Information,
    message: (m) => `📝 ${m[1].toUpperCase()}: ${m[2].trim()}`
  }
];

// ─── Generic rules (all languages) ────────────────────────────────────────────
export const GENERIC_RULES: LanguageRule[] = [
  CYRILLIC_IN_CODE_RULE,
  {
    id: 'trailing-whitespace',
    description: 'Line has trailing whitespace',
    pattern: /[ \t]+$/g,
    severity: DiagnosticSeverity.Hint,
    message: () =>
      getEffectiveLanguage() === 'ru'
        ? '💡 Лишние пробелы в конце строки — очистите их.'
        : '💡 Trailing whitespace — clean it up.',
    fix: (_match, line) => line.trimEnd(),
    suggestion:
      getEffectiveLanguage() === 'ru'
        ? 'Удалите невидимые пробелы и табуляции в конце строки.'
        : 'Trim trailing spaces and tabs.'
  },
  {
    id: 'long-line',
    description: 'Line exceeds standard maximum length (120 chars)',
    pattern: /.{121,}/g,
    severity: DiagnosticSeverity.Hint,
    message: (m) =>
      getEffectiveLanguage() === 'ru'
        ? `💡 Длина строки ${m[0].length} символов — рекомендуется разбить (макс. 120).`
        : `💡 Line is ${m[0].length} characters — consider breaking it up (max 120).`
  }
];

// ─── Public API ────────────────────────────────────────────────────────────────
export function getRulesForLanguage(languageId: string): LanguageRule[] {
  const base = [...GENERIC_RULES];
  switch (languageId) {
    case 'javascript':
    case 'typescript':
    case 'javascriptreact':
    case 'typescriptreact':
      return [...JS_RULES, ...base];
    case 'python':
      return [...PY_RULES, ...base];
    case 'java':
      return [...JAVA_RULES, ...base];
    case 'c':
    case 'cpp':
      return [...CPP_RULES, ...base];
    case 'go':
      return [...GO_RULES, ...base];
    case 'rust':
      return [...RUST_RULES, ...base];
    default:
      return base;
  }
}

export interface AnalyzeOptions {
  minSeverity?: DiagnosticSeverity | number;
  disabledRules?: string[];
  maxLineLength?: number;
}

export function analyzeDocument(
  document: vscode.TextDocument | { lineCount: number; lineAt: (i: number) => { text: string }; languageId: string },
  options: AnalyzeOptions = {}
): CodeIssue[] {
  const rules = getRulesForLanguage(document.languageId);
  const issues: CodeIssue[] = [];
  const disabledRuleSet = new Set(options.disabledRules ?? []);
  const maxLineLength = options.maxLineLength ?? 120;

  let blockDisabled = false;

  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text;

    // Check block comments /* vscode-helper-disable */
    if (/\/\*\s*vscode-helper-disable\s*\*\//.test(lineText)) {
      blockDisabled = true;
      continue;
    }
    if (/\/\*\s*vscode-helper-enable\s*\*\//.test(lineText)) {
      blockDisabled = false;
      continue;
    }
    if (blockDisabled) {
      continue;
    }

    // Check line suppression: // vscode-helper-disable-line [ruleId]
    const disableLineMatch = lineText.match(/(?:\/\/|#)\s*vscode-helper-disable-line(?:\s+([\w-]+))?/);
    const lineSuppressedRule = disableLineMatch ? disableLineMatch[1] ?? '*' : undefined;

    // Check next-line suppression from previous line
    let prevLineSuppressedRule: string | undefined;
    if (i > 0) {
      const prevLineText = document.lineAt(i - 1).text;
      const prevMatch = prevLineText.match(/(?:\/\/|#)\s*vscode-helper-disable-next-line(?:\s+([\w-]+))?/);
      if (prevMatch) {
        prevLineSuppressedRule = prevMatch[1] ?? '*';
      }
    }

    // Check long-line with custom maxLineLength
    if (ruleIsEnabled('long-line', lineSuppressedRule, prevLineSuppressedRule, disabledRuleSet)) {
      if (lineText.length > maxLineLength) {
        const trimmed = lineText.trim();
        // Don't flag long lines for comments, imports, exports, or dictionary string definitions
        const isCommentOrImport = trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('import ') || trimmed.startsWith('export ');
        const isStringEntry = /^(?:['"`].*['"`],?|(?:\w+|['"`].*['"`])\s*:\s*['"`].*['"`],?)$/.test(trimmed);

        if (!isCommentOrImport && !isStringEntry) {
          if (!options.minSeverity || DiagnosticSeverity.Hint <= options.minSeverity) {
            const isRu = getEffectiveLanguage() === 'ru';
            issues.push({
              line: i,
              col: maxLineLength,
              endLine: i,
              endCol: lineText.length,
              message: isRu
                ? `💡 Длина строки ${lineText.length} символов — рекомендуется перенести (макс. ${maxLineLength}).`
                : `💡 Line is ${lineText.length} characters — consider breaking it up (max ${maxLineLength}).`,
              severity: DiagnosticSeverity.Hint,
              code: 'long-line',
              suggestion: isRu
                ? `Перенесите строку после ${maxLineLength} символов.`
                : `Break line after ${maxLineLength} characters.`
            });
          }
        }
      }
    }

    for (const rule of rules) {
      if (rule.id === 'long-line') continue; // Handled above with configurable length

      if (!ruleIsEnabled(rule.id, lineSuppressedRule, prevLineSuppressedRule, disabledRuleSet)) {
        continue;
      }

      if (options.minSeverity !== undefined && rule.severity > options.minSeverity) {
        // VS Code DiagnosticSeverity: Error=0, Warning=1, Information=2, Hint=3
        continue;
      }

      // Reset regex index for global regexes
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(lineText)) !== null) {
        let col = match.index;
        const length = match[0].length;
        let endCol = col + (length > 0 ? length : 1);

        if (rule.id === 'eqeqeq' && match[1] && match[2]) {
          col += match[1].length;
          endCol = col + match[2].length;
        }

        // If this rule should only check actual code, verify it's not inside string/comment/regex
        if (rule.codeOnly && isInsideStringOrComment(lineText, col)) {
          if (!regex.global) break;
          continue;
        }

        // Special handling for magic-number: ignore common constants (0, 1, 2, 10, 100, 300, 120, etc.)
        if (rule.id === 'magic-number' && COMMON_NON_MAGIC.has(match[0])) {
          if (!regex.global) break;
          continue;
        }

        // Special handling for todo-comment and py-todo: ignore if inside a string literal
        if ((rule.id === 'todo-comment' || rule.id === 'py-todo') && isInsideStringLiteral(lineText, col)) {
          if (!regex.global) break;
          continue;
        }

        issues.push({
          line: i,
          col,
          endLine: i,
          endCol,
          message: rule.message(match),
          severity: rule.severity,
          code: rule.id,
          fix: rule.fix ? rule.fix(match, lineText) : undefined,
          suggestion: rule.suggestion
        });

        // Break non-global regex or advance if empty match to avoid infinite loop
        if (!regex.global) {
          break;
        } else if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }
  }

  return issues;
}

function ruleIsEnabled(
  ruleId: string,
  lineSuppressed: string | undefined,
  prevLineSuppressed: string | undefined,
  disabledRuleSet: Set<string>
): boolean {
  if (disabledRuleSet.has(ruleId)) return false;
  if (lineSuppressed === '*' || lineSuppressed === ruleId) return false;
  if (prevLineSuppressed === '*' || prevLineSuppressed === ruleId) return false;
  return true;
}
