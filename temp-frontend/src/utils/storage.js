const PREFIX = 'atara_filters_'

export function saveFilters(pageKey, filters) {
  try {
    sessionStorage.setItem(PREFIX + pageKey, JSON.stringify(filters))
  } catch {}
}

export function loadFilters(pageKey) {
  try {
    return JSON.parse(sessionStorage.getItem(PREFIX + pageKey)) || {}
  } catch {
    return {}
  }
}

export function clearFilters(pageKey) {
  sessionStorage.removeItem(PREFIX + pageKey)
}
