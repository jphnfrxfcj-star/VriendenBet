import { z } from 'zod'
import { csvParameters } from './parameters'

export const MAX_CSV_BYTES = 200_000
export const normalizeName = (name: string) => name.trim().toLocaleLowerCase('nl').replace(/\s+/g, ' ')
const aliases: Record<string, string> = {
  'bereheidheid om te neuken': 'bereidheid om te neuken',
  testoteron: 'testosteron',
  geluk: 'Lucky factor',
}
export function parameterName(header: string) {
  const key = normalizeName(header)
  return aliases[key] ?? csvParameters.find((name) => normalizeName(name) === key)
}

/** Quoted CSV, including escaped quotes, CRLF and multiline fields. */
export function readCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new Error('Kies een CSV van maximaal 200 kB.')
  text = text.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0]
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false, closed = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
    } else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(field.trim()); field = ''; closed = false
      if (char !== delimiter) {
        if (row.some(Boolean)) rows.push(row)
        row = []
        if (char === '\r' && text[i + 1] === '\n') i++
      }
    } else if (char === '"' && !field && !closed) quoted = true
    else if (closed || char === '"') throw new Error('Ongeldige aanhalingstekens in de CSV.')
    else field += char
  }
  if (quoted) throw new Error('Een aanhalingsteken in de CSV is niet afgesloten.')
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export type CsvRow = { name: string; shirtSize: string; scores: Record<string, string> }
export function parseParticipantCsv(text: string): { parameters: string[]; rows: CsvRow[] } {
  const [headers, ...data] = readCsv(text)
  if (!headers || !data.length) throw new Error('De CSV bevat geen deelnemers.')
  if (data.length > 200) throw new Error('Importeer maximaal 200 deelnemers tegelijk.')
  const nameIndex = headers.findIndex((h) => ['naam en voornaam', 'naam'].includes(normalizeName(h)))
  const shirtIndex = headers.findIndex((h) => ['maat trui', 'shirtmaat'].includes(normalizeName(h)))
  if (nameIndex < 0) throw new Error('De kolom Naam en Voornaam (of Naam) ontbreekt.')
  const columns = headers.map((h, index) => ({ name: parameterName(h), index })).filter((c) => c.name !== undefined)
  const parameters = columns.map((c) => c.name!)
  if (!parameters.length) throw new Error('Geen herkenbare ratingparameters gevonden.')
  if (new Set(parameters).size !== parameters.length) throw new Error('Een parameter komt meerdere keren voor.')
  const names = new Set<string>()
  const rows = data.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Rij ${index + 2} heeft een afwijkend aantal kolommen.`)
    const name = cells[nameIndex]
    if (!name || name.length > 120) throw new Error(`Controleer de naam op rij ${index + 2}.`)
    if (names.has(normalizeName(name))) throw new Error(`Deelnemer ${name} staat dubbel in de CSV.`)
    names.add(normalizeName(name))
    return { name, shirtSize: shirtIndex < 0 ? '' : cells[shirtIndex], scores: Object.fromEntries(columns.map((c) => [c.name!, cells[c.index]])) }
  })
  return { parameters, rows }
}

export function parseScore(raw: string): number | null {
  if (!raw.trim()) return null
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN
  const score = Number(normalized)
  return score >= 0 && score <= 10 ? score : NaN
}

export function matchParticipant(name: string, participants: { id: string; name: string; nickname: string | null }[]) {
  const key = normalizeName(name)
  const tokens = (s: string) => normalizeName(s).split(' ').sort().join(' ')
  const matches = participants.filter((p) => normalizeName(p.name) === key || (p.nickname && normalizeName(p.nickname) === key) || tokens(p.name) === tokens(name))
  return matches.length === 1 ? matches[0].id : ''
}

export const csvImportSchema = z.object({
  overwrite: z.boolean(),
  rows: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    participantId: z.string().min(1).max(100).nullable(),
    shirtSize: z.string().trim().max(20),
    scores: z.record(z.enum(csvParameters), z.number().finite().min(0).max(10)),
  })).min(1).max(200),
})
export type CsvImport = z.infer<typeof csvImportSchema>
