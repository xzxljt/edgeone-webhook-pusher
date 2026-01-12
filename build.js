#!/usr/bin/env node
/**
 * Build script for EdgeOne Webhook Pusher
 * 
 * This script:
 * 1. Copies edge-functions to dist/edge-functions
 * 2. Copies node-functions to dist/node-functions
 * 3. Builds console (Nuxt) which outputs to dist/
 */

import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');

console.log('🚀 Building EdgeOne Webhook Pusher...\n');

// Clean dist directory
if (existsSync(DIST_DIR)) {
  console.log('🧹 Cleaning dist directory...');
  rmSync(DIST_DIR, { recursive: true });
}
mkdirSync(DIST_DIR, { recursive: true });

// Copy edge-functions
console.log('📦 Copying edge-functions...');
cpSync(
  join(__dirname, 'edge-functions'),
  join(DIST_DIR, 'edge-functions'),
  { recursive: true }
);
console.log('   ✓ edge-functions copied');

// Copy node-functions
console.log('📦 Copying node-functions...');
cpSync(
  join(__dirname, 'node-functions'),
  join(DIST_DIR, 'node-functions'),
  { recursive: true }
);
console.log('   ✓ node-functions copied');

// Build console (Nuxt)
console.log('🔨 Building console (Nuxt)...');
try {
  execSync('yarn generate', {
    cwd: join(__dirname, 'console'),
    stdio: 'inherit',
  });
  console.log('   ✓ console built');
} catch (error) {
  console.error('   ✗ console build failed');
  process.exit(1);
}

console.log('\n✅ Build complete!');
console.log(`   Output: ${DIST_DIR}`);
console.log('   - dist/edge-functions/');
console.log('   - dist/node-functions/');
console.log('   - dist/index.html');
console.log('   - dist/_nuxt/');
