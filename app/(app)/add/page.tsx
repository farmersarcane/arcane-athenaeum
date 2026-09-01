import { AddBookFlow } from '@/components/AddBookFlow'
import { getShelvesWithPreviews, getTags } from '@/lib/books'

export const metadata = { title: 'Add a book - Arcane Athenaeum' }

export default async function AddPage() {
  const [shelves, tags] = await Promise.all([getShelvesWithPreviews(), getTags()])

  return (
    <AddBookFlow
      shelves={shelves}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
    />
  )
}
