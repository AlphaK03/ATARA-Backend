const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

// ── Token management ──────────────────────────────────────────────────────
export function getAccessToken()  { return localStorage.getItem('atara_token') }
export function setAccessToken(t) { localStorage.setItem('atara_token', t) }
export function clearAccessToken(){ localStorage.removeItem('atara_token') }
export function getRefreshToken() { return localStorage.getItem('atara_refresh') }
export function setRefreshToken(t){ localStorage.setItem('atara_refresh', t) }
export function clearRefreshToken(){ localStorage.removeItem('atara_refresh') }
export function getUserId()       { return localStorage.getItem('atara_user_id') }
export function setUserId(id)     { localStorage.setItem('atara_user_id', String(id)) }
export function clearUserId()     { localStorage.removeItem('atara_user_id') }

// ── Refresh silencioso ────────────────────────────────────────────────────
// Evita que dos peticiones simultáneas lancen dos refreshes a la vez.
let refreshPromise = null

async function tryRefresh() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const rt = getRefreshToken()
    if (!rt) throw new Error('sin refresh token')
    const res = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
    if (!res.ok) throw new Error('refresh fallido')
    const data = await res.json()
    setAccessToken(data.accessToken)
    if (data.refreshToken) setRefreshToken(data.refreshToken)
  })()
  try {
    await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// ── Request base ──────────────────────────────────────────────────────────
async function request(method, path, body, isRetry = false) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(BASE + path, opts)
  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    if (res.status === 401) {
      if (!isRetry) {
        // Intentar renovar el token una sola vez
        try {
          await tryRefresh()
          return request(method, path, body, true) // reintento con nuevo token
        } catch {
          // Refresh también falló → caer al cierre de sesión
        }
      }
      // 401 en primer intento (refresh fallido) O en el reintento (token rechazado
      // de nuevo) → la sesión expiró definitivamente; mostrar login siempre.
      clearAccessToken()
      clearRefreshToken()
      clearUserId()
      window.dispatchEvent(new CustomEvent('atara:session-expired'))
      return null   // detener silenciosamente; el login reemplaza el contenido
    }
    const msg = json?.message || json?.error || `Error ${res.status}`
    throw new Error(msg)
  }
  // Si la respuesta está envuelta en ApiResponse {success, message, data}, extraer .data.
  // Auth endpoints (login/refresh) no usan el wrapper, así que se devuelven tal cual.
  return (json !== null && typeof json === 'object' && 'success' in json) ? json.data : json
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function login(correo, password) {
  _meCache = null
  const data = await request('POST', '/auth/login', { correo, password })
  setAccessToken(data.accessToken)
  if (data.refreshToken) setRefreshToken(data.refreshToken)
  if (data.userId) setUserId(data.userId)
  return data
}
export async function logout() {
  _meCache = null
  const rt = getRefreshToken()
  if (rt) {
    // Revocar el refresh token en el backend (best-effort, no bloquear si falla)
    try { await request('POST', '/auth/logout', { refreshToken: rt }) } catch { /* ignorar */ }
  }
  clearAccessToken()
  clearRefreshToken()
  clearUserId()
}

export const getMe = () => request('GET', '/auth/me')

// ── Contexto del usuario autenticado (cacheado por sesión) ────────────────
// Devuelve { userId, correo, nombre, apellidos, rol, seccionIds, materiaIds }
// rol === 'DOCENTE' → seccionIds/materiaIds contienen sus asignaciones
// rol === 'ADMIN' | 'COORDINADOR' → seccionIds/materiaIds están vacíos (acceso total)
let _meCache = null
export async function getContextoUsuario() {
  if (!_meCache) _meCache = await getMe()
  return _meCache
}

/**
 * Filtra una lista de secciones al alcance del usuario autenticado.
 * ADMIN/COORDINADOR ven todas; DOCENTE solo las asignadas.
 */
export async function filtrarSeccionesPropias(secciones) {
  const ctx = await getContextoUsuario()
  if (!ctx || ctx.rol !== 'DOCENTE') return secciones
  return secciones.filter(s => ctx.seccionIds?.includes(s.id))
}

/**
 * Filtra una lista de materias al alcance del usuario autenticado.
 * ADMIN/COORDINADOR ven todas; DOCENTE solo las asignadas.
 */
export async function filtrarMateriasPropias(materias) {
  const ctx = await getContextoUsuario()
  if (!ctx || ctx.rol !== 'DOCENTE') return materias
  return materias.filter(m => ctx.materiaIds?.includes(m.id))
}

// ── Periodos ───────────────────────────────────────────────────────────────
export const getPeriodos       = (anioLectivoId) => request('GET', `/periodos?anioLectivoId=${anioLectivoId}`)
export const getPeriodoActivo  = (anioLectivoId) => request('GET', `/periodos/activo?anioLectivoId=${anioLectivoId}`)
export const activarPeriodo    = (id)            => request('PUT', `/periodos/${id}/activar`)

