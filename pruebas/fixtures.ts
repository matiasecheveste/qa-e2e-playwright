/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Fixtures propios: reinician el estado del servidor antes de cada prueba y exponen el Page Object.
 */
import { test as base } from '@playwright/test'
import { CREDENCIALES_DEMO, PaginaTurnos } from './paginas/PaginaTurnos'

type Fixtures = {
  turnos: PaginaTurnos
  turnosConSesion: PaginaTurnos
  token: string
}

export const test = base.extend<Fixtures>({
  page: async ({ page, request }, usar) => {
    await request.post('/api/reiniciar')
    await usar(page)
  },
  turnos: async ({ page }, usar) => {
    const turnos = new PaginaTurnos(page)
    await turnos.abrir()
    await usar(turnos)
  },
  turnosConSesion: async ({ turnos }, usar) => {
    await turnos.iniciarSesion()
    await turnos.esperarAgenda()
    await usar(turnos)
  },
  token: async ({ request }, usar) => {
    await request.post('/api/reiniciar')
    const r = await request.post('/api/sesion', { data: CREDENCIALES_DEMO })
    await usar((await r.json()).token)
  },
})

export { expect } from '@playwright/test'
