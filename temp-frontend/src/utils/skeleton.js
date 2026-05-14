export function skeletonPage() {
  return `
    <div class="sk-page">
      <div class="sk sk-title" style="width:38%"></div>
      <div class="sk sk-line"  style="width:60%;margin-bottom:28px"></div>
      <div class="sk-card">
        <div class="sk sk-line" style="width:80%"></div>
        <div class="sk sk-line" style="width:65%"></div>
        <div class="sk sk-line" style="width:72%"></div>
      </div>
      <div class="sk-card" style="margin-top:16px">
        ${skeletonRows(5, 4)}
      </div>
    </div>`
}

export function skeletonRows(rows = 5, cols = 4) {
  const row = `<div class="sk-row">${'<div class="sk sk-cell"></div>'.repeat(cols)}</div>`
  return row.repeat(rows)
}

export function skeletonCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="sk-card">
      <div class="sk sk-title" style="width:55%"></div>
      <div class="sk sk-line"  style="width:80%"></div>
      <div class="sk sk-line"  style="width:60%"></div>
    </div>`).join('')
}