// ── Secciones ──────────────────────────────────────────────────────────────
export const getSecciones          = (anioLectivoId) => request('GET', `/secciones?anioLectivoId=${anioLectivoId}`)
export const getSeccionesByDocente = (docenteId)     => request('GET', `/secciones/docente/${docenteId}`)

// ── Años Lectivos ──────────────────────────────────────────────────────────
export const getAniosLectivos     = ()       => request('GET',  '/anios-lectivos')
export const getAnioLectivoActivo = ()       => request('GET',  '/anios-lectivos/activo')
export const createAnioLectivo    = (data)   => request('POST', '/anios-lectivos', data)
export const activarAnioLectivo   = (id)     => request('PUT',  `/anios-lectivos/${id}/activar`)

// ── Estudiantes ────────────────────────────────────────────────────────────
export const getEstudiantes      = (estado)   => request('GET',  `/estudiantes${estado ? `?estado=${estado}` : ''}`)
export const getEstudiante       = (id)        => request('GET',  `/estudiantes/${id}`)
export const createEstudiante    = (data)      => request('POST', '/estudiantes', data)
export const updateEstudiante    = (id, data)  => request('PUT',  `/estudiantes/${id}`, data)

// ── Matrículas ─────────────────────────────────────────────────────────────
export const createMatricula          = (data) => request('POST', '/matriculas', data)
export const getMatriculasByEstudiante = (id)  => request('GET',  `/matriculas/estudiante/${id}`)
export const getMatriculasBySeccion    = (id)  => request('GET',  `/matriculas/seccion/${id}`)

// ── Evaluaciones ───────────────────────────────────────────────────────────
export const createEvaluacion         = (data)    => request('POST', '/evaluaciones', data)
export const addDetalleEvaluacion     = (id, data) => request('POST', `/evaluaciones/${id}/detalles`, data)
export const getEvaluacion            = (id)       => request('GET',  `/evaluaciones/${id}`)
export const getEvaluacionesByEstudiante = (id)    => request('GET',  `/evaluaciones/estudiante/${id}`)

// ── Alertas ────────────────────────────────────────────────────────────────
export const getAlertasByEstudiante = (studentId, periodId) =>
  request('GET', `/alertas/estudiante/${studentId}${periodId ? `?periodId=${periodId}` : ''}`)
export const getAlertasBySeccion = (sectionId, periodId) =>
  request('GET', `/alertas/seccion/${sectionId}${periodId ? `?periodId=${periodId}` : ''}`)

// ── PIAD ───────────────────────────────────────────────────────────────────
export async function extraerPIAD(archivo) {
  const form = new FormData()
  form.append('archivo', archivo)
  const headers = {}
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + '/piad/extraer', { method: 'POST', headers, body: form })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(json?.message || json?.error || `Error ${res.status}`)
  return json
}

// ── Catálogos de Saberes ───────────────────────────────────────────────────
export const getTiposSaber       = ()                          => request('GET', '/catalogos/saberes/tipos')
export const getMaterias         = ()                          => request('GET', '/catalogos/saberes/materias')
export const getEjesTematicos    = (tipoSaberId, materiaId) => {
  const params = []
  if (materiaId)  params.push(`materiaId=${materiaId}`)
  if (tipoSaberId) params.push(`tipoSaberId=${tipoSaberId}`)
  return request('GET', `/catalogos/saberes/ejes${params.length ? '?' + params.join('&') : ''}`)
}

/**
 * Ejes filtrados por nivel/grado del estudiante (V12+).
 * Es el endpoint correcto para el wizard de evaluación: garantiza que solo
 * se muestren los ejes que aplican al grado de la sección (ej: "Álgebra"
 * no aparece en 1° de primaria).
 */
export const getEjesPorNivel = (nivelId, opts = {}) => {
  const params = [`nivelId=${nivelId}`]
  if (opts.materiaId)   params.push(`materiaId=${opts.materiaId}`)
  if (opts.tipoSaberId) params.push(`tipoSaberId=${opts.tipoSaberId}`)
  return request('GET', `/catalogos/saberes/ejes?${params.join('&')}`)
}
export const getNivelesDesempeno = ()                          => request('GET', '/catalogos/saberes/niveles-desempeno')

// ── Catálogos de Secciones ─────────────────────────────────────────────────
export const getNiveles  = ()    => request('GET', '/secciones/catalogos/niveles')
export const getCentros  = ()    => request('GET', '/secciones/catalogos/centros')
export const getDocentes = ()    => request('GET', '/secciones/catalogos/docentes')
export const createSeccion = (data) => request('POST', '/secciones', data)

/**
 * Catálogo de estudiantes para el wizard de sección. A diferencia de
 * `getEstudiantes()` (lista global), este endpoint:
 *  - Filtra solo ACTIVOS
 *  - Si se pasa `anioLectivoId`, excluye los que ya tienen matrícula ese año
 *  - Si además se pasa `seccionId` (modo edición), re-incluye los ya
 *    matriculados en esa sección para que aparezcan pre-seleccionados.
 *
 * Devuelve EstudianteCatalogoDto = { id, identificacion, nombreCompleto, estado }
 */
