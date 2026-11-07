/*
 * QA con Playwright — Matías Nicolás Echeveste Cardozo
 * Cliente de la aplicación bajo prueba.
 */
const $ = (id) => document.getElementById(id)
let token = sessionStorage.getItem('token')
let nombre = sessionStorage.getItem('nombre')

const TRAMITES = { cedula: 'Cédula de identidad', pasaporte: 'Pasaporte', certificado: 'Certificado de domicilio' }

async function llamar(metodo, ruta, cuerpo) {
  const r = await fetch(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const datos = r.status === 204 ? null : await r.json()
  if (!r.ok) throw new Error(datos?.error ?? `Error ${r.status}`)
  return datos
}

function mostrarSesion() {
  const activa = !!token
  $('ingreso').hidden = activa
  $('agenda').hidden = !activa
  $('salir').hidden = !activa
  $('usuario').textContent = activa ? `Sesión de ${nombre}` : ''
  if (activa) cargar()
}

async function cargar() {
  const turnos = await llamar('GET', '/api/turnos')
  const porDia = Object.groupBy(turnos, (t) => t.fecha)
  $('dias').replaceChildren(
    ...Object.entries(porDia).map(([fecha, lista]) => {
      const seccion = document.createElement('section')
      seccion.setAttribute('aria-label', `Turnos del ${fecha}`)
      const titulo = document.createElement('h3')
      titulo.textContent = new Date(`${fecha}T12:00`).toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
      const ul = document.createElement('ul')
      for (const t of lista) {
        const li = document.createElement('li')
        li.dataset.turno = t.id
        const hora = document.createElement('span')
        hora.textContent = t.hora
        const boton = document.createElement('button')
        boton.type = 'button'
        if (t.propio) {
          boton.textContent = `Cancelar ${t.hora}`
          boton.className = 'propio'
          boton.addEventListener('click', () => cancelar(t))
          hora.textContent = `${t.hora} · ${TRAMITES[t.tramite]}`
        } else if (t.disponible) {
          boton.textContent = `Reservar ${t.hora}`
          boton.addEventListener('click', () => reservar(t))
        } else {
          boton.textContent = 'Ocupado'
          boton.disabled = true
        }
        li.append(hora, boton)
        ul.append(li)
      }
      seccion.append(titulo, ul)
      return seccion
    }),
  )
}

async function reservar(t) {
  try {
    const r = await llamar('POST', `/api/turnos/${t.id}/reserva`, { tramite: $('tramite').value })
    $('mensaje').textContent = `Turno reservado: ${r.fecha} a las ${r.hora}.`
  } catch (e) {
    $('mensaje').textContent = e.message
  }
  await cargar()
}

async function cancelar(t) {
  await llamar('DELETE', `/api/turnos/${t.id}/reserva`)
  $('mensaje').textContent = `Turno de las ${t.hora} cancelado.`
  await cargar()
}

$('ingreso').addEventListener('submit', async (e) => {
  e.preventDefault()
  const correo = $('correo').value.trim()
  const clave = $('clave').value
  $('error-ingreso').textContent = ''
  if (!correo || !clave) return void ($('error-ingreso').textContent = 'Complete el correo y la contraseña.')
  try {
    const r = await llamar('POST', '/api/sesion', { correo, clave })
    token = r.token
    nombre = r.nombre
    sessionStorage.setItem('token', token)
    sessionStorage.setItem('nombre', nombre)
    mostrarSesion()
  } catch (error) {
    $('error-ingreso').textContent = error.message
  }
})

$('salir').addEventListener('click', () => {
  token = nombre = null
  sessionStorage.clear()
  $('mensaje').textContent = ''
  mostrarSesion()
})

mostrarSesion()
