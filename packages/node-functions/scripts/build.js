import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Node functions should be at project root (not in .output)
const baseOutDir = `${__dirname}/../../../node-functions`;

// Clean and create output directories
if (existsSync(baseOutDir)) {
  rmSync(baseOutDir, { recursive: true });
}
mkdirSync(`${baseOutDir}/api`, { recursive: true });

// Common esbuild options
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: [
    'node:*',
    'fs',
    'path',
    'crypto',
    'http',
    'https',
    'stream',
    'url',
    'util',
    'events',
    'buffer',
    'querystring',
    'net',
    'tls',
    'zlib',
    'os',
  ],
  packages: 'bundle',
  minify: false,
  sourcemap: false,
};

console.log('Building Node Functions...');

// Build 1: Webhook handler at root level
// Route: /{sendKey}.send
await esbuild.build({
  ...commonOptions,
  entryPoints: [`${__dirname}/../src/webhook.ts`],
  outfile: `${baseOutDir}/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - Webhook Handler\n// Route: /{sendKey}.send\n',
  },
});
console.log(`✓ Webhook: ${baseOutDir}/[[default]].js`);

// Build 2: API routes
// Route: /api/*
await esbuild.build({
  ...commonOptions,
  entryPoints: [`${__dirname}/../src/app.ts`],
  outfile: `${baseOutDir}/api/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - API Routes\n// Route: /api/*\n',
  },
});
console.log(`✓ API: ${baseOutDir}/api/[[default]].js`);

console.log('\nBuild complete!');
