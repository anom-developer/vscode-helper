import * as vscode from 'vscode';

interface Snippet {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  languages?: string[];
}

const SNIPPETS: Snippet[] = [
  // JavaScript / TypeScript
  {
    label: 'try-catch',
    detail: 'Try/catch block with logging',
    documentation: 'Creates a try/catch block that logs errors properly instead of swallowing them.',
    insertText: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(\'Error:\', error);\n\tthrow error;\n}',
    languages: ['javascript', 'typescript']
  },
  {
    label: 'async-fn',
    detail: 'Async arrow function',
    documentation: 'Creates a properly typed async arrow function.',
    insertText: 'const ${1:name} = async (${2:params}): Promise<${3:void}> => {\n\t$4\n};',
    languages: ['typescript']
  },
  {
    label: 'const-fn',
    detail: 'Arrow function with const',
    documentation: 'Modern JavaScript arrow function using const.',
    insertText: 'const ${1:name} = (${2:params}) => {\n\t$3\n};',
    languages: ['javascript', 'typescript']
  },
  {
    label: 'log-info',
    detail: 'Structured log entry',
    documentation: 'Console log with timestamp and structured data.',
    insertText: 'console.info(`[${new Date().toISOString()}] ${1:message}`, { $2 });',
    languages: ['javascript', 'typescript']
  },

  // Python
  {
    label: 'def-safe',
    detail: 'Function with type hints',
    documentation: 'Python function with type hints and docstring.',
    insertText: 'def ${1:name}(${2:param}: ${3:type}) -> ${4:return_type}:\n\t"""${5:Description.}"""\n\t$6',
    languages: ['python']
  },
  {
    label: 'try-except',
    detail: 'Try/except with logging',
    documentation: 'Python try/except that logs and re-raises the exception.',
    insertText: 'try:\n\t$1\nexcept ${2:Exception} as e:\n\tlogging.exception("Error: %s", e)\n\traise',
    languages: ['python']
  },
  {
    label: 'dataclass',
    detail: 'Python dataclass',
    documentation: 'Modern Python dataclass with type annotations.',
    insertText: '@dataclass\nclass ${1:Name}:\n\t${2:field}: ${3:type}\n',
    languages: ['python']
  },

  // Generic
  {
    label: 'todo',
    detail: 'TODO comment',
    documentation: 'Structured TODO with assignee and description.',
    insertText: '// TODO(${1:author}): ${2:description}',
  },
  {
    label: 'fixme',
    detail: 'FIXME comment',
    documentation: 'Marks code that needs fixing.',
    insertText: '// FIXME: ${1:description}',
  }
];

export class HelperCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const lang = document.languageId;
    const linePrefix = document.lineAt(position).text.substring(0, position.character);

    const items: vscode.CompletionItem[] = [];

    for (const snippet of SNIPPETS) {
      // Skip if language doesn't match
      if (snippet.languages && !snippet.languages.includes(lang)) continue;

      const item = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
      item.detail = snippet.detail;
      item.documentation = new vscode.MarkdownString(`🛠 **VSCode Helper**\n\n${snippet.documentation}`);
      item.insertText = new vscode.SnippetString(snippet.insertText);
      item.sortText = `0_${snippet.label}`; // float to top
      item.filterText = snippet.label;
      items.push(item);
    }

    // Dynamic: suggest const over var if user starts typing "var"
    if (linePrefix.trim().endsWith('var')) {
      const constSuggest = new vscode.CompletionItem('const (recommended)', vscode.CompletionItemKind.Keyword);
      constSuggest.insertText = 'const ';
      constSuggest.detail = 'Prefer const over var';
      constSuggest.documentation = new vscode.MarkdownString('`const` is block-scoped and prevents accidental reassignment.');
      constSuggest.preselect = true;
      items.push(constSuggest);
    }

    return items;
  }
}
