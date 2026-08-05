import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-md place-items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-black uppercase text-primary">Beveiligde toegang</p>
          <CardTitle className="text-3xl">Login met pincode</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kies je naam en gebruik je persoonlijke pincode. Pincodes worden gehasht opgeslagen.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
