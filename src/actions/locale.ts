'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { COOKIE_NAME, isValidLocale, type Locale } from '@/i18n/config'

export async function setLocale(locale: Locale) {
  if (!isValidLocale(locale)) return { error: 'Invalid locale' }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ language: locale }).eq('id', user.id)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
