'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteAdminItem } from './delete-actions'

export function DeleteButton({ kind, id, name, consequences }: { kind: string; id: string; name: string; consequences: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return <div className="col-span-full grid justify-items-start gap-2">
    {!confirming ? <Button type="button" variant="ghost" onClick={() => { setConfirming(true); setMessage('') }} className="gap-2 text-destructive"><Trash2 className="size-4" />Verwijderen</Button> : <div className="grid w-full gap-3 rounded-md border border-destructive/50 p-3">
      <p className="text-sm"><strong>‘{name}’ verwijderen?</strong> {consequences} Dit kan niet ongedaan worden gemaakt.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" disabled={pending} onClick={() => startTransition(async () => {
          try {
            const result = await deleteAdminItem(kind, id)
            setMessage(result.message)
            if (result.ok) setConfirming(false)
          } catch { setMessage('Verwijderen is niet gelukt. Controleer of je nog ingelogd bent als beheerder.') }
        })}>{pending ? 'Bezig…' : 'Ja, verwijderen'}</Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => { setConfirming(false); setMessage('') }}>Behouden</Button>
      </div>
    </div>}
    {message && <p role="status" className="text-sm font-bold">{message}</p>}
  </div>
}
