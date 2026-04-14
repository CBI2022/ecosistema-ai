import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value
  const locale = isValidLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

  const messages = (await import(`./messages/${locale}.json`)).default

  return { locale, messages }
})
