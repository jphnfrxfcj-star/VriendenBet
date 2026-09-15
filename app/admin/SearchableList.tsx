'use client'

import { useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'

export function SearchableList({ items, label }: { items: { id: string; search: string; content: ReactNode }[]; label: string }) {
  const [query, setQuery] = useState('')
  const matches = items.filter((item) => item.search.toLocaleLowerCase('nl').includes(query.trim().toLocaleLowerCase('nl')))
  return <div className="grid gap-3">
    <label className="grid gap-2 text-sm font-bold">{label}<Input type="search" placeholder="Typ een naam…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <p className="text-xs text-muted-foreground" role="status">{matches.length} van {items.length} zichtbaar</p>
    {items.map((item) => <div key={item.id} hidden={!matches.includes(item)}>{item.content}</div>)}
    {!matches.length && <p className="text-sm text-muted-foreground">Geen resultaten voor deze zoekopdracht.</p>}
  </div>
}
