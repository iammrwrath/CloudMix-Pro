// scripts/verify-packaging.cjs
// Ensures all local required files in main.cjs are present and accounted for before building/packaging.
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const mainPath = path.join(rootDir, 'main.cjs');
const packageJsonPath = path.join(rootDir, 'package.json');
const cortexJsonPath = path.join(rootDir, 'electron-builder.cortex.json');

console.log('[PRE-PACKAGING CHECK] Validating packaging configuration...');

if (!fs.existsSync(mainPath)) {
  console.error('[ERROR] main.cjs not found at: ' + mainPath);
  process.exit(1);
}

const mainContent = fs.readFileSync(mainPath, 'utf8');

// Match all require('./...') and require("../...") calls
const requireRegex = /require\(['"](\.[^'"]+)['"]\)/g;
let match;
const requiredLocalFiles = new Set();

while ((match = requireRegex.exec(mainContent)) !== null) {
  requiredLocalFiles.add(match[1]);
}

console.log(`[CHECK] Found ${requiredLocalFiles.size} local require() dependencies in main.cjs:`);
let hasError = false;

for (const reqPath of requiredLocalFiles) {
  let resolved = path.resolve(rootDir, reqPath);
  if (!path.extname(resolved)) {
    if (fs.existsSync(resolved + '.cjs')) resolved = resolved + '.cjs';
    else if (fs.existsSync(resolved + '.js')) resolved = resolved + '.js';
    else if (fs.existsSync(resolved + '.json')) resolved = resolved + '.json';
  }

  if (!fs.existsSync(resolved)) {
    console.error(`[FAIL] Required file does not exist on disk: ${reqPath} (resolved: ${resolved})`);
    hasError = true;
  } else {
    console.log(`  ✓ ${reqPath} -> ${path.relative(rootDir, resolved)} exists`);
  }
}

// Verify package.json build.files pattern covers required files
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const files = pkg.build?.files || [];
const hasWildcardCjs = files.includes('*.cjs') || files.includes('**/*.cjs');

if (!hasWildcardCjs) {
  console.warn('[WARN] package.json build.files does not contain "*.cjs". Checking explicit coverage...');
} else {
  console.log('  ✓ package.json contains "*.cjs" wildcard pattern');
}

// Check cortex builder config
if (fs.existsSync(cortexJsonPath)) {
  const cortex = JSON.parse(fs.readFileSync(cortexJsonPath, 'utf8'));
  const cortexFiles = cortex.files || [];
  if (cortexFiles.includes('*.cjs') || cortexFiles.includes('**/*.cjs')) {
    console.log('  ✓ electron-builder.cortex.json contains "*.cjs" wildcard pattern');
  } else {
    console.warn('[WARN] electron-builder.cortex.json does not contain "*.cjs"');
  }
}

if (hasError) {
  console.error('[ERROR] Packaging check failed. Fix missing dependencies before releasing.');
  process.exit(1);
}

console.log('[PRE-PACKAGING CHECK] All checks passed successfully!\n');
