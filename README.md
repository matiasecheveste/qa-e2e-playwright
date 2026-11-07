# QA automatizada con Playwright

Suite de pruebas automatizadas sobre una aplicación de reserva de turnos de atención al público, escrita con **Playwright + TypeScript**. Cubre los tres niveles que suele pedir un equipo de QA:

| Nivel | Qué se prueba | Archivo |
|---|---|---|
| API REST | contrato de respuesta, códigos 200/201/204/400/401/403/404/409/422, reglas de negocio, intento de *path traversal* | `pruebas/api/turnos.api.spec.ts` |
| Extremo a extremo | ingreso, sesión persistente, reserva y cancelación, regla de un turno por día, errores del servidor simulados con `page.route` | `pruebas/e2e/turnos.spec.ts` |
| Accesibilidad | auditoría WCAG 2.1 A/AA con axe-core y uso sólo con teclado | `pruebas/e2e/accesibilidad.spec.ts` |

Las pruebas de extremo a extremo corren en Chromium de escritorio y en un perfil móvil (Pixel 7): **20 pruebas** en total.

## Decisiones de diseño

- **Page Object** (`pruebas/paginas/PaginaTurnos.ts`): los selectores se basan en roles y etiquetas accesibles (`getByRole`, `getByLabel`), no en clases CSS, así que las pruebas se rompen sólo si cambia lo que ve el usuario.
- **Fixtures propios** (`pruebas/fixtures.ts`): cada prueba arranca con el servidor reiniciado y, si lo necesita, con sesión iniciada (`turnosConSesion`) o con un token de API (`token`). No hay dependencias de orden entre pruebas.
- **Red simulada**: los casos difíciles de reproducir (un 503, un turno tomado por otra persona) se fuerzan interceptando las respuestas en lugar de manipular datos reales.
- **Evidencia ante fallos**: captura de pantalla y *trace* sólo cuando una prueba falla; en CI se publica el informe HTML como artefacto.

Durante el desarrollo la suite detectó un defecto real: una regla `display: grid` anulaba el atributo `hidden` y la agenda quedaba visible sin sesión. La prueba de ingreso fallido lo marcó y se corrigió en `estilos.css`.

## Aplicación bajo prueba

`app/servidor.mjs` es un servidor Node sin dependencias con una API REST en memoria, autenticación por token *Bearer*, comparación de credenciales en tiempo constante y cabeceras de seguridad (CSP, `nosniff`). La interfaz (`app/publico/`) es HTML y JavaScript sin *frameworks*.

Usuario de demostración: `demo@ejemplo.uy` / `demo1234` (sólo existe en memoria en este servidor local).

## Uso

```bash
npm install
npx playwright install chromium
npm test              # toda la suite (levanta el servidor automáticamente)
npm run test:api      # sólo la API
npm run informe       # abre el informe HTML
npm run app           # levanta la aplicación en http://localhost:4310
```

## Integración continua

GitHub Actions instala Chromium con sus dependencias, verifica tipos, ejecuta la suite y sube el informe HTML como artefacto (se conserva 14 días).

## Autor

Matías Nicolás Echeveste Cardozo — licencia MIT.
