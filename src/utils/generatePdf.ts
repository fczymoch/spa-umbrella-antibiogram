import { jsPDF } from 'jspdf'
import type { Exam, Patient, Doctor } from '../types.ts'

const PRIMARY = [52, 144, 220] as const   // azul BioLab
const DARK    = [30, 41, 59] as const     // slate-800
const MUTED   = [100, 116, 139] as const  // slate-500
const LIGHT   = [248, 250, 252] as const  // slate-50
const BORDER  = [226, 232, 240] as const  // slate-200
const S_COLOR = { S: [34, 197, 94] as const, I: [234, 179, 8] as const, R: [239, 68, 68] as const }

function interp(i: 'S' | 'I' | 'R') {
  return { S: 'Sensível', I: 'Intermediário', R: 'Resistente' }[i]
}

export function generateAntibiogramPDF(
  exam: Exam,
  patient: Patient | undefined,
  doctor: Doctor | undefined,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const MARGIN = 16
  let y = 0

  /* ── helpers ──────────────────────────────────────────────── */
  const text = (
    str: string,
    x: number,
    yy: number,
    opts?: { size?: number; bold?: boolean; color?: readonly [number, number, number]; align?: 'left' | 'center' | 'right' },
  ) => {
    const { size = 10, bold = false, color = DARK, align = 'left' } = opts ?? {}
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(str, x, yy, { align })
  }

  const hLine = (yy: number, color: readonly [number, number, number] = BORDER) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, yy, W - MARGIN, yy)
  }

  /* ── 1. Header ────────────────────────────────────────────── */
  // Barra azul topo
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 22, 'F')

  text('BioLab', MARGIN, 11, { size: 16, bold: true, color: [255, 255, 255] })
  text('Microbiologia Clínica', MARGIN, 17, { size: 8, color: [186, 230, 253] })
  text('RELATÓRIO DE ANTIBIOGRAMA', W - MARGIN, 14, { size: 10, bold: true, color: [255, 255, 255], align: 'right' })

  y = 30

  /* ── 2. Faixa de ID do exame ──────────────────────────────── */
  doc.setFillColor(...LIGHT)
  doc.rect(MARGIN, y - 4, W - MARGIN * 2, 12, 'F')
  hLine(y - 4)
  hLine(y + 8)
  text(`Exame ID: ${exam.id}`, MARGIN + 3, y + 2, { size: 8, color: MUTED })
  text(
    `Emitido em: ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`,
    W - MARGIN - 3, y + 2, { size: 8, color: MUTED, align: 'right' },
  )
  y += 18

  /* ── 3. Dados do paciente + médico ────────────────────────── */
  const colRight = W / 2 + 2

  // Bloco paciente
  text('PACIENTE', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 5
  text(patient?.name ?? '—', MARGIN, y, { size: 11, bold: true })
  y += 6
  text(`Idade: ${patient?.age ?? '—'} anos   |   Risco: ${patient?.risk ?? '—'}${patient?.cpf ? `   |   CPF: ${patient.cpf}` : ''}`, MARGIN, y, { size: 9, color: MUTED })
  y += 5
  hLine(y, PRIMARY)
  y += 6

  // Bloco médico (lado direito, mesma altura)
  const yMed = y - 17
  text('MÉDICO RESPONSÁVEL', colRight, yMed - 5, { size: 7, bold: true, color: PRIMARY })
  text(doctor?.name ?? '—', colRight, yMed, { size: 11, bold: true })
  text(`${doctor?.specialty ?? '—'}   |   ${doctor?.shift ?? '—'}`, colRight, yMed + 6, { size: 9, color: MUTED })

  /* ── 4. Dados da amostra ──────────────────────────────────── */
  text('DADOS DA AMOSTRA', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 6

  const fields: [string, string][] = [
    ['Micro-organismo', exam.organism],
    ['Sítio de coleta', exam.site],
    ['Tipo de amostra', exam.specimen],
    ['Coletado em', exam.collectedAt],
    ['Status', exam.status],
    ['Fonte', exam.source],
  ]

  const half = Math.ceil(fields.length / 2)
  const startY = y
  fields.forEach(([label, value], idx) => {
    const col = idx < half ? MARGIN : colRight
    const rowY = startY + (idx % half) * 8
    text(label, col, rowY, { size: 7, color: MUTED })
    text(value, col, rowY + 4, { size: 9 })
  })

  y = startY + half * 8 + 4
  hLine(y)
  y += 8

  /* ── 5. Notas clínicas ────────────────────────────────────── */
  if (exam.notes) {
    text('NOTAS CLÍNICAS', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
    y += 5
    const lines = doc.splitTextToSize(exam.notes, W - MARGIN * 2)
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(lines, MARGIN, y)
    y += lines.length * 5 + 4
    hLine(y)
    y += 8
  }

  /* ── 6. Tabela de antibiograma ────────────────────────────── */
  text('RESULTADO DO ANTIBIOGRAMA', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 6

  // Cabeçalho da tabela
  const colW = [90, 40, 48]
  const rowH = 8
  doc.setFillColor(...PRIMARY)
  doc.rect(MARGIN, y - 5, W - MARGIN * 2, rowH, 'F')
  text('Antibiótico', MARGIN + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  text('CIM (μg/mL)', MARGIN + colW[0] + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  text('Interpretação', MARGIN + colW[0] + colW[1] + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  y += rowH

  // Linhas
  exam.antibiogram.forEach((entry, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT)
      doc.rect(MARGIN, y - 5, W - MARGIN * 2, rowH, 'F')
    }
    hLine(y + 3, BORDER)

    text(entry.antibiotic, MARGIN + 2, y, { size: 9 })
    text(entry.mic, MARGIN + colW[0] + 2, y, { size: 9 })

    // Badge colorido
    const col = S_COLOR[entry.interpretation]
    doc.setFillColor(col[0], col[1], col[2], )
    doc.roundedRect(MARGIN + colW[0] + colW[1], y - 4, 36, 6, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${entry.interpretation} — ${interp(entry.interpretation)}`, MARGIN + colW[0] + colW[1] + 18, y, { align: 'center' })

    y += rowH

    // Nova página se necessário
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  })

  y += 6
  hLine(y, PRIMARY)
  y += 10

  /* ── 7. Rodapé ────────────────────────────────────────────── */
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = 290
    hLine(footerY - 4, BORDER)
    text('BioLab — Sistema de Gestão de Antibiogramas', MARGIN, footerY, { size: 7, color: MUTED })
    text(
      `Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')} — Página ${p} de ${totalPages}`,
      W - MARGIN, footerY, { size: 7, color: MUTED, align: 'right' },
    )
  }

  /* ── 8. Salvar ────────────────────────────────────────────── */
  const filename = `Antibiograma_${(patient?.name ?? 'paciente').replace(/\s+/g, '_')}_${exam.id}.pdf`
  doc.save(filename)
}

/** Retorna um Blob do PDF (para usar em <iframe src=objectURL>) */
export function buildAntibiogramPDFBlob(
  exam: Exam,
  patient: Patient | undefined,
  doctor: Doctor | undefined,
): string {
  // Gera o mesmo documento mas retorna object URL ao invés de salvar
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const MARGIN = 16
  let y = 0

  const text = (
    str: string,
    x: number,
    yy: number,
    opts?: { size?: number; bold?: boolean; color?: readonly [number, number, number]; align?: 'left' | 'center' | 'right' },
  ) => {
    const { size = 10, bold = false, color = DARK, align = 'left' } = opts ?? {}
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(str, x, yy, { align })
  }
  const hLine = (yy: number, color: readonly [number, number, number] = BORDER) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, yy, W - MARGIN, yy)
  }

  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 22, 'F')
  text('BioLab', MARGIN, 11, { size: 16, bold: true, color: [255, 255, 255] })
  text('Microbiologia Clínica', MARGIN, 17, { size: 8, color: [186, 230, 253] })
  text('RELATÓRIO DE ANTIBIOGRAMA', W - MARGIN, 14, { size: 10, bold: true, color: [255, 255, 255], align: 'right' })
  y = 30

  doc.setFillColor(...LIGHT)
  doc.rect(MARGIN, y - 4, W - MARGIN * 2, 12, 'F')
  hLine(y - 4); hLine(y + 8)
  text(`Exame ID: ${exam.id}`, MARGIN + 3, y + 2, { size: 8, color: MUTED })
  text(`Emitido em: ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`, W - MARGIN - 3, y + 2, { size: 8, color: MUTED, align: 'right' })
  y += 18

  const colRight = W / 2 + 2
  text('PACIENTE', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 5
  text(patient?.name ?? '—', MARGIN, y, { size: 11, bold: true })
  y += 6
  text(`Idade: ${patient?.age ?? '—'} anos   |   Risco: ${patient?.risk ?? '—'}${patient?.cpf ? `   |   CPF: ${patient.cpf}` : ''}`, MARGIN, y, { size: 9, color: MUTED })
  y += 5
  hLine(y, PRIMARY)
  y += 6

  const yMed = y - 17
  text('MÉDICO RESPONSÁVEL', colRight, yMed - 5, { size: 7, bold: true, color: PRIMARY })
  text(doctor?.name ?? '—', colRight, yMed, { size: 11, bold: true })
  text(`${doctor?.specialty ?? '—'}   |   ${doctor?.shift ?? '—'}`, colRight, yMed + 6, { size: 9, color: MUTED })

  text('DADOS DA AMOSTRA', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 6
  const fields: [string, string][] = [
    ['Micro-organismo', exam.organism], ['Sítio de coleta', exam.site],
    ['Tipo de amostra', exam.specimen], ['Coletado em', exam.collectedAt],
    ['Status', exam.status], ['Fonte', exam.source],
  ]
  const half = Math.ceil(fields.length / 2)
  const startY = y
  fields.forEach(([label, value], idx) => {
    const col = idx < half ? MARGIN : colRight
    const rowY = startY + (idx % half) * 8
    text(label, col, rowY, { size: 7, color: MUTED })
    text(value, col, rowY + 4, { size: 9 })
  })
  y = startY + half * 8 + 4
  hLine(y); y += 8

  if (exam.notes) {
    text('NOTAS CLÍNICAS', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
    y += 5
    const lines = doc.splitTextToSize(exam.notes, W - MARGIN * 2)
    doc.setFontSize(9); doc.setTextColor(...DARK)
    doc.text(lines, MARGIN, y)
    y += lines.length * 5 + 4
    hLine(y); y += 8
  }

  text('RESULTADO DO ANTIBIOGRAMA', MARGIN, y, { size: 7, bold: true, color: PRIMARY })
  y += 6
  const colW = [90, 40, 48]
  const rowH = 8
  doc.setFillColor(...PRIMARY)
  doc.rect(MARGIN, y - 5, W - MARGIN * 2, rowH, 'F')
  text('Antibiótico', MARGIN + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  text('CIM (μg/mL)', MARGIN + colW[0] + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  text('Interpretação', MARGIN + colW[0] + colW[1] + 2, y, { size: 8, bold: true, color: [255, 255, 255] })
  y += rowH

  exam.antibiogram.forEach((entry, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(MARGIN, y - 5, W - MARGIN * 2, rowH, 'F') }
    hLine(y + 3, BORDER)
    text(entry.antibiotic, MARGIN + 2, y, { size: 9 })
    text(entry.mic, MARGIN + colW[0] + 2, y, { size: 9 })
    const col = S_COLOR[entry.interpretation]
    doc.setFillColor(col[0], col[1], col[2])
    doc.roundedRect(MARGIN + colW[0] + colW[1], y - 4, 36, 6, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(`${entry.interpretation} — ${interp(entry.interpretation)}`, MARGIN + colW[0] + colW[1] + 18, y, { align: 'center' })
    y += rowH
    if (y > 270) { doc.addPage(); y = 20 }
  })

  y += 6; hLine(y, PRIMARY); y += 10
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = 290
    hLine(footerY - 4, BORDER)
    text('BioLab — Sistema de Gestão de Antibiogramas', MARGIN, footerY, { size: 7, color: MUTED })
    text(`Gerado em ${new Date().toLocaleString('pt-BR')} — Página ${p} de ${totalPages}`, W - MARGIN, footerY, { size: 7, color: MUTED, align: 'right' })
  }

  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
