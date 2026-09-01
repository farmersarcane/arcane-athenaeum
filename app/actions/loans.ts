'use server'

import { revalidatePath } from 'next/cache'
import { NeonDbError } from '@neondatabase/serverless'
import { requireUser } from './_auth'
import type { Sql } from '@/lib/db'

/** Confirms the book belongs to the caller before any loan write. */
async function assertOwnsBook(sql: Sql, userId: string, bookId: string) {
  const rows = await sql`
    select id from book where id = ${bookId} and user_id = ${userId}
  `
  if (rows.length === 0) throw new Error('That book is not in your library.')
}

export async function loanOut(
  bookId: string,
  borrowerName: string,
  dueDate: string | null,
  notes: string | null
): Promise<void> {
  const { sql, user } = await requireUser()
  await assertOwnsBook(sql, user.id, bookId)

  const name = borrowerName.trim()
  if (!name) throw new Error("Who is borrowing it? A name is required.")

  try {
    await sql`
      insert into loan (book_id, borrower_name, due_date, notes)
      values (${bookId}, ${name}, ${dueDate || null}, ${notes?.trim() || null})
    `
  } catch (err) {
    // A partial unique index allows only one open loan per book, so a second
    // checkout attempt fails loudly rather than silently double-booking.
    if (err instanceof NeonDbError && err.code === '23505') {
      throw new Error('That book is already loaned out.')
    }
    throw err
  }

  revalidatePath('/library')
  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}

export async function markReturned(
  loanId: string,
  bookId: string
): Promise<void> {
  const { sql, user } = await requireUser()
  await assertOwnsBook(sql, user.id, bookId)

  await sql`
    update loan set date_returned = current_date
    where id = ${loanId} and book_id = ${bookId}
  `

  revalidatePath('/library')
  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}

export async function deleteLoan(
  loanId: string,
  bookId: string
): Promise<void> {
  const { sql, user } = await requireUser()
  await assertOwnsBook(sql, user.id, bookId)

  await sql`delete from loan where id = ${loanId} and book_id = ${bookId}`

  revalidatePath('/loans')
  revalidatePath(`/library/${bookId}`)
}
