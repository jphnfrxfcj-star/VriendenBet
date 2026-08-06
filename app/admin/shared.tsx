import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function AdminSection({ title, rows }: { title: string; rows: Array<[string, string, string]> }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Adminomgeving</p>
        <h1 className="text-4xl font-black tracking-normal">{title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overzicht</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {rows.map((row) => (
            <div key={`${row[0]}-${row[1]}`} className="grid gap-2 rounded-md bg-secondary p-3 text-sm md:grid-cols-3">
              <strong>{row[0]}</strong>
              <span className="text-muted-foreground">{row[1]}</span>
              <span className="text-muted-foreground">{row[2]}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminPageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Adminomgeving</p>
        <h1 className="text-4xl font-black tracking-normal">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function AdminCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  min,
  max,
  step,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string | number | null
  placeholder?: string
  required?: boolean
  min?: string | number
  max?: string | number
  step?: string | number
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
      />
    </label>
  )
}

export function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  rows,
  textareaClassName,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  rows?: number
  textareaClassName?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <Textarea
        name={name}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        rows={rows}
        className={textareaClassName}
      />
    </label>
  )
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue?: string | null
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <Select name={name} defaultValue={defaultValue ?? undefined}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

export function CheckField({
  label,
  name,
  defaultChecked,
}: {
  label: string
  name: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm font-black">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-lime-300" />
      {label}
    </label>
  )
}

export function SubmitButton({
  children = 'Opslaan',
  disabled,
}: {
  children?: ReactNode
  disabled?: boolean
}) {
  return (
    <Button type="submit" disabled={disabled}>
      {children}
    </Button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
}
