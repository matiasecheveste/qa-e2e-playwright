/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Auditoría automática de accesibilidad (WCAG 2.1 A y AA) con axe-core y navegación por teclado.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '../fixtures'

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test('la pantalla de ingreso no tiene violaciones de accesibilidad', async ({ turnos }) => {
  const resultado = await new AxeBuilder({ page: turnos.page }).withTags(ETIQUETAS_WCAG).analyze()
  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

test('la agenda no tiene violaciones de accesibilidad', async ({ turnosConSesion: turnos }) => {
  await turnos.reservar('2026-12-01', '09:00')
  const resultado = await new AxeBuilder({ page: turnos.page }).withTags(ETIQUETAS_WCAG).analyze()
  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

test('se puede ingresar usando sólo el teclado', async ({ turnos }) => {
  await turnos.page.keyboard.press('Tab')
  await expect(turnos.correo).toBeFocused()
  await turnos.page.keyboard.type('demo@ejemplo.uy')
  await turnos.page.keyboard.press('Tab')
  await turnos.page.keyboard.type('demo1234')
  await turnos.page.keyboard.press('Enter')
  await turnos.esperarAgenda()
})
