import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { attributes as demoAttributes } from '@/lib/demo-data'
import { prisma } from '@/lib/prisma'
import { SuggestionForm } from './SuggestionForm'

export const dynamic = 'force-dynamic'

export default async function SuggestionsPage() {
  const attributeOptions = await getAttributeOptions()

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Viewer flow</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Spel voorstellen</h1>
        <p className="mt-3 text-muted-foreground">
          Viewers kunnen nieuwe ideeën indienen. Bert en Jean beoordelen ze in de adminomgeving.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nieuw voorstel</CardTitle>
        </CardHeader>
        <CardContent>
          <SuggestionForm attributeOptions={attributeOptions} />
        </CardContent>
      </Card>
    </div>
  )
}

async function getAttributeOptions() {
  try {
    const attributes = await prisma.attribute.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    })
    if (attributes.length) return attributes.map((attribute) => attribute.name)
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }

  return demoAttributes
}
