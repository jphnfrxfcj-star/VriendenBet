'use client'

import { useState, useTransition, type ComponentProps, type ReactNode } from 'react'

type Props = Omit<ComponentProps<'form'>, 'action' | 'onSubmit' | 'children'> & {
  action: (data: FormData) => Promise<unknown>
  children: ReactNode
}

/** Keep entered values on errors and prevent duplicate submissions. */
export function AdminForm({ action, children, ...props }: Props) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  return <form {...props} aria-busy={pending} onChange={() => setMessage('')} onSubmit={(event) => {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter)
    setMessage(''); setFailed(false)
    startTransition(async () => {
      try {
        const result = await action(data)
        if (result && typeof result === 'object' && 'ok' in result && 'message' in result && typeof result.message === 'string') {
          setFailed(result.ok === false)
          setMessage(result.message)
        } else {
          setMessage('Gelukt.')
        }
      } catch {
        setFailed(true)
        setMessage('Opslaan is niet gelukt. Controleer je invoer en probeer opnieuw. Je wijzigingen staan nog in het formulier.')
      }
    })
  }}>
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {(pending || message) && <p role={failed ? 'alert' : 'status'} className={`col-span-full text-sm font-bold ${failed ? 'text-destructive' : 'text-primary'}`}>{pending ? 'Bezig met opslaan…' : message}</p>}
  </form>
}
