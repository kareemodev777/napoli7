import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = await fs.readFile(require.resolve('axe-core/axe.js'), 'utf8');

const routes = process.argv.slice(2);
if (!routes.length) {
  console.error('Usage: node scripts/a11y-audit.mjs <url>...');
  process.exit(2);
}

const outDir = path.join(process.cwd(), 'reports', 'a11y');
await fs.mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let failures = 0;
try {
  for (const url of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(axeSource);
    const results = await page.evaluate(async () => {
      return await globalThis.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
    });
    const pathname = new URL(url).pathname;
    const name = pathname === '/' ? 'home' : pathname.replace(/^\//, '').replace(/\//g, '-');
    await fs.writeFile(path.join(outDir, `${name}.json`), JSON.stringify(results, null, 2));
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    const all = results.violations.map((v) => `${v.impact || 'unknown'}:${v.id}(${v.nodes.length})`).join(', ') || 'none';
    console.log(`${pathname}: ${results.violations.length} violations; serious/critical ${serious.length}; ${all}`);
    if (serious.length) {
      failures += serious.length;
      for (const violation of serious) {
        console.log(`  ${violation.impact}:${violation.id} ${violation.help}`);
        for (const node of violation.nodes.slice(0, 3)) console.log(`    - ${node.target.join(' ')}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures) process.exit(1);
