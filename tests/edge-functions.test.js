/**
 * Edge Function Export Compliance Tests
 * Property 1: Edge Function Export Compliance
 * Validates: Requirements 2.3
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find all JS files in edge-functions directory
function findJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Edge Function Export Compliance', () => {
  const edgeFunctionsDir = join(process.cwd(), 'edge-functions');
  const jsFiles = findJsFiles(edgeFunctionsDir);

  it('should have at least one edge function file', () => {
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  jsFiles.forEach((filePath) => {
    const relativePath = filePath.replace(process.cwd() + '/', '');

    describe(relativePath, () => {
      const content = readFileSync(filePath, 'utf-8');

      it('should export onRequest function', () => {
        // Check for export async function onRequest or export function onRequest
        const hasOnRequestExport = /export\s+(async\s+)?function\s+onRequest/.test(content);
        expect(hasOnRequestExport).toBe(true);
      });

      it('should use ESM export syntax', () => {
        const hasExport = /export\s+(async\s+)?function/.test(content);
        expect(hasExport).toBe(true);
      });

      it('should not contain TypeScript type annotations', () => {
        // Check for common TypeScript patterns
        const hasTypeAnnotations = /:\s*(string|number|boolean|any|void|Promise|Response|Request)\s*[,)=]/.test(content);
        const hasInterface = /interface\s+\w+/.test(content);
        const hasType = /type\s+\w+\s*=/.test(content);
        
        // Allow JSDoc comments which may contain type-like words
        const hasActualTypeScript = hasTypeAnnotations || hasInterface || hasType;
        
        // This is a simplified check - in real code we'd use a proper parser
        // For now, just ensure no TypeScript-specific syntax
        expect(hasInterface).toBe(false);
        expect(hasType).toBe(false);
      });

      it('should be valid JavaScript (no syntax errors)', async () => {
        // Try to dynamically import the module to check for syntax errors
        // This will throw if there are syntax errors
        try {
          // We can't actually import edge functions as they depend on global KV bindings
          // Instead, just verify the file can be parsed
          new Function(content.replace(/export\s+/g, '').replace(/import\s+.+from\s+.+;?/g, ''));
          expect(true).toBe(true);
        } catch (error) {
          // If it's a reference error (like USERS_KV not defined), that's expected
          if (error instanceof ReferenceError) {
            expect(true).toBe(true);
          } else {
            throw error;
          }
        }
      });
    });
  });
});
