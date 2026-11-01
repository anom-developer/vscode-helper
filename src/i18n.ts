import type * as vscode from 'vscode';

export type Language = 'ru' | 'en';

function getVSCode(): typeof vscode | undefined {
  try {
    return require('vscode');
  } catch {
    return undefined;
  }
}

export function getEffectiveLanguage(): Language {
  const vsc = getVSCode();
  if (vsc?.workspace) {
    try {
      const config = vsc.workspace.getConfiguration('vscodeHelper');
      const langConfig = config.get<string>('language', 'auto');
      if (langConfig === 'ru') return 'ru';
      if (langConfig === 'en') return 'en';
    } catch {
      // ignore
    }
  }

  // Auto-detect from VS Code environment
  if (vsc?.env && typeof vsc.env.language === 'string') {
    if (vsc.env.language.toLowerCase().startsWith('ru')) {
      return 'ru';
    }
  }

  return 'ru'; // Default to Russian as requested by user
}

export const CYRILLIC_HOMOGLYPHS: Record<string, string> = {
  // Lowercase
  'а': 'a',
  'с': 'c',
  'е': 'e',
  'о': 'o',
  'р': 'p',
  'х': 'x',
  'у': 'y',
  'і': 'i',
  'ј': 'j',
  // Uppercase
  'А': 'A',
  'В': 'B',
  'С': 'C',
  'Е': 'E',
  'Н': 'H',
  'К': 'K',
  'М': 'M',
  'О': 'O',
  'Р': 'P',
  'Т': 'T',
  'Х': 'X',
  'У': 'Y'
};

export function replaceCyrillicHomoglyphs(text: string): string {
  let result = '';
  for (const char of text) {
    result += CYRILLIC_HOMOGLYPHS[char] ?? char;
  }
  return result;
}

export const I18N_STRINGS = {
  ru: {
    statusOk: '$(check) Helper: В норме',
    statusOff: '$(circle-slash) Helper: Выкл',
    statusTooltipOk: 'VSCode Helper: Проблем не обнаружено!',
    statusTooltipOff: 'VSCode Helper отключен (нажмите для включения)',
    statusTooltipIssues: (total: number, fixable: number) =>
      `VSCode Helper: ${total} замечаний (${fixable} можно исправить). Нажмите для просмотра.`,
    statusBarIssues: (total: number, fixable: number) =>
      `$(warning) Helper: ${total} (${fixable} испр.)`,
    statusBarErrors: (errors: number, warnings: number) =>
      `$(error) Helper: ${errors}О ${warnings}П`,

    analysisComplete: (total: number, fixable: number) =>
      `VSCode Helper: Анализ завершён — найдено ${total} замечаний (${fixable} можно исправить автоматически).`,
    noActiveEditor: 'VSCode Helper: Нет активного файла для анализа.',
    noIssues: '✅ VSCode Helper: Замечаний не обнаружено! Чистый код.',
    noFixableIssues: 'VSCode Helper: Нет проблем, доступных для авто-исправления.',
    fixedCount: (count: number) => `VSCode Helper: Автоматически исправлено строк: ${count}!`,
    openFilePrompt: 'VSCode Helper: Откройте файл для просмотра подсказок.',
    toggled: (enabled: boolean) => `VSCode Helper теперь ${enabled ? 'включен' : 'выключен'}.`,
    cleared: 'VSCode Helper: Диагностика и подсветка очищены.',
    summaryTitle: (fileName: string) => `📊 Сводка VSCode Helper для ${fileName}:`,
    summaryErrors: '• 🚫 Ошибки:',
    summaryWarnings: '• ⚠️ Предупреждения:',
    summaryInfos: '• ℹ️ Инфо:',
    summaryHints: '• 💡 Подсказки:',
    summaryFixable: '• 🔧 Авто-исправляемые:',
    quickPickPlaceholder: (total: number) =>
      `Обнаружено замечаний: ${total} — выберите для перехода к строке`,
    autoFixAvailable: 'Доступно авто-исправление',
    linePrefix: 'Строка',

    actionFix: (code: string) => `🔧 Исправить: ${code}`,
    actionIgnoreLine: (code: string) => `🛡️ Игнорировать '${code}' на этой строке`,
    actionExplain: (code: string) => `💡 Объяснить правило: ${code}`,
    actionFixAll: (count: number) => `🔧 Исправить все ${count} замечаний в файле`,

    recommendation: 'Рекомендация:'
  },
  en: {
    statusOk: '$(check) Helper: OK',
    statusOff: '$(circle-slash) Helper: Off',
    statusTooltipOk: 'VSCode Helper: No issues detected!',
    statusTooltipOff: 'VSCode Helper is disabled (click to toggle)',
    statusTooltipIssues: (total: number, fixable: number) =>
      `VSCode Helper: ${total} issue(s) detected (${fixable} auto-fixable). Click to view.`,
    statusBarIssues: (total: number, fixable: number) =>
      `$(warning) Helper: ${total} (${fixable} fixable)`,
    statusBarErrors: (errors: number, warnings: number) =>
      `$(error) Helper: ${errors}E ${warnings}W`,

    analysisComplete: (total: number, fixable: number) =>
      `VSCode Helper: Analysis complete — ${total} issue(s) found (${fixable} auto-fixable).`,
    noActiveEditor: 'VSCode Helper: No active editor to analyze.',
    noIssues: '✅ VSCode Helper: No issues found! Clean code.',
    noFixableIssues: 'VSCode Helper: No auto-fixable issues found.',
    fixedCount: (count: number) => `VSCode Helper: Fixed ${count} line(s) automatically!`,
    openFilePrompt: 'VSCode Helper: Open a file to view suggestions.',
    toggled: (enabled: boolean) => `VSCode Helper is now ${enabled ? 'enabled' : 'disabled'}.`,
    cleared: 'VSCode Helper: Diagnostics and decorations cleared.',
    summaryTitle: (fileName: string) => `📊 VSCode Helper Summary for ${fileName}:`,
    summaryErrors: '• 🚫 Errors:',
    summaryWarnings: '• ⚠️ Warnings:',
    summaryInfos: '• ℹ️ Info:',
    summaryHints: '• 💡 Hints:',
    summaryFixable: '• 🔧 Auto-fixable:',
    quickPickPlaceholder: (total: number) =>
      `${total} issue(s) detected — select to navigate`,
    autoFixAvailable: 'Auto-fix available',
    linePrefix: 'Line',

    actionFix: (code: string) => `🔧 Fix: ${code}`,
    actionIgnoreLine: (code: string) => `🛡️ Ignore '${code}' on this line`,
    actionExplain: (code: string) => `💡 Explain: ${code}`,
    actionFixAll: (count: number) => `🔧 Fix all ${count} auto-fixable issue(s) in file`,

    recommendation: 'Recommendation:'
  }
};

export function getMsg() {
  const lang = getEffectiveLanguage();
  return I18N_STRINGS[lang];
}
