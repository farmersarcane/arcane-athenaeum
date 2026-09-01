'use server'

import { revalidatePath } from 'next/cache'
import { NeonDbError } from '@neondatabase/serverless'
import { requireUser } from './_auth'

export async function createShelf(name: string): Promise<{ id: string; name: string }> {
  const { sql, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A shelf needs a name.')

  try {
    const rows = (await sql`
      insert into shelf (user_id, name) values (${user.id}, ${clean})
      returning id, name
    `) as { id: string; name: string }[]

    revalidatePath('/shelves')
    return rows[0]
  } catch (err) {
    if (err instanceof NeonDbError && err.code === '23505') {
      throw new Error(`You already have a shelf called "${clean}".`)
    }
    throw err
  }
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const { sql, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A shelf needs a name.')

  try {
    await sql`
      update shelf set name = ${clean}
      where id = ${id} and user_id = ${user.id}
    `
  } catch (err) {
    if (err instanceof NeonDbError && err.code === '23505') {
      throw new Error(`You already have a shelf called "${clean}".`)
    }
    throw err
  }
  revalidatePath('/shelves')
}

/** Removes the shelf and its book links. The books themselves are untouched. */
export async function deleteShelf(id: string): Promise<void> {
  const { sql, user } = await requireUser()
  await sql`delete from shelf where id = ${id} and user_id = ${user.id}`
  revalidatePath('/shelves')
  revalidatePath('/library')
}

export async function createTag(name: string): Promise<{ id: string; name: string }> {
  const { sql, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A tag needs a name.')

  try {
    const rows = (await sql`
      insert into tag (user_id, name) values (${user.id}, ${clean})
      returning id, name
    `) as { id: string; name: string }[]

    revalidatePath('/tags')
    return rows[0]
  } catch (err) {
    if (err instanceof NeonDbError && err.code === '23505') {
      throw new Error(`You already have a tag called "${clean}".`)
    }
    throw err
  }
}

export async function deleteTag(id: string): Promise<void> {
  const { sql, user } = await requireUser()
  await sql`delete from tag where id = ${id} and user_id = ${user.id}`
  revalidatePath('/tags')
  revalidatePath('/library')
}
