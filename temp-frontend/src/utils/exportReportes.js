/**
 * Exportación de reportes a PDF y Excel.
 *
 * Diseño:
 *  - PDF: portada con metadatos, KPIs, gráficos como imágenes (chart.toBase64Image),
 *    tablas con jspdf-autotable, insights formateados, pie de página con paginación.
 *  - Excel: libro con 4 hojas — Resumen, Ejes, Estudiantes, Alertas.
 *
 * El módulo no acopla a chart.js directamente: recibe el objeto `data` con todos
 * los cálculos ya hechos por reportes.js (ejes, tipoAvgs, promedios, alertas,
 * kpis, alcance) y referencias a los canvas para extraer las imágenes.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

const ATARA_RED = [153, 0, 0]
const TEXT_DARK = [31, 41, 55]
const TEXT_MUTED = [107, 114, 128]
const BORDER_LIGHT = [229, 231, 235]
const SCALE_LABELS = ['', 'Inicial', 'En desarrollo', 'Intermedio', 'Logrado', 'Avanzado']

function fmtNum(v, dec = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isInteger(n) ? String(n) : n.toFixed(dec)
}

function fmtFecha() {
  return new Date().toLocaleString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function nivelDesdePromedio(v) {
  if (v === null || v === undefined) return '—'
  const n = parseFloat(v)
  if (n <= 2.0) return 'Alta'
  if (n <= 3.0) return 'Media'
  return 'Sin alerta'
}

// ──────────────────────────────────────────────────────────────────────────
// PDF
// ──────────────────────────────────────────────────────────────────────────

export function exportarPDF({ alcance, periodoNombre, kpis, ejes, tipoAvgs, promedios, alertas, insights, charts }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // ── Header bar (banda roja con título) ────────────────────────────────
  doc.setFillColor(...ATARA_RED)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('ATARA', margin, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Sistema de Alerta Temprana y Atención al Rendimiento Académico', margin, 19)
  doc.setFontSize(7)
  doc.text('CIDE — División de Educación Básica, UNA Costa Rica', margin, 24)

  // Fecha de generación en la esquina derecha del header
  doc.setFontSize(8)
  doc.text(fmtFecha(), pageWidth - margin, 13, { align: 'right' })

  // ── Bloque de título del reporte ─────────────────────────────────────
  let y = 38
  doc.setTextColor(...TEXT_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Reporte de análisis pedagógico', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Período: ${periodoNombre}`, margin, y)
  y += 5
  doc.text(`Alcance: ${alcance}`, margin, y)
  y += 8

  // ── KPIs como cuadrícula ──────────────────────────────────────────────
  doc.setDrawColor(...BORDER_LIGHT)
  const kpiW = (pageWidth - margin * 2 - 10) / 5
  const kpiH = 18
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 2.5)
    doc.setFillColor(...hexToRgb(k.bg))
    doc.roundedRect(x, y, kpiW, kpiH, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(k.col))
    doc.text(String(k.val), x + kpiW / 2, y + 8, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(k.label, x + kpiW / 2, y + 14, { align: 'center', maxWidth: kpiW - 2 })
  })
  y += kpiH + 8

  // ── Gráficos como imágenes ────────────────────────────────────────────
  y = embebirGrafico(doc, charts.ejes, 'Promedios por eje temático', y, margin, pageWidth, pageHeight)
  y = embebirGrafico(doc, charts.tipo, 'Tipos de saber', y, margin, pageWidth, pageHeight)
  y = embebirGrafico(doc, charts.alertas, 'Distribución de alertas', y, margin, pageWidth, pageHeight)
  if (charts.estudiantes) y = embebirGrafico(doc, charts.estudiantes, 'Promedio por estudiante', y, margin, pageWidth, pageHeight, 90)
  if (charts.ranking)     y = embebirGrafico(doc, charts.ranking, 'Estudiantes con más alertas', y, margin, pageWidth, pageHeight, 90)

  // ── Tabla: detalle de ejes ────────────────────────────────────────────
  if (y > pageHeight - 60) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Detalle por eje temático', margin, y)
  y += 3

  autoTable(doc, {
    startY: y + 2,
    head: [['Eje', 'Tipo de saber', 'Promedio', 'Nivel', 'Categoría']],
    body: ejes.map(e => [
      e.nombre,
      e.tipoNombre,
      fmtNum(e.avg),
      e.avg !== null ? (SCALE_LABELS[Math.round(e.avg)] ?? '—') : '—',
      nivelDesdePromedio(e.avg),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: ATARA_RED, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const v = data.cell.raw
        if (v === 'Alta')  { data.cell.styles.textColor = [220, 38, 38];  data.cell.styles.fontStyle = 'bold' }
        if (v === 'Media') { data.cell.styles.textColor = [217, 119, 6];  data.cell.styles.fontStyle = 'bold' }
        if (v === 'Sin alerta') data.cell.styles.textColor = [22, 163, 74]
      }
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Tabla: promedios por estudiante ──────────────────────────────────
  if (y > pageHeight - 60) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Promedios por estudiante', margin, y)
  y += 3

  autoTable(doc, {
    startY: y + 2,
    head: [['Estudiante', 'Promedio global', 'Alertas altas', 'Alertas medias']],
    body: promedios
      .slice()
      .sort((a, b) => parseFloat(a.promedioGlobal ?? 0) - parseFloat(b.promedioGlobal ?? 0))
      .map(p => [
        p.estudianteNombreCompleto,
        fmtNum(p.promedioGlobal),
        p.totalAlertasAltas || 0,
        p.totalAlertasMedias || 0,
      ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: ATARA_RED, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Insights ──────────────────────────────────────────────────────────
  if (insights.length) {
    if (y > pageHeight - 40) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...TEXT_DARK)
    doc.text('Conclusiones automáticas', margin, y)
    y += 6

    insights.forEach(i => {
      if (y > pageHeight - 30) { doc.addPage(); y = 20 }
      // Caja izquierda con color del insight
      doc.setFillColor(...hexToRgb(i.color || '#6b7280'))
      doc.rect(margin, y - 3, 1.5, 14, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_DARK)
      doc.text(i.title, margin + 4, y + 1)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_MUTED)
      const text = stripHtml(i.text)
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 6)
      doc.text(lines, margin + 4, y + 6)
      y += 6 + lines.length * 4 + 4
    })
  }

  // ── Pie de página en todas las hojas ─────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...BORDER_LIGHT)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('ATARA — Reporte generado automáticamente', margin, pageHeight - 7)
    doc.text(`Página ${i} de ${total}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  doc.save(`ATARA_Reporte_${slugify(alcance)}_${stamp()}.pdf`)
}

function embebirGrafico(doc, canvas, titulo, y, margin, pageW, pageH, alto = 70) {
  if (!canvas) return y
  const ancho = pageW - margin * 2
  if (y + alto + 15 > pageH - 15) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_DARK)
  doc.text(titulo, margin, y)
  y += 4
  try {
    const img = canvas.toDataURL('image/png', 1.0)
    doc.addImage(img, 'PNG', margin, y, ancho, alto)
  } catch {
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('(No se pudo embeber el gráfico)', margin, y + 5)
  }
  return y + alto + 6
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
}

function stamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

// ──────────────────────────────────────────────────────────────────────────
// Excel
// ──────────────────────────────────────────────────────────────────────────

// Paleta corporativa ATARA para Excel
const XLS_RED       = 'FF990000'
const XLS_RED_SOFT  = 'FFFEE2E2'
const XLS_ORANGE    = 'FFD97706'
const XLS_ORANGE_SF = 'FFFEF3C7'
const XLS_GREEN     = 'FF16A34A'
const XLS_GREEN_SF  = 'FFDCFCE7'
const XLS_BLUE      = 'FF1E40AF'
const XLS_BLUE_SF   = 'FFEFF6FF'
const XLS_PURPLE    = 'FF7C3AED'
const XLS_PURPLE_SF = 'FFFAF5FF'
const XLS_GRAY_DARK = 'FF1F2937'
const XLS_GRAY_MED  = 'FF6B7280'
const XLS_GRAY_BG   = 'FFF9FAFB'
const XLS_BORDER    = 'FFE5E7EB'

const KPI_PALETTE = [
  { bg: XLS_BLUE_SF,   fg: XLS_BLUE   },
  { bg: XLS_PURPLE_SF, fg: XLS_PURPLE },
  { bg: XLS_RED_SOFT,  fg: XLS_RED    },
  { bg: XLS_ORANGE_SF, fg: XLS_ORANGE },
  { bg: XLS_GREEN_SF,  fg: XLS_GREEN  },
]

function thinBorder(color = XLS_BORDER) {
  return {
    top:    { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    left:   { style: 'thin', color: { argb: color } },
    right:  { style: 'thin', color: { argb: color } },
  }
}

function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function colorAlerta(v) {
  if (v === null || v === undefined) return { bg: XLS_GRAY_BG, fg: XLS_GRAY_MED }
  const n = parseFloat(v)
  if (n <= 2.0) return { bg: XLS_RED_SOFT,    fg: XLS_RED    }
  if (n <= 3.0) return { bg: XLS_ORANGE_SF,   fg: XLS_ORANGE }
  return                { bg: XLS_GREEN_SF,   fg: XLS_GREEN  }
}

export async function exportarExcel({ alcance, periodoNombre, kpis, ejes, tipoAvgs, promedios, alertas, insights }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ATARA'
  wb.created = new Date()

  // ════════════════════════════════════════════════════════════════════
  // HOJA 1: RESUMEN (dashboard)
  // ════════════════════════════════════════════════════════════════════
  const ws = wb.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 16 },
  })
  ws.columns = [
    { width: 4 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 4 },
  ]

  // Banda roja del header
  ws.mergeCells('B2:F2')
  const headerCell = ws.getCell('B2')
  headerCell.value = 'ATARA'
  headerCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
  headerCell.fill = fill(XLS_RED)
  headerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 34

  ws.mergeCells('B3:F3')
  const subCell = ws.getCell('B3')
  subCell.value = 'Sistema de Alerta Temprana y Atención al Rendimiento Académico'
  subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: XLS_GRAY_MED } }
  subCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(3).height = 16

  // Título del reporte
  ws.mergeCells('B5:F5')
  const titleCell = ws.getCell('B5')
  titleCell.value = 'Reporte de análisis pedagógico'
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: XLS_GRAY_DARK } }
  ws.getRow(5).height = 24

  // Metadata
  const meta = [
    ['Período',  periodoNombre],
    ['Alcance',  alcance],
    ['Generado', fmtFecha()],
  ]
  meta.forEach(([label, value], i) => {
    const row = 7 + i
    ws.getCell(`B${row}`).value = label
    ws.getCell(`B${row}`).font  = { bold: true, color: { argb: XLS_GRAY_MED }, size: 10 }
    ws.mergeCells(`C${row}:F${row}`)
    ws.getCell(`C${row}`).value = value
    ws.getCell(`C${row}`).font  = { color: { argb: XLS_GRAY_DARK }, size: 10 }
  })

  // KPIs (cuadrícula de 5 cards)
  const kpiRowStart = 12
  ws.mergeCells(`B${kpiRowStart}:F${kpiRowStart}`)
  const kpiTitle = ws.getCell(`B${kpiRowStart}`)
  kpiTitle.value = 'INDICADORES'
  kpiTitle.font = { bold: true, size: 11, color: { argb: XLS_GRAY_DARK } }
  ws.getCell(`B${kpiRowStart}`).border = { bottom: { style: 'thin', color: { argb: XLS_BORDER } } }

  const kpiNumRow = kpiRowStart + 2
  const kpiLblRow = kpiRowStart + 3
  ws.getRow(kpiNumRow).height = 30
  ws.getRow(kpiLblRow).height = 22

  kpis.forEach((k, i) => {
    const col = String.fromCharCode(66 + i) // B, C, D, E, F
    const palette = KPI_PALETTE[i % KPI_PALETTE.length]
    const numCell = ws.getCell(`${col}${kpiNumRow}`)
    numCell.value = isNaN(Number(k.val)) ? k.val : Number(k.val)
    numCell.font = { bold: true, size: 20, color: { argb: palette.fg } }
    numCell.alignment = { vertical: 'middle', horizontal: 'center' }
    numCell.fill = fill(palette.bg)
    numCell.border = { top: thinBorder().top, left: thinBorder().left, right: thinBorder().right }

    const lblCell = ws.getCell(`${col}${kpiLblRow}`)
    lblCell.value = k.label
    lblCell.font = { bold: true, size: 9, color: { argb: palette.fg } }
    lblCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    lblCell.fill = fill(palette.bg)
    lblCell.border = { bottom: thinBorder().bottom, left: thinBorder().left, right: thinBorder().right }
  })

  // Promedios por tipo de saber
  let rowCursor = kpiLblRow + 3
  ws.mergeCells(`B${rowCursor}:F${rowCursor}`)
  ws.getCell(`B${rowCursor}`).value = 'PROMEDIOS POR TIPO DE SABER'
  ws.getCell(`B${rowCursor}`).font  = { bold: true, size: 11, color: { argb: XLS_GRAY_DARK } }
  ws.getCell(`B${rowCursor}`).border = { bottom: { style: 'thin', color: { argb: XLS_BORDER } } }
  rowCursor += 2

  // Header
  const tipoHeaderRow = ws.getRow(rowCursor)
  tipoHeaderRow.values = [, 'Tipo de saber', 'Promedio (1-5)']
  ;['B', 'C'].forEach(c => {
    const cell = ws.getCell(`${c}${rowCursor}`)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = fill(XLS_RED)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = thinBorder()
  })
  ws.mergeCells(`B${rowCursor}:B${rowCursor}`)
  ws.mergeCells(`C${rowCursor}:D${rowCursor}`)
  rowCursor++

  Object.values(tipoAvgs).forEach(t => {
    ws.mergeCells(`B${rowCursor}:B${rowCursor}`)
    ws.getCell(`B${rowCursor}`).value = t.nombre
    ws.getCell(`B${rowCursor}`).alignment = { vertical: 'middle' }
    ws.getCell(`B${rowCursor}`).border = thinBorder()
    ws.mergeCells(`C${rowCursor}:D${rowCursor}`)
    const v = t.avg !== null ? Number(t.avg.toFixed(2)) : null
    const c = ws.getCell(`C${rowCursor}`)
    c.value = v
    c.numFmt = '0.00'
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.border = thinBorder()
    if (v !== null) {
      const col = colorAlerta(v)
      c.fill = fill(col.bg)
      c.font = { bold: true, color: { argb: col.fg } }
    }
    rowCursor++
  })

  // Insights
  if (insights.length) {
    rowCursor += 2
    ws.mergeCells(`B${rowCursor}:F${rowCursor}`)
    ws.getCell(`B${rowCursor}`).value = 'CONCLUSIONES AUTOMÁTICAS'
    ws.getCell(`B${rowCursor}`).font  = { bold: true, size: 11, color: { argb: XLS_GRAY_DARK } }
    ws.getCell(`B${rowCursor}`).border = { bottom: { style: 'thin', color: { argb: XLS_BORDER } } }
    rowCursor += 2

    insights.forEach(ins => {
      const argb = ins.color ? 'FF' + ins.color.replace('#', '').toUpperCase() : XLS_GRAY_DARK
      // Título
      ws.mergeCells(`B${rowCursor}:F${rowCursor}`)
      const tCell = ws.getCell(`B${rowCursor}`)
      tCell.value = ins.title
      tCell.font = { bold: true, color: { argb }, size: 11 }
      tCell.alignment = { vertical: 'middle' }
      rowCursor++
      // Texto
      ws.mergeCells(`B${rowCursor}:F${rowCursor}`)
      const dCell = ws.getCell(`B${rowCursor}`)
      dCell.value = stripHtml(ins.text)
      dCell.font = { color: { argb: XLS_GRAY_DARK }, size: 10 }
      dCell.alignment = { vertical: 'top', wrapText: true }
      ws.getRow(rowCursor).height = 28
      rowCursor += 2
    })
  }

  // ════════════════════════════════════════════════════════════════════
  // HOJA 2: EJES TEMÁTICOS
  // ════════════════════════════════════════════════════════════════════
  const wsE = wb.addWorksheet('Ejes temáticos', { views: [{ state: 'frozen', ySplit: 1 }] })
  wsE.columns = [
    { header: 'Eje temático',          key: 'eje',     width: 42 },
    { header: 'Tipo de saber',         key: 'tipo',    width: 24 },
    { header: 'Promedio',              key: 'avg',     width: 12, style: { numFmt: '0.00' } },
    { header: 'Nivel cualitativo',     key: 'nivel',   width: 18 },
    { header: 'Categoría de alerta',   key: 'cat',     width: 20 },
  ]
  estilarHeader(wsE)

  ejes.forEach(e => {
    const row = wsE.addRow({
      eje:   e.nombre,
      tipo:  e.tipoNombre,
      avg:   e.avg !== null ? Number(e.avg.toFixed(2)) : null,
      nivel: e.avg !== null ? (SCALE_LABELS[Math.round(e.avg)] ?? '') : '—',
      cat:   nivelDesdePromedio(e.avg),
    })
    row.alignment = { vertical: 'middle' }
    row.eachCell(c => c.border = thinBorder())
    // Color en promedio y categoría
    if (e.avg !== null) {
      const col = colorAlerta(e.avg)
      const avgCell = row.getCell('avg')
      avgCell.fill = fill(col.bg)
      avgCell.font = { bold: true, color: { argb: col.fg } }
      avgCell.alignment = { vertical: 'middle', horizontal: 'center' }
      const catCell = row.getCell('cat')
      catCell.fill = fill(col.bg)
      catCell.font = { bold: true, color: { argb: col.fg } }
      catCell.alignment = { vertical: 'middle', horizontal: 'center' }
    }
  })
  wsE.autoFilter = { from: 'A1', to: `E${wsE.rowCount}` }

  // ════════════════════════════════════════════════════════════════════
  // HOJA 3: ESTUDIANTES
  // ════════════════════════════════════════════════════════════════════
  const wsS = wb.addWorksheet('Estudiantes', { views: [{ state: 'frozen', ySplit: 1 }] })
  wsS.columns = [
    { header: 'Estudiante',       key: 'nombre', width: 38 },
    { header: 'Promedio global',  key: 'avg',    width: 18, style: { numFmt: '0.00' } },
    { header: 'Alertas altas',    key: 'altas',  width: 16 },
    { header: 'Alertas medias',   key: 'medias', width: 16 },
  ]
  estilarHeader(wsS)

  promedios
    .slice()
    .sort((a, b) => parseFloat(a.promedioGlobal ?? 0) - parseFloat(b.promedioGlobal ?? 0))
    .forEach(p => {
      const avg = p.promedioGlobal !== null && p.promedioGlobal !== undefined
        ? Number(parseFloat(p.promedioGlobal).toFixed(2)) : null
      const row = wsS.addRow({
        nombre: p.estudianteNombreCompleto,
        avg,
        altas:  p.totalAlertasAltas  || 0,
        medias: p.totalAlertasMedias || 0,
      })
      row.alignment = { vertical: 'middle' }
      row.eachCell(c => c.border = thinBorder())
      if (avg !== null) {
        const col = colorAlerta(avg)
        const avgCell = row.getCell('avg')
        avgCell.fill = fill(col.bg)
        avgCell.font = { bold: true, color: { argb: col.fg } }
        avgCell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
      // Conteo de alertas con color si > 0
      const altasCell = row.getCell('altas')
      altasCell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (p.totalAlertasAltas > 0) {
        altasCell.fill = fill(XLS_RED_SOFT)
        altasCell.font = { bold: true, color: { argb: XLS_RED } }
      }
      const mediasCell = row.getCell('medias')
      mediasCell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (p.totalAlertasMedias > 0) {
        mediasCell.fill = fill(XLS_ORANGE_SF)
        mediasCell.font = { bold: true, color: { argb: XLS_ORANGE } }
      }
    })
  wsS.autoFilter = { from: 'A1', to: `D${wsS.rowCount}` }

  // ════════════════════════════════════════════════════════════════════
  // HOJA 4: ALERTAS
  // ════════════════════════════════════════════════════════════════════
  const wsA = wb.addWorksheet('Alertas', { views: [{ state: 'frozen', ySplit: 1 }] })
  wsA.columns = [
    { header: 'Estudiante',     key: 'est',     width: 35 },
    { header: 'Materia',        key: 'mat',     width: 24 },
    { header: 'Eje temático',   key: 'eje',     width: 42 },
    { header: 'Nivel',          key: 'nivel',   width: 14 },
    { header: 'Promedio',       key: 'avg',     width: 12, style: { numFmt: '0.00' } },
  ]
  estilarHeader(wsA)

  alertas
    .slice()
    .sort((a, b) => {
      const orden = { ALTA: 0, MEDIA: 1, SIN_ALERTA: 2 }
      return (orden[a.nivelAlerta] ?? 9) - (orden[b.nivelAlerta] ?? 9)
    })
    .forEach(a => {
      const nivel = a.nivelAlerta === 'ALTA' ? 'Alta'
                  : a.nivelAlerta === 'MEDIA' ? 'Media'
                  : 'Sin alerta'
      const avg = a.promedio !== null && a.promedio !== undefined
        ? Number(parseFloat(a.promedio).toFixed(2)) : null
      const row = wsA.addRow({
        est:   a.estudianteNombreCompleto ?? '',
        mat:   a.materiaNombre ?? '',
        eje:   a.ejeNombre ?? '',
        nivel,
        avg,
      })
      row.alignment = { vertical: 'middle' }
      row.eachCell(c => c.border = thinBorder())
      // Pintar columna Nivel
      const nivelCell = row.getCell('nivel')
      nivelCell.alignment = { vertical: 'middle', horizontal: 'center' }
      nivelCell.font = { bold: true }
      if (a.nivelAlerta === 'ALTA')      { nivelCell.fill = fill(XLS_RED_SOFT);    nivelCell.font.color = { argb: XLS_RED }    }
      else if (a.nivelAlerta === 'MEDIA'){ nivelCell.fill = fill(XLS_ORANGE_SF);   nivelCell.font.color = { argb: XLS_ORANGE } }
      else                                { nivelCell.fill = fill(XLS_GREEN_SF);    nivelCell.font.color = { argb: XLS_GREEN }  }
      if (avg !== null) {
        const col = colorAlerta(avg)
        const c = row.getCell('avg')
        c.fill = fill(col.bg)
        c.font = { bold: true, color: { argb: col.fg } }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  wsA.autoFilter = { from: 'A1', to: `E${wsA.rowCount}` }

  // ── Descarga ─────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ATARA_Reporte_${slugify(alcance)}_${stamp()}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function estilarHeader(ws) {
  const headerRow = ws.getRow(1)
  headerRow.height = 24
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = fill(XLS_RED)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = thinBorder('FF7F1D1D')
  })
}
