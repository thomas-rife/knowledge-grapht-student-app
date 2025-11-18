// import { createClient } from '@supabase/supabase-js'
// import AsyncStorage from '@react-native-async-storage/async-storage'

// const NEXT_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
// const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
// export const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
//   auth: {
//     storage: AsyncStorage,
//     // autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// })

import { createClient } from '@supabase/supabase-js'

const NEXT_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const isServer = typeof window === 'undefined'

let storage: any = undefined

if (!isServer) {
  // Only load AsyncStorage in environments that have window (mobile/web client)
  storage = require('@react-native-async-storage/async-storage').default
}

export const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage,
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: !isServer,
  },
})