export const getEstudiantesParaSeccion = (anioLectivoId, seccionId) => {
  const params = []
  if (anioLectivoId) params.push(`anioLectivoId=${anioLectivoId}`)
  if (seccionId)     params.push(`seccionId=${seccionId}`)
  return request('GET', `/secciones/catalogos/estudiantes${params.length ? '?' + params.join('&') : ''}`)
}

// ── Evaluaciones por Saber ─────────────────────────────────────────────────
export const createEvaluacionSaber = (data)        => request('POST', '/evaluaciones-saber', data)
export const updateEvaluacionSaber = (id, data)    => request('PUT',  `/evaluaciones-saber/${id}`, data)
export const getEvaluacionSaber    = (id)          => request('GET',  `/evaluaciones-saber/${id}`)
export const getEvaluacionesSaberByEstudiantePeriodo = (estudianteId, periodoId) =>
  request('GET', `/evaluaciones-saber/estudiante/${estudianteId}/periodo/${periodoId}`)
export const getEvaluacionesSaberBySeccionPeriodo = (seccionId, periodoId) =>
  request('GET', `/evaluaciones-saber/seccion/${seccionId}/periodo/${periodoId}`)
export const getPromediosSaber = (estudianteId, periodoId) =>
  request('GET', `/evaluaciones-saber/promedios/estudiante/${estudianteId}/periodo/${periodoId}`)
export const getPromediosSeccionSaber = (seccionId, periodoId) =>
  request('GET', `/evaluaciones-saber/promedios/seccion/${seccionId}/periodo/${periodoId}`)

// ── Alertas Temáticas ─────────────────────────────────────────────────────
export const generarAlertasTematicasEstudiante = (estudianteId, periodoId) =>
  request('POST', `/alertas-tematicas/generar/estudiante/${estudianteId}/periodo/${periodoId}`)
export const generarAlertasTematicasSeccion = (seccionId, periodoId) =>
  request('POST', `/alertas-tematicas/generar/seccion/${seccionId}/periodo/${periodoId}`)
export const getAlertasTematicasEstudiante = (estudianteId, periodoId) =>
  request('GET', `/alertas-tematicas/estudiante/${estudianteId}/periodo/${periodoId}`)
export const getAlertasTematicasSeccion = (seccionId, periodoId) =>
  request('GET', `/alertas-tematicas/seccion/${seccionId}/periodo/${periodoId}`)

// ── Admin ──────────────────────────────────────────────────────────────────
/** GET /api/admin/usuarios — solo ADMIN */
export const getUsuarios    = ()           => request('GET',    '/admin/usuarios')
export const createUsuario  = (data)       => request('POST',   '/admin/usuarios', data)
export const updateUsuario  = (id, data)   => request('PUT',    `/admin/usuarios/${id}`, data)
export const deleteUsuario  = (id)         => request('DELETE', `/admin/usuarios/${id}`)

// ── Admin: Centros Educativos ─────────────────────────────────────────────
// Solo ADMIN. Sin DELETE: los centros se conservan como histórico.
export const getCentrosAdmin     = ()           => request('GET',  '/admin/centros')
export const getCentroAdmin      = (id)         => request('GET',  `/admin/centros/${id}`)
export const createCentroAdmin   = (data)       => request('POST', '/admin/centros', data)
export const updateCentroAdmin   = (id, data)   => request('PUT',  `/admin/centros/${id}`, data)

// ── Secciones (eliminación segura por DOCENTE titular) ────────────────────
export const deleteSeccionDocente = (id) => request('DELETE', `/secciones/${id}/docente`)

// ── Admin CRUD (backend endpoints not yet implemented) ────────────────────
// Each stub will throw until the corresponding backend endpoint is created.
// TODO: Backend needs DELETE /api/estudiantes/{id}
export const deleteEstudiante  = (id)       => request('DELETE', `/estudiantes/${id}`)

// TODO: Backend needs PUT /api/secciones/{id}, DELETE /api/secciones/{id}
export const updateSeccion     = (id, data) => request('PUT',    `/secciones/${id}`, data)
export const deleteSeccion     = (id)       => request('DELETE', `/secciones/${id}`)

// TODO: Backend needs PUT /api/anios-lectivos/{id}, DELETE /api/anios-lectivos/{id}
export const updateAnioLectivo = (id, data) => request('PUT',    `/anios-lectivos/${id}`, data)
export const deleteAnioLectivo = (id)       => request('DELETE', `/anios-lectivos/${id}`)

// TODO: Backend needs POST /api/periodos, PUT /api/periodos/{id}, DELETE /api/periodos/{id}
export const createPeriodo     = (data)     => request('POST',   `/periodos`, data)
export const updatePeriodo     = (id, data) => request('PUT',    `/periodos/${id}`, data)
export const deletePeriodo     = (id)       => request('DELETE', `/periodos/${id}`)

// ── Health ─────────────────────────────────────────────────────────────────
export const checkHealth = () => fetch('/actuator/health').then(r => r.json())
