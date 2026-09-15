'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MAX_CSV_BYTES, matchParticipant, parseParticipantCsv, parseScore, type CsvRow } from '@/lib/csv-import'
import { importParticipants } from './import-action'

type ImportRow = CsvRow & { target: string; included: boolean }
type Participant = { id: string; name: string; nickname: string | null; scores: Record<string, number> }
export function CsvImport({ participants }: { participants: Participant[] }) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [overwrite, setOverwrite] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const fileVersion = useRef(0)
  const [fileKey, setFileKey] = useState(0)
  const router = useRouter()
  const selected = rows.filter((r) => r.included)
  const invalid = selected.reduce((sum, r) => sum + Object.values(r.scores).filter((s) => Number.isNaN(parseScore(s))).length, 0)
  const unresolved = selected.filter((r) => !r.target).length
  const targets = selected.map((r) => r.target === 'new' ? `new:${r.name.toLowerCase()}` : r.target)
  const duplicates = new Set(targets).size !== targets.length
  function update(index: number, change: Partial<ImportRow>) {
    setRows((current) => current.map((r, i) => i === index ? { ...r, ...change } : r))
    setMessage('')
  }
  return <div className="grid gap-4">
    <p className="text-sm text-muted-foreground">Upload je Google Forms- of Excel-CSV. Koppel namen, controleer scores en sla alles in één keer op. Alleen namen, shirtmaten en ratingparameters worden gebruikt.</p>
    <label className="grid gap-2 text-sm font-bold">CSV kiezen (max. 200 kB)
      <Input key={fileKey} type="file" accept=".csv,text/csv" disabled={pending} onChange={async (event) => {
        const version = ++fileVersion.current
        const file = event.target.files?.[0]
        setRows([]); setMessage('')
        if (!file) return
        try {
          if (file.size > MAX_CSV_BYTES) throw new Error('Kies een CSV van maximaal 200 kB.')
          const parsed = parseParticipantCsv(await file.text())
          if (version !== fileVersion.current) return
          setRows(parsed.rows.map((row) => ({ ...row, included: true, target: matchParticipant(row.name, participants) })))
        } catch (error) { if (version === fileVersion.current) setMessage(error instanceof Error ? error.message : 'Bestand lezen mislukt.') }
      }} />
    </label>
    {rows.length > 0 && <>
      <fieldset disabled={pending} className="grid min-w-0 gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overwrite} onChange={(e) => { setOverwrite(e.target.checked); setMessage('') }} />Bestaande scores en shirtmaten overschrijven</label>
        <p className="text-sm text-muted-foreground">{overwrite ? 'Bestaande waarden worden vervangen door de ingevulde CSV-waarden.' : 'Bestaande scores en shirtmaten blijven behouden. Alleen ontbrekende waarden worden aangevuld.'} Lege scores worden overgeslagen. Scores van 0 tot 10, inclusief decimalen, zijn toegestaan. De schaal wordt waar nodig uitgebreid.</p>
        <Button type="button" variant="secondary" onClick={() => {
          setRows((current) => current.map((row) => row.included && !row.target ? { ...row, target: 'new' } : row))
          setMessage('')
        }}>Ongekoppelde namen als nieuwe deelnemers toevoegen</Button>
        <p className="text-sm font-bold">{selected.length} deelnemers geselecteerd · {unresolved} te koppelen · {invalid} scores te corrigeren</p>
        {duplicates && <p role="alert">Een deelnemer is meerdere keren gekoppeld. Pas de koppeling aan.</p>}
        {rows.map((row, index) => {
          const existingScores = participants.find((p) => p.id === row.target)?.scores ?? {}
          const errors = Object.values(row.scores).filter((s) => Number.isNaN(parseScore(s))).length
          return <div key={index} className="grid gap-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={row.included} onChange={(e) => update(index, { included: e.target.checked })} />{row.name}</label>
              <label className="grid gap-1 text-sm">Koppelen aan
                <Select value={row.target} onChange={(e) => update(index, { target: e.target.value })} disabled={!row.included}>
                  <option value="">Kies deelnemer…</option>
                  <option value="new">Nieuwe deelnemer aanmaken</option>
                  {participants.map((p) => <option key={p.id} value={p.id}>{p.name}{p.nickname ? ` (${p.nickname})` : ''}</option>)}
                </Select>
              </label>
              {row.shirtSize && <span className="text-sm">Shirt: {row.shirtSize}</span>}
            </div>
            <details open={errors > 0 ? true : undefined}>
              <summary className="cursor-pointer text-sm font-bold">Scores bekijken{errors > 0 ? ` · ${errors} corrigeren of leegmaken om over te slaan` : ''}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(row.scores).map(([name, raw]) => <label key={name} className="grid gap-1 text-sm">{name}
                  <Input value={raw} disabled={!row.included} inputMode="decimal" aria-invalid={Number.isNaN(parseScore(raw))} onChange={(e) => update(index, { scores: { ...row.scores, [name]: e.target.value } })} />
                  {existingScores[name] !== undefined && <span className="text-xs text-muted-foreground">Huidig: {existingScores[name]} · {overwrite && raw.trim() ? 'wordt vervangen' : 'blijft behouden'}</span>}
                  {Number.isNaN(parseScore(raw)) && <span className="text-destructive">Vul 0–10 in of maak leeg om over te slaan.</span>}
                </label>)}
              </div>
            </details>
          </div>
        })}
      </fieldset>
      <Button disabled={pending || !selected.length || invalid > 0 || unresolved > 0 || duplicates} onClick={() => startTransition(async () => {
        try {
          const result = await importParticipants({ overwrite, rows: selected.map((r) => ({ name: r.name, participantId: r.target === 'new' ? null : r.target, shirtSize: r.shirtSize, scores: Object.fromEntries(Object.entries(r.scores).filter(([, raw]) => parseScore(raw) !== null).map(([name, raw]) => [name, parseScore(raw)])) })) })
          setMessage(result.message)
          if (result.ok) { setRows([]); setFileKey((current) => current + 1); router.refresh() }
        } catch { setMessage('Importeren is niet gelukt. Vernieuw de pagina en probeer opnieuw.') }
      })}>{pending ? 'Bezig met importeren…' : `${selected.length} deelnemers importeren`}</Button>
    </>}
    {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
  </div>
}
