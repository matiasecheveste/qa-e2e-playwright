/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 */
import { defineConfig, devices } from '@playwright/test'

const PUERTO = 4310

export default defineConfig({
  testDir: './pruebas',
  fullyParallel: false, // el servidor de pruebas guarda estado en memoria
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-UY',
    timezoneId: 'America/Montevideo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'chromium', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', testMatch: /e2e\/turnos\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node app/servidor.mjs',
    url: `http://localhost:${PUERTO}/api/turnos`,
    reuseExistingServer: !process.env.CI,
    env: { PUERTO: String(PUERTO) },
  },
})
