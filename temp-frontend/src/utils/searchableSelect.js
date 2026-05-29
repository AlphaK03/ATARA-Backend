/**
 * Convierte un <select> nativo en un selector con búsqueda por texto.
 *
 * Mejora progresiva: el <select> original se conserva oculto como fuente de
 * verdad, de modo que:
 *   - leer el valor sigue siendo `selectEl.value` (el ID de la opción),
 *   - los listeners de `change` existentes siguen funcionando (se redispara),
 *   - la validación por `required`/value vacío no cambia.
 *
 * El usuario ve un input: al enfocarlo se despliega la lista completa y, al
 * escribir, se filtran las opciones por nombre (ignorando acentos). Al elegir
 * una opción se guarda su value (ID), no el texto.
 *
 * Uso:
 *   import { makeSearchableSelect } from '../utils/searchableSelect.js'
 *   const combo = makeSearchableSelect(document.querySelector('#mi-select'))
 *   combo.setValue(42)         // selección programática (actualiza texto + value)
 *   combo.getValue()           // '42'
 *   combo.refresh()            // re-leer opciones si el <select> se repobló
 *
 * @param {HTMLSelectElement} selectEl
 * @param {{placeholder?: string, onChange?: (value:string)=>void}} [opts]
 * @returns {{setValue:(v:any)=>void, getValue:()=>string, refresh:()=>void}|null}
 */
export function makeSearchableSelect(selectEl, opts = {}) {
  if (!selectEl || selectEl.dataset.searchable === '1') return null
  selectEl.dataset.searchable = '1'

  const firstOpt = selectEl.options[0]
  const placeholder = opts.placeholder
    || (firstOpt && firstOpt.value === '' ? firstOpt.textContent.trim() : 'Buscar...')

  const readOptions = () =>
    Array.from(selectEl.options).map(o => ({ value: o.value, label: o.textContent.trim() }))
  let options = readOptions()

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const labelFor = v => (options.find(o => o.value === String(v)) || {}).label || ''
  const escAttr = s => String(s).replace(/"/g, '&quot;')
  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // -- DOM -------------------------------------------------------------------
  const wrap  = document.createElement('div')
  wrap.className = 'ss-combo'
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'ss-input'
  input.placeholder = placeholder
  input.autocomplete = 'off'
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-expanded', 'false')
  const list = document.createElement('ul')
  list.className = 'ss-list'
  list.style.display = 'none'

  selectEl.style.display = 'none'
  selectEl.parentNode.insertBefore(wrap, selectEl)
  wrap.appendChild(input)
  wrap.appendChild(selectEl)   // el <select> oculto vive dentro del wrapper
  wrap.appendChild(list)

  if (selectEl.disabled) input.disabled = true

  function syncInputToSelect() {
    input.value = selectEl.value === '' ? '' : labelFor(selectEl.value)
  }

  function render(filtro = '') {
    const f = norm(filtro)
    const matches = options.filter(o => !f || norm(o.label).includes(f))
    list.innerHTML = matches.length
      ? matches.map(o =>
          `<li class="ss-item${o.value === '' ? ' ss-placeholder' : ''}" data-val="${escAttr(o.value)}">${escHtml(o.label)}</li>`
        ).join('')
      : '<li class="ss-empty">Sin coincidencias</li>'
  }

  function open() {
    if (input.disabled) return
    input.select()
    render('')
    list.style.display = ''
    input.setAttribute('aria-expanded', 'true')
  }
  function close() {
    list.style.display = 'none'
    input.setAttribute('aria-expanded', 'false')
  }

  function setValue(v) {
    selectEl.value = (v == null) ? '' : String(v)
    syncInputToSelect()
  }

  input.addEventListener('focus', open)
  input.addEventListener('input', () => {
    render(input.value)
    list.style.display = ''
    input.setAttribute('aria-expanded', 'true')
  })
  // mousedown (antes del blur) para que el clic registre la seleccion.
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('.ss-item')
    if (!li) return
    e.preventDefault()
    selectEl.value = li.dataset.val
    syncInputToSelect()
    close()
    selectEl.dispatchEvent(new Event('change', { bubbles: true }))
    if (opts.onChange) opts.onChange(selectEl.value)
  })
  input.addEventListener('blur', () => {
    // Si el texto no corresponde a una seleccion valida, restaurar el de la
    // opcion elegida (o vaciar). Pequeno retardo para no competir con mousedown.
    setTimeout(() => { syncInputToSelect(); close() }, 120)
  })

  syncInputToSelect()

  return {
    setValue,
    getValue: () => selectEl.value,
    refresh: () => { options = readOptions(); syncInputToSelect() },
  }
}
