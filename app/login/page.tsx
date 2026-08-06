import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-md place-items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-black uppercase text-primary">Beveiligde toegang</p>
          <h1 className="text-3xl font-black tracking-normal">Login met pincode</h1>
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
