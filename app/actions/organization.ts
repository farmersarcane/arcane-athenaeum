'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './_auth'

export async function createShelf(name: string): Promise<{ id: string; name: string }> {
  const { supabase, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A shelf needs a name.')

  const { data, error } = await supabase
    .from('shelf')
    .insert({ user_id: user.id, name: clean })
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error(`You already have a shelf called "${clean}".`)
    throw error
  }

  revalidatePath('/shelves')
  return data as { id: string; name: string }
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A shelf needs a name.')

  const { error } = await supabase
    .from('shelf')
    .update({ name: clean })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) {
    if (error.code === '23505') throw new Error(`You already have a shelf called "${clean}".`)
    throw error
  }
  revalidatePath('/shelves')
}

/** Removes the shelf and its book links. The books themselves are untouched. */
export async function deleteShelf(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('shelf').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw error
  revalidatePath('/shelves')
  revalidatePath('/library')
}

export async function createTag(name: string): Promise<{ id: string; name: string }> {
  const { supabase, user } = await requireUser()
  const clean = name.trim()
  if (!clean) throw new Error('A tag needs a name.')

  const { data, error } = await supabase
    .from('tag')
    .insert({ user_id: user.id, name: clean })
    .select('id, name')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error(`You already have a tag called "${clean}".`)
    throw error
  }

  revalidatePath('/tags')
  return data as { id: string; name: string }
}

export async function deleteTag(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('tag').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw error
  revalidatePath('/tags')
  revalidatePath('/library')
}
