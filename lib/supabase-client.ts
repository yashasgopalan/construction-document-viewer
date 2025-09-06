import { createClient } from '@supabase/supabase-js'

// Use environment variables for security and flexibility
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Get the current authenticated user
 * @returns Promise<User | null>
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    return user
  } catch (err) {
    console.error('Exception getting user:', err)
    return null
  }
}
