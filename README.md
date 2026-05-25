# 🛠 VSCode Helper

> AI-style code linting, intelligent suggestions, error detection and fix recommendations — built into VS Code as a lightweight extension.

![Build](https://github.com/AceAnomDev/vscode-helper/actions/workflows/release.yml/badge.svg)
![Version](https://img.shields.io/github/v/release/AceAnomDev/vscode-helper)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📥 Install (for users)

### One-liner (recommended)
```bash
# Download latest release and install
curl -s https://api.github.com/repos/YOUR_USERNAME/vscode-helper/releases/latest \
  | grep "browser_download_url.*vsix" \
  | cut -d '"' -f 4 \
  | xargs -I {} sh -c 'curl -L "{}" -o vscode-helper.vsix && code --install-extension vscode-helper.vsix'
```

### Manual
1. Go to [Releases](https://github.com/YOUR_USERNAME/vscode-helper/releases/latest)
2. Download `vscode-helper-X.Y.Z.vsix`
3. In VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX...**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Error Detection** | Spots bugs and anti-patterns on save |
| 💡 **Smart Suggestions** | Hover over flagged code to see why it's a problem |
| 🔧 **Auto-Fix** | One-click fixes (var→const, bare except, trailing whitespace…) |
| 🎨 **Visual Highlighting** | Color-coded underlines + scrollbar markers |
| 📝 **Snippets** | Best-practice code snippets for try/catch, async, dataclasses… |

---

## ⚙️ Settings

```json
{
  "vscodeHelper.enable": true,
  "vscodeHelper.analyzeOnSave": true,
  "vscodeHelper.analyzeOnType": false,
  "vscodeHelper.severity": "warning"
}
```

---

## 🔎 Rules

### JavaScript / TypeScript
| Rule | Severity |
|---|---|
| `no-var` — use `const`/`let` | ⚠️ Warning |
| `eqeqeq` — use `===` | ⚠️ Warning |
| `no-eval` | 🚫 Error |
| `no-console` | ℹ️ Info |
| `empty-catch` | ⚠️ Warning |
| `magic-number` | 💡 Hint |

### Python
| Rule | Severity |
|---|---|
| `py-bare-except` | ⚠️ Warning |
| `py-mutable-default` | ⚠️ Warning |
| `py-wildcard-import` | ⚠️ Warning |
| `py-print` | ℹ️ Info |

---

## 🚀 Development & Deployment

### First-time setup

```bash
git clone https://github.com/YOUR_USERNAME/vscode-helper
cd vscode-helper
npm install
```


---

## 🤝 Contributing

Adding a rule is two lines in `src/rules.ts`:

```typescript
{
  id: 'my-rule',
  pattern: /your-regex/,
  severity: vscode.DiagnosticSeverity.Warning,
  message: () => '⚠️ Explain the problem',
  fix: (_, line) => line.replace(...),   // optional
  suggestion: 'How to fix it'            // optional
}
```

---

## 📄 License

MIT © 2026
