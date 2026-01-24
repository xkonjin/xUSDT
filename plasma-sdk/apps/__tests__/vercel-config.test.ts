import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const APPS = ['plasma-venmo', 'plasma-predictions', 'bill-split'];
// __dirname is .../apps/__tests__, so we need to go up to apps
const APPS_DIR = join(__dirname, '..');

interface VercelConfig {
  $schema?: string;
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  devCommand?: string;
  env?: Record<string, string>;
}

interface VercelConfigTest {
  app: string;
  config: VercelConfig;
  expected: {
    framework: string;
    buildCommand: string;
    outputDirectory: string;
    installCommand: string;
    devCommand: string;
    envKeys: string[];
  };
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

describe('Vercel Configuration Tests', () => {
  describe('vercel.json files exist for all apps', () => {
    test.each(APPS)('%s has vercel.json', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('vercel.json has correct schema reference', () => {
    test.each(APPS)('%s has $schema', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config).not.toBeNull();
      expect(config?.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    });
  });

  describe('vercel.json has correct framework', () => {
    test.each(APPS)('%s has framework set to nextjs', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.framework).toBe('nextjs');
    });
  });

  describe('vercel.json has correct build command', () => {
    test.each(APPS)('%s has buildCommand set to npm run build', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.buildCommand).toBe('npm run build');
    });
  });

  describe('vercel.json has correct output directory', () => {
    test.each(APPS)('%s has outputDirectory set to .next', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.outputDirectory).toBe('.next');
    });
  });

  describe('vercel.json has correct install command', () => {
    test.each(APPS)('%s has installCommand set to npm install', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.installCommand).toBe('npm install');
    });
  });

  describe('vercel.json has correct dev command', () => {
    test.each(APPS)('%s has devCommand set to npm run dev', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.devCommand).toBe('npm run dev');
    });
  });

  describe('vercel.json has required environment variables', () => {
    const expectedEnvKeys = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_PLASMA_CHAIN_ID'];

    test.each(APPS)('%s has required env vars', (app) => {
      const configPath = join(APPS_DIR, app, 'vercel.json');
      const config = readJson<VercelConfig>(configPath);
      expect(config?.env).toBeDefined();

      if (config?.env) {
        expectedEnvKeys.forEach(key => {
          expect(config.env[key]).toBeDefined();
        });
      }
    });
  });

  describe('.vercelignore files exist for all apps', () => {
    test.each(APPS)('%s has .vercelignore', (app) => {
      const ignorePath = join(APPS_DIR, app, '.vercelignore');
      expect(existsSync(ignorePath)).toBe(true);
    });
  });

  describe('.vercelignore contains required patterns', () => {
    const requiredPatterns = [
      'tests/',
      '__tests__/',
      '*.test.ts',
      '*.test.tsx',
      'thoughts/',
      'docs/'
    ];

    test.each(APPS)('%s .vercelignore contains required patterns', (app) => {
      const ignorePath = join(APPS_DIR, app, '.vercelignore');
      const content = readFileSync(ignorePath, 'utf-8');

      requiredPatterns.forEach(pattern => {
        expect(content).toContain(pattern);
      });
    });
  });
});
