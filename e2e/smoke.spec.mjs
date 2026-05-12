import { test, expect } from '@playwright/test';

// Smoke flow: load with ?fallback=1 (bundled OSM, no Overpass), step through
// menu → area select → quiz typed mode, and assert no runtime errors. Catches
// regressions in dependency order, script loading, and basic React mounting.

test('fallback flow: menu → area → quiz typed mode', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.goto('/?fallback=1');

  // Menu loads after the fallback bundle is parsed
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Välj spelläge')).toBeVisible();

  // Pick Quiz
  await page.getByRole('button', { name: /Quiz/ }).first().click();

  // Area select
  await expect(page.getByText('Välj område')).toBeVisible();

  // Click "Hela innerstaden" once to select it (not double-click; we use the start button)
  await page.getByRole('button', { name: /Hela innerstaden/ }).click();
  await page.getByRole('button', { name: /Spela hela/ }).click();

  // Quiz prompt shows up
  await expect(page.locator('.quiz-prompt')).toBeVisible({ timeout: 5000 });
  // Default is type mode
  await expect(page.locator('.quiz-switch button.on')).toContainText('Skriv');

  // Filter out the harmless Babel-in-production warning
  const real = errors.filter(e => !/Babel|babel/i.test(e));
  expect(real, `unexpected console/page errors:\n${real.join('\n')}`).toEqual([]);
});

test('fallback flow: menu → area → fill mode opens a guess popover', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.goto('/?fallback=1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

  // Fill in mode
  await page.getByRole('button', { name: /Fyll i/ }).first().click();
  await expect(page.getByText('Välj område')).toBeVisible();
  await page.getByRole('button', { name: /Hela innerstaden/ }).click();
  await page.getByRole('button', { name: /Spela hela/ }).click();

  // The game HUD renders
  await expect(page.locator('.game-hud')).toBeVisible({ timeout: 5000 });
  // The Leaflet map mounts
  await expect(page.locator('.leaflet-host')).toBeVisible();

  const real = errors.filter(e => !/Babel|babel/i.test(e));
  expect(real, `unexpected console/page errors:\n${real.join('\n')}`).toEqual([]);
});

test('fallback flow: learn mode can finish to results with trivia and share', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.addInitScript(() => {
    window.__sharedText = '';
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async text => {
          window.__sharedText = text;
        },
      },
      configurable: true,
    });
  });

  await page.goto('/?fallback=1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: /Lär/ }).first().click();
  await expect(page.getByText('Välj område')).toBeVisible();
  await page.getByRole('button', { name: /Gamla Stan/ }).first().click();
  await page.getByRole('button', { name: /Spela Gamla Stan/ }).click();

  await expect(page.locator('.game-hud')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Avsluta/ }).last().click();

  await expect(page.locator('.results-page')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Visste du?')).toBeVisible();
  await expect(page.locator('.trivia-card.district')).toContainText('Gamla Stan');

  await page.getByRole('button', { name: /Dela/ }).click();
  await expect(page.getByText('Kopierat till urklipp')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__sharedText)).toContain('Gatlykta');
  await expect.poll(() => page.evaluate(() => window.__sharedText)).toContain('Gamla Stan');

  const real = errors.filter(e => !/Babel|babel/i.test(e));
  expect(real, `unexpected console/page errors:\n${real.join('\n')}`).toEqual([]);
});
