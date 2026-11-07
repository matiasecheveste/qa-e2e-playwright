/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Aplicación bajo prueba: reserva de turnos de atención al público.
 * Servidor HTTP sin dependencias con API REST en memoria y archivos estáticos.
 */
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLICO = fileURLToPath(new URL('./publico/', import.meta.url))
const PUERTO = Number(process.env.PUERTO ?? 4310)
const USUARIO = { correo: 'demo@ejemplo.uy', clave: 'demo1234', nombre: 'Usuario de demostración' }
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }

function turnosIniciales() {
  const horas = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
  return ['2026-12-01', '2026-12-02'].flatMap((fecha) =>
    horas.map((hora) => ({ id: `${fecha}T${hora}`, fecha, hora, reservadoPor: null, tramite: null })),
  )
}

let turnos = turnosIniciales()
const sesiones = new Map()

const iguales = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

function responder(res, estado, cuerpo, encabezados = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', ...encabezados })
  res.end(cuerpo === undefined ? '' : JSON.stringify(cuerpo))
}

async function leerJson(req) {
  let datos = ''
  for await (const parte of req) {
    datos += parte
    if (datos.length > 10_000) throw Object.assign(new Error('Cuerpo demasiado grande'), { estado: 413 })
  }
  try {
    return datos ? JSON.parse(datos) : {}
  } catch {
    throw Object.assign(new Error('JSON mal formado'), { estado: 400 })
  }
}

function sesionDe(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1]
  return token ? sesiones.get(token) : undefined
}

async function api(req, res, ruta) {
  if (req.method === 'POST' && ruta === '/api/sesion') {
    const { correo, clave } = await leerJson(req)
    if (!iguales(correo, USUARIO.correo) || !iguales(clave, USUARIO.clave)) {
      return responder(res, 401, { error: 'Correo o contraseña incorrectos' })
    }
    const token = randomUUID()
    sesiones.set(token, { correo: USUARIO.correo, nombre: USUARIO.nombre })
    return responder(res, 201, { token, nombre: USUARIO.nombre })
  }
  if (req.method === 'POST' && ruta === '/api/reiniciar') {
    turnos = turnosIniciales()
    sesiones.clear()
    return responder(res, 204)
  }
  if (req.method === 'GET' && ruta === '/api/turnos') {
    const sesion = sesionDe(req)
    return responder(
      res,
      200,
      turnos.map(({ reservadoPor, ...t }) => ({ ...t, disponible: !reservadoPor, propio: !!sesion && reservadoPor === sesion.correo })),
    )
  }

  const sesion = sesionDe(req)
  if (!sesion) return responder(res, 401, { error: 'Inicie sesión' }, { 'WWW-Authenticate': 'Bearer' })

  const reserva = /^\/api\/turnos\/([\w:-]+)\/reserva$/.exec(ruta)
  if (reserva) {
    const turno = turnos.find((t) => t.id === reserva[1])
    if (!turno) return responder(res, 404, { error: 'Turno inexistente' })
    if (req.method === 'POST') {
      const { tramite } = await leerJson(req)
      if (!['cedula', 'pasaporte', 'certificado'].includes(tramite)) return responder(res, 422, { error: 'Trámite no válido' })
      if (turno.reservadoPor) return responder(res, 409, { error: 'El turno ya fue reservado' })
      if (turnos.some((t) => t.reservadoPor === sesion.correo && t.fecha === turno.fecha)) {
        return responder(res, 409, { error: 'Ya tiene un turno ese día' })
      }
      Object.assign(turno, { reservadoPor: sesion.correo, tramite })
      return responder(res, 201, { id: turno.id, fecha: turno.fecha, hora: turno.hora, tramite })
    }
    if (req.method === 'DELETE') {
      if (turno.reservadoPor !== sesion.correo) return responder(res, 403, { error: 'El turno no es suyo' })
      Object.assign(turno, { reservadoPor: null, tramite: null })
      return responder(res, 204)
    }
  }
  return responder(res, 404, { error: 'Ruta inexistente' })
}

async function estatico(res, ruta) {
  const relativa = normalize(ruta === '/' ? '/index.html' : ruta).replace(/^([/\\])+/, '')
  const archivo = join(PUBLICO, relativa)
  if (!archivo.startsWith(PUBLICO)) return responder(res, 403, { error: 'Prohibido' })
  try {
    const contenido = await readFile(archivo)
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(contenido)
  } catch {
    responder(res, 404, { error: 'No encontrado' })
  }
}

createServer(async (req, res) => {
  const ruta = new URL(req.url, 'http://localhost').pathname
  try {
    if (ruta.startsWith('/api/')) await api(req, res, ruta)
    else await estatico(res, ruta)
  } catch (error) {
    responder(res, error.estado ?? 500, { error: error.estado ? error.message : 'Error interno' })
  }
}).listen(PUERTO, () => console.log(`Aplicación bajo prueba en http://localhost:${PUERTO}`))
