/**
 * Project Structure Tests
 * Validates: Requirements 1.1-1.6, 2.5, 3.4, 4.1, 5.1-5.5, 6.1-6.4
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();

describe('Project Structure', () => {
  describe('Root Level Directories', () => {
    it('should have edge-functions at root level', () => {
      expect(existsSync(join(rootDir, 'edge-functions'))).toBe(true);
    });

    it('should have node-functions at root level', () => {
      expect(existsSync(join(rootDir, 'node-functions'))).toBe(true);
    });

    it('should have console at root level', () => {
      expect(existsSync(join(rootDir, 'console'))).toBe(true);
    });

    it('should NOT have packages directory', () => {
      expect(existsSync(join(rootDir, 'packages'))).toBe(false);
    });
  });

  describe('Edge Functions Structure', () => {
    const edgeFunctionsDir = join(rootDir, 'edge-functions');

    it('should have api/kv/users.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'users.js'))).toBe(true);
    });

    it('should have api/kv/channels.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'channels.js'))).toBe(true);
    });

    it('should have api/kv/messages.js', () => {
      expect(existsSync(join(edgeFunctionsDir, 'api', 'kv', 'messages.js'))).toBe(true);
    });
  });

  describe('Node Functions Structure', () => {
    const nodeFunctionsDir = join(rootDir, 'node-functions');

    it('should have api/[[default]].js', () => {
      expect(existsSync(join(nodeFunctionsDir, 'api', '[[default]].js'))).toBe(true);
    });

    it('should have send/[[default]].js', () => {
      expect(existsSync(join(nodeFunctionsDir, 'send', '[[default]].js'))).toBe(true);
    });

    it('should have shared directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'shared'))).toBe(true);
    });

    it('should have services directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'services'))).toBe(true);
    });

    it('should have middleware directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'middleware'))).toBe(true);
    });

    it('should have routes directory', () => {
      expect(existsSync(join(nodeFunctionsDir, 'routes'))).toBe(true);
    });
  });

  describe('Console Structure', () => {
    const consoleDir = join(rootDir, 'console');

    it('should have package.json', () => {
      expect(existsSync(join(consoleDir, 'package.json'))).toBe(true);
    });

    it('should have nuxt.config.ts', () => {
      expect(existsSync(join(consoleDir, 'nuxt.config.ts'))).toBe(true);
    });

    it('should have app directory', () => {
      expect(existsSync(join(consoleDir, 'app'))).toBe(true);
    });

    it('should have app/pages directory', () => {
      expect(existsSync(join(consoleDir, 'app', 'pages'))).toBe(true);
    });
  });

  describe('Configuration Files', () => {
    it('should have edgeone.json', () => {
      expect(existsSync(join(rootDir, 'edgeone.json'))).toBe(true);
    });

    it('should have package.json', () => {
      expect(existsSync(join(rootDir, 'package.json'))).toBe(true);
    });

    it('should have build.js', () => {
      expect(existsSync(join(rootDir, 'build.js'))).toBe(true);
    });

    it('should NOT have turbo.json', () => {
      expect(existsSync(join(rootDir, 'turbo.json'))).toBe(false);
    });

    it('should NOT have pnpm-workspace.yaml', () => {
      expect(existsSync(join(rootDir, 'pnpm-workspace.yaml'))).toBe(false);
    });
  });

  describe('edgeone.json Configuration', () => {
    const config = JSON.parse(readFileSync(join(rootDir, 'edgeone.json'), 'utf-8'));

    it('should have outputDirectory set to dist', () => {
      expect(config.outputDirectory).toBe('dist');
    });

    it('should have buildCommand', () => {
      expect(config.buildCommand).toBeDefined();
    });

    it('should have installCommand', () => {
      expect(config.installCommand).toBeDefined();
    });
  });

  describe('package.json Configuration', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

    it('should NOT use workspace protocol', () => {
      const deps = JSON.stringify(pkg.dependencies || {});
      const devDeps = JSON.stringify(pkg.devDependencies || {});
      expect(deps).not.toContain('workspace:');
      expect(devDeps).not.toContain('workspace:');
    });

    it('should have build script', () => {
      expect(pkg.scripts.build).toBeDefined();
    });

    it('should have test script', () => {
      expect(pkg.scripts.test).toBeDefined();
    });

    it('should have koa dependencies', () => {
      expect(pkg.dependencies.koa).toBeDefined();
      expect(pkg.dependencies['@koa/router']).toBeDefined();
    });
  });
});
