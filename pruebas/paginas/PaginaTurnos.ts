/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Page Object de la aplicación de turnos: encapsula selectores accesibles y acciones de alto nivel.
 */
import { expect, type Locator, type Page } from '@playwright/test'

export const CREDENCIALES_DEMO = { correo: 'demo@ejemplo.uy', clave: 'demo1234' }

export class PaginaTurnos {
  readonly correo: Locator
  readonly clave: Locator
  readonly ingresar: Locator
  readonly errorIngreso: Locator
  readonly usuario: Locator
  readonly salir: Locator
  readonly tramite: Locator
  readonly mensaje: Locator

  constructor(readonly page: Page) {
    this.correo = page.getByLabel('Correo electrónico')
    this.clave = page.getByLabel('Contraseña')
    this.ingresar = page.getByRole('button', { name: 'Ingresar' })
    this.errorIngreso = page.locator('#error-ingreso')
    this.usuario = page.locator('#usuario')
    this.salir = page.getByRole('button', { name: 'Cerrar sesión' })
    this.tramite = page.getByLabel('Trámite')
    this.mensaje = page.getByRole('status')
  }

  async abrir() {
    await this.page.goto('/')
  }

  async iniciarSesion(correo = CREDENCIALES_DEMO.correo, clave = CREDENCIALES_DEMO.clave) {
    await this.correo.fill(correo)
    await this.clave.fill(clave)
    await this.ingresar.click()
  }

  dia(fecha: string): Locator {
    return this.page.getByRole('region', { name: `Turnos del ${fecha}` })
  }

  async reservar(fecha: string, hora: string, tramite?: 'cedula' | 'pasaporte' | 'certificado') {
    if (tramite) await this.tramite.selectOption(tramite)
    await this.dia(fecha).getByRole('button', { name: `Reservar ${hora}` }).click()
  }

  async cancelar(fecha: string, hora: string) {
    await this.dia(fecha).getByRole('button', { name: `Cancelar ${hora}` }).click()
  }

  async esperarAgenda() {
    await expect(this.page.getByRole('heading', { name: 'Turnos disponibles' })).toBeVisible()
  }
}
