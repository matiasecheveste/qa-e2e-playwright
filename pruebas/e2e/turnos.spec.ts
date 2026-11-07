/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Pruebas de extremo a extremo de los flujos principales.
 */
import { expect, test } from '../fixtures'

test.describe('Ingreso', () => {
  test('rechaza credenciales incorrectas y campos vacíos', async ({ turnos }) => {
    await turnos.ingresar.click()
    await expect(turnos.errorIngreso).toHaveText('Complete el correo y la contraseña.')
    await turnos.iniciarSesion('demo@ejemplo.uy', 'incorrecta')
    await expect(turnos.errorIngreso).toHaveText('Correo o contraseña incorrectos')
    await expect(turnos.page.getByRole('heading', { name: 'Turnos disponibles' })).toBeHidden()
  })

  test('mantiene la sesión al recargar y permite cerrarla', async ({ turnosConSesion: turnos }) => {
    await expect(turnos.usuario).toHaveText('Sesión de Usuario de demostración')
    await turnos.page.reload()
    await turnos.esperarAgenda()
    await turnos.salir.click()
    await expect(turnos.ingresar).toBeVisible()
  })
})

test.describe('Reservas', () => {
  test('reserva un turno con el trámite elegido y lo cancela', async ({ turnosConSesion: turnos }) => {
    await turnos.reservar('2026-12-01', '10:00', 'pasaporte')
    await expect(turnos.mensaje).toHaveText('Turno reservado: 2026-12-01 a las 10:00.')
    const fila = turnos.dia('2026-12-01').locator('[data-turno="2026-12-01T10:00"]')
    await expect(fila).toContainText('10:00 · Pasaporte')

    await turnos.cancelar('2026-12-01', '10:00')
    await expect(turnos.mensaje).toHaveText('Turno de las 10:00 cancelado.')
    await expect(fila.getByRole('button', { name: 'Reservar 10:00' })).toBeEnabled()
  })

  test('no permite dos turnos el mismo día', async ({ turnosConSesion: turnos }) => {
    await turnos.reservar('2026-12-01', '09:00')
    await turnos.reservar('2026-12-01', '11:30')
    await expect(turnos.mensaje).toHaveText('Ya tiene un turno ese día')
    await turnos.reservar('2026-12-02', '11:30')
    await expect(turnos.mensaje).toHaveText('Turno reservado: 2026-12-02 a las 11:30.')
  })

  test('muestra como ocupado un turno tomado por otra persona', async ({ turnosConSesion: turnos, request }) => {
    // Otra sesión (por API) reserva primero el turno de las 09:30.
    const otra = await (await request.post('/api/sesion', { data: { correo: 'demo@ejemplo.uy', clave: 'demo1234' } })).json()
    await request.post('/api/turnos/2026-12-02T09:30/reserva', {
      headers: { Authorization: `Bearer ${otra.token}` },
      data: { tramite: 'cedula' },
    })
    await turnos.page.reload()
    await turnos.esperarAgenda()
    // La misma cuenta ve el turno como propio; se verifica el caso de otra persona con la red simulada.
    await turnos.page.route('**/api/turnos', async (ruta) => {
      const respuesta = await ruta.fetch()
      const datos = (await respuesta.json()) as { id: string; propio: boolean }[]
      await ruta.fulfill({ response: respuesta, json: datos.map((t) => ({ ...t, propio: false })) })
    })
    await turnos.page.reload()
    await turnos.esperarAgenda()
    await expect(turnos.dia('2026-12-02').getByRole('button', { name: 'Ocupado' })).toBeDisabled()
  })

  test('informa errores del servidor sin romper la interfaz', async ({ turnosConSesion: turnos }) => {
    await turnos.page.route('**/api/turnos/*/reserva', (ruta) =>
      ruta.fulfill({ status: 503, json: { error: 'Servicio no disponible, intente más tarde' } }),
    )
    await turnos.reservar('2026-12-01', '09:00')
    await expect(turnos.mensaje).toHaveText('Servicio no disponible, intente más tarde')
    await expect(turnos.dia('2026-12-01').getByRole('button', { name: 'Reservar 09:00' })).toBeVisible()
  })
})
