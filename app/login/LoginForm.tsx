'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { users } from '@/lib/demo-data'

type LoginValues = {
  displayName: string
  pin: string
}

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const { register, handleSubmit } = useForm<LoginValues>({
    defaultValues: { displayName: 'Miel', pin: '' },
  })

  function onSubmit(values: LoginValues) {
    setMessage('')
    startTransition(async () => {
      const result = await loginAction(values)
      if (!result.ok) {
        setMessage(result.message)
        return
      }

      router.push(result.role === 'ADMIN' ? '/admin' : '/')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <label className="grid gap-2 text-sm font-black">
        Naam
        <Select {...register('displayName')}>
          {users.map((user) => (
            <option key={user.displayName} value={user.displayName}>
              {user.displayName} · {user.role}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-black">
        Pincode
        <Input type="password" inputMode="numeric" autoComplete="current-password" {...register('pin')} />
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Bezig met inloggen...' : 'Login'}
      </Button>
      {message ? <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-bold text-destructive">{message}</p> : null}
    </form>
  )
}
