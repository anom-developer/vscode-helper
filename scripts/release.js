#!/usr/bin/env node
/**
 * npm run release -- [patch|minor|major]
 *
 * 1. Bumps version in package.json
 * 2. Prepends a new section to CHANGELOG.md
 * 3. git commit + git tag vX.Y.Z
 * 4. Prints push instructions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const CL_PATH = path.join(ROOT, 'CHANGELOG.md');

// ─── 1. Determine bump type ───────────────────────────────────────────────────
const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: npm run release -- [patch|minor|major]');
  process.exit(1);
}

// ─── 2. Bump package.json version ────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const [maj, min, pat] = pkg.version.split('.').map(Number);
let newVersion;
if (bump === 'major') newVersion = `${maj + 1}.0.0`;
else if (bump === 'minor') newVersion = `${maj}.${min + 1}.0`;
else newVersion = `${maj}.${min}.${pat + 1}`;

pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ package.json → ${newVersion}`);

// ─── 3. Prepend CHANGELOG entry ──────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const header = `## [${newVersion}] - ${today}\n\n### Added\n- \n\n### Fixed\n- \n\n### Changed\n- \n\n`;
const cl = fs.readFileSync(CL_PATH, 'utf8');
const insertAt = cl.indexOf('\n## [');
const newCl = insertAt === -1
  ? cl + '\n' + header
  : cl.slice(0, insertAt + 1) + header + cl.slice(insertAt + 1);
fs.writeFileSync(CL_PATH, newCl);
console.log(`✅ CHANGELOG.md — added section for ${newVersion}`);

// ─── 4. Git commit + tag ─────────────────────────────────────────────────────
try {
  execSync('git add package.json CHANGELOG.md', { cwd: ROOT, stdio: 'inherit' });
  execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git tag v${newVersion}`, { cwd: ROOT, stdio: 'inherit' });
  console.log(`✅ git tag v${newVersion} created`);
} catch (e) {
  console.error('Git error:', e.message);
  process.exit(1);
}

// ─── 5. Instructions ─────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Ready to deploy v${newVersion}!

  git push origin main --tags

GitHub Actions will automatically:
  → build & lint
  → package .vsix
  → create GitHub Release with download link
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
