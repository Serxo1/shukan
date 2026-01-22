import { useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { authLogger as log } from '@/lib/debug'
import type { Profile, ProfileUpdate } from '@/types/database'

export function useAuth() {
  const {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    setUser,
    setSession,
    setProfile,
    setLoading,
    logout: logoutStore
  } = useAuthStore()

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log.debug('[Auth] State changed:', event)
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    if (!supabase) {
      setLoading(false)
      return
    }

    log.debug('[Auth] Fetching profile for:', userId)

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    )

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>

      log.debug('[Auth] Profile response:', { data, error })

      if (error) {
        log.error('[Auth] Profile fetch error:', error.message, error.code)
        // Profile might not exist yet, that's ok
      } else {
        setProfile(data as Profile)
      }
    } catch (error) {
      log.error('[Auth] Error fetching profile:', error)
    } finally {
      log.debug('[Auth] Setting loading to false')
      setLoading(false)
    }
  }

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }, [])

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    username: string,
    displayName?: string
  ) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        }
      }
    })

    if (error) throw error
    return data
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github' | 'apple') => {
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      }
    })

    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return

    await supabase.auth.signOut()
    logoutStore()
  }, [logoutStore])

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    if (!supabase || !user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data as Profile)
    return data as Profile
  }, [user, setProfile])

  const uploadAvatar = useCallback(async (file: File) => {
    if (!supabase || !user) throw new Error('Not authenticated')

    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File must be less than 2MB')
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update profile with new avatar URL
    const updatedProfile = await updateProfile({ avatar_url: urlData.publicUrl })
    return updatedProfile
  }, [user, updateProfile])

  const checkUsernameAvailable = useCallback(async (username: string) => {
    if (!supabase) return false

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (error) throw error
    return !data
  }, [])

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isConfigured: isSupabaseConfigured(),
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
    updateProfile,
    uploadAvatar,
    checkUsernameAvailable,
    refreshProfile: () => user && fetchProfile(user.id),
  }
}
