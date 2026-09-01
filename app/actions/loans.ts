'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './_auth'

/** Confirms the book belongs to the caller before any loan write. */
async function assertOwnsBook(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  userId: string,
  bookId: string
) {
  const { data } = await supabase
    .from('book')
    .select('id')
    .eq('id', bookId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) throw new Error('That book is not in your library.')
}

export async function loanOut(
  bookId: string,
  borrowerName: string,
  dueDate: string | null,
  notes: string | null
): Promise<void> {
  const { supabase, user } = await requireUser()
  await assertOwnsBook(supabase, user.id, bookId)

  const name = borrowerName.trim()
  if (!name) throw new Error("Who is borrowing it? A name is required.")

  const { error } = await supabase.from('loan').insert({
    book_id: bookId,
    borrower_name: name,
    due_date: dueDate || null,
    notes: notes?.trim() || null,
  })

  // A partial unique index allows only one open loan per book, so a second
  // checkout attempt fails loudly rather than silently double-booking.
  if (error) {
    if (error.code === '23505') {
      throw new Error('That book is already loaned out.')
    }
    throw error
  }

  revalidatePath('/library')
  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}

export async function markReturned(
  loanId: string,
  bookId: string
): Promise<void> {
  const { supabase, user } = await requireUser()
  await assertOwnsBook(supabase, user.id, bookId)

  const { error } = await supabase
    .from('loan')
    .update({ date_returned: new Date().toISOString().slice(0, 10) })
    .eq('id', loanId)
    .eq('book_id', bookId)
  if (error) throw error

  revalidatePath('/library')
  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}

export async function deleteLoan(
  loanId: string,
  bookId: string
): Promise<void> {
  const { supabase, user } = await requireUser()
  await assertOwnsBook(supabase, user.id, bookId)

  const { error } = await supabase.from('loan').delete().eq('id', loanId).eq('book_id', bookId)
  if (error) throw error

  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}
