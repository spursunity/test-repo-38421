import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Отсутствуют переменные окружения для Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Инициализация Anonymous Auth
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      throw new Error(`Ошибка аутентификации: ${error.message}`)
    }
    return data.user
  }

  return session.user
}

// Обработчик изменений сессии
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  if (event === 'TOKEN_REFRESHED') {
    console.log('Токен обновлен')
  }
  if (event === 'SIGNED_OUT') {
    console.warn('Сессия завершена, требуется реаутентификация')
  }
})
