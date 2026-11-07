/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Pruebas de la API REST: contratos, códigos de estado y reglas de negocio.
 */
import { expect, test } from '../fixtures'

test.describe('API de turnos', () => {
  test('lista los turnos con el contrato esperado', async ({ request }) => {
    await request.post('/api/reiniciar')
    const r = await request.get('/api/turnos')
    expect(r.status()).toBe(200)
    expect(r.headers()['content-type']).toContain('application/json')
    const turnos = await r.json()
    expect(turnos).toHaveLength(12)
    expect(turnos[0]).toEqual({ id: '2026-12-01T09:00', fecha: '2026-12-01', hora: '09:00', tramite: null, disponible: true, propio: false })
    expect(turnos[0]).not.toHaveProperty('reservadoPor')
  })

  test('exige autenticación para reservar', async ({ request }) => {
    const r = await request.post('/api/turnos/2026-12-01T09:00/reserva', { data: { tramite: 'cedula' } })
    expect(r.status()).toBe(401)
    expect(r.headers()['www-authenticate']).toBe('Bearer')
  })

  test('reserva, impide la doble reserva y cancela', async ({ request, token }) => {
    const auth = { Authorization: `Bearer ${token}` }
    const ruta = '/api/turnos/2026-12-02T10:30/reserva'
    const r1 = await request.post(ruta, { headers: auth, data: { tramite: 'certificado' } })
    expect(r1.status()).toBe(201)
    expect(await r1.json()).toEqual({ id: '2026-12-02T10:30', fecha: '2026-12-02', hora: '10:30', tramite: 'certificado' })
    expect((await request.post(ruta, { headers: auth, data: { tramite: 'cedula' } })).status()).toBe(409)
    expect((await request.delete(ruta, { headers: auth })).status()).toBe(204)
    expect((await request.delete(ruta, { headers: auth })).status()).toBe(403)
  })

  test('valida la entrada', async ({ request, token }) => {
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    expect((await request.post('/api/turnos/2026-12-01T09:00/reserva', { headers: auth, data: { tramite: 'otro' } })).status()).toBe(422)
    expect((await request.post('/api/turnos/2026-12-01T09:00/reserva', { headers: auth, data: Buffer.from('{mal json') })).status()).toBe(400)
    expect((await request.post('/api/turnos/2099-01-01T09:00/reserva', { headers: auth, data: { tramite: 'cedula' } })).status()).toBe(404)
    expect((await request.post('/api/sesion', { data: { correo: 'demo@ejemplo.uy', clave: 'x' } })).status()).toBe(401)
  })

  test('no expone archivos fuera de la carpeta pública', async ({ request }) => {
    const r = await request.get('/..%2Fservidor.mjs')
    expect([403, 404]).toContain(r.status())
    expect(await r.text()).not.toContain('createServer')
  })
})
