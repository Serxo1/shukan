import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useDatabase } from '@/hooks/useDatabase'
import { syncLogger as log } from '@/lib/debug'
import type { CloudHabit, CloudHabitInsert, CloudHabitUpdate, CloudCompletionInsert } from '@/types/database'
import type { Habit } from '@/types'

// Map local habit to cloud format
function toCloudHabit(habit: Habit, userId: string, categoryId: number = 9): CloudHabitInsert {
  return {
    id: habit.cloudId || crypto.randomUUID(),
    user_id: userId,
    category_id: categoryId,
    name: habit.name,
    frequency: habit.frequency,
    icon: habit.icon || '⭐',
    color: habit.color || '#8B5CF6',
    target_type: habit.targetType || 'boolean',
    target_value: habit.targetValue || 1,
    target_unit: habit.targetUnit || null,
    streak: habit.streak,
    best_streak: habit.bestStreak || 0,
    is_public: true,
  }
}

export function useCloudSync() {
  const { user, isAuthenticated } = useAuthStore()
  const { getHabits } = useDatabase()

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const syncInProgress = useRef(false)

  // Upload local habit to cloud
  const uploadHabit = useCallback(async (habit: Habit, categoryId?: number) => {
    if (!supabase || !user) return null

    const cloudHabit = toCloudHabit(habit, user.id, categoryId)

    const { data, error } = await supabase
      .from('habits')
      .upsert(cloudHabit, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      log.error('[CloudSync] Upload error:', error)
      throw error
    }

    return data as CloudHabit
  }, [user])

  // Upload completion to cloud
  const uploadCompletion = useCallback(async (habitCloudId: string, date: string, value: number = 1) => {
    if (!supabase || !user) return null

    const completionData: CloudCompletionInsert = {
      habit_id: habitCloudId,
      user_id: user.id,
      date,
      value
    }

    const { data, error } = await supabase
      .from('completions')
      .upsert(completionData, { onConflict: 'habit_id,date' })
      .select()
      .single()

    if (error) {
      log.error('[CloudSync] Completion upload error:', error)
      throw error
    }

    return data
  }, [user])

  // Full sync: upload all local habits to cloud (avoiding duplicates)
  const syncToCloud = useCallback(async () => {
    if (!supabase || !user || !isAuthenticated) {
      log.debug('[CloudSync] Skipping sync - not authenticated')
      return
    }

    if (syncInProgress.current) {
      log.debug('[CloudSync] Sync already in progress')
      return
    }

    syncInProgress.current = true
    setIsSyncing(true)
    setSyncError(null)

    try {
      const localHabits = await getHabits()
      log.debug('[CloudSync] Syncing', localHabits.length, 'habits to cloud')

      // Fetch existing cloud habits first
      const { data: existingHabits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id)

      const existingByName = new Map(
        (existingHabits || []).map(h => [h.name.toLowerCase(), h.id])
      )

      for (const habit of localHabits) {
        // Check if habit already exists in cloud by name
        const existingId = existingByName.get(habit.name.toLowerCase())

        if (existingId) {
          // Update existing habit
          log.debug('[CloudSync] Updating existing habit:', habit.name)
          const updateData: CloudHabitUpdate = {
            streak: habit.streak,
            best_streak: habit.bestStreak || 0,
            icon: habit.icon || '⭐',
            color: habit.color || '#8B5CF6',
          }
          await supabase
            .from('habits')
            .update(updateData)
            .eq('id', existingId)
        } else {
          // Insert new habit
          log.debug('[CloudSync] Creating new habit:', habit.name)
          await uploadHabit(habit)
        }
      }

      setLastSyncAt(new Date())
      log.debug('[CloudSync] Sync complete')
    } catch (error) {
      log.error('[CloudSync] Sync failed:', error)
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
      syncInProgress.current = false
    }
  }, [user, isAuthenticated, getHabits, uploadHabit])

  // Fetch habits from cloud
  const fetchFromCloud = useCallback(async () => {
    if (!supabase || !user) return []

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      log.error('[CloudSync] Fetch error:', error)
      throw error
    }

    return (data || []) as CloudHabit[]
  }, [user])

  // Fetch friend's habits (public only)
  const fetchFriendHabits = useCallback(async (friendId: string) => {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', friendId)
      .eq('is_public', true)
      .order('streak', { ascending: false })

    if (error) {
      log.error('[CloudSync] Fetch friend habits error:', error)
      throw error
    }

    return (data || []) as CloudHabit[]
  }, [])

  // Update habit category (for AI auto-categorization)
  const updateHabitCategory = useCallback(async (habitCloudId: string, categoryId: number) => {
    if (!supabase) return

    const updateData: CloudHabitUpdate = { category_id: categoryId }
    const { error } = await supabase
      .from('habits')
      .update(updateData)
      .eq('id', habitCloudId)

    if (error) {
      log.error('[CloudSync] Category update error:', error)
      throw error
    }
  }, [])

  // Set habit visibility
  const setHabitPublic = useCallback(async (habitCloudId: string, isPublic: boolean) => {
    if (!supabase) return

    const updateData: CloudHabitUpdate = { is_public: isPublic }
    const { error } = await supabase
      .from('habits')
      .update(updateData)
      .eq('id', habitCloudId)

    if (error) throw error
  }, [])

  // Auto-sync when authenticated
  useEffect(() => {
    if (isAuthenticated && isSupabaseConfigured()) {
      // Delay initial sync slightly
      const timeout = setTimeout(() => {
        syncToCloud()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [isAuthenticated, syncToCloud])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!supabase || !user || !isAuthenticated) return

    const channel = supabase
      .channel('habits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          log.debug('[CloudSync] Realtime update:', payload)
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [user, isAuthenticated])

  return {
    isSyncing,
    lastSyncAt,
    syncError,
    isConfigured: isSupabaseConfigured(),
    syncToCloud,
    fetchFromCloud,
    fetchFriendHabits,
    uploadHabit,
    uploadCompletion,
    updateHabitCategory,
    setHabitPublic,
  }
}
