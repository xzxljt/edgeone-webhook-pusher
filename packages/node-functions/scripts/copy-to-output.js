import { cpSync, mkdirSync, existsSync, renameSync, rmSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = `${__dirname}/../dist`;
const destDir = `${__dirname}/../../../.output/public/node-functions`;

// Ensure output directory exists
if (!existsSync(dirname(destDir))) {
  mkdirSync(dirname(destDir), { recursive: true });
}

// Clean destination
if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true });
}
mkdirSync(destDir, { recursive: true });

// Copy all dist files to output
cpSync(srcDir, destDir, { recursive: true });

// Rename app.js to [[default]].js for EdgeOne Node Functions
// EdgeOne requires Koa/Express apps to use [[default]].js filename
const appJsPath = join(destDir, 'app.js');
const defaultJsPath = join(destDir, '[[default]].js');

if (existsSync(appJsPath)) {
  renameSync(appJsPath, defaultJsPath);
  console.log('Renamed app.js to [[default]].js');
}

// Also rename .d.ts and .map files if they exist
const appDtsPath = join(destDir, 'app.d.ts');
const appMapPath = join(destDir, 'app.js.map');
const appDtsMapPath = join(destDir, 'app.d.ts.map');

if (existsSync(appDtsPath)) {
  rmSync(appDtsPath);
}
if (existsSync(appMapPath)) {
  rmSync(appMapPath);
}
if (existsSync(appDtsMapPath)) {
  rmSync(appDtsMapPath);
}

console.log('Copied node-functions to .output/public/node-functions');
console.log('Entry point: node-functions/[[default]].js');
