import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth'

export default async function ProfilePage() {
  const user = await getSessionUser()

  return (
    <div className="mx-auto grid w-full max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Profiel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md bg-secondary p-4">
            <p className="text-sm text-muted-foreground">Ingelogd als</p>
            <p className="mt-1 text-2xl font-black">{user?.displayName ?? 'Niet ingelogd'}</p>
            <p className="text-sm text-primary">{user?.role ?? 'Geen rol'}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary">Logout</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
