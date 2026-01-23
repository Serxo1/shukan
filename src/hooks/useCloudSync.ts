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
  const {
    getHabits,
    createHabitFromCloud,
    updateHabitCloudId,
    updateHabitFromCloud,
  } = useDatabase()

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const syncInProgress = useRef(false)

  // Upload local habit to cloud and return cloud habit with ID
  const uploadHabit = useCallback(async (habit: Habit, categoryId?: number): Promise<CloudHabit | null> => {
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

    // Update local habit with cloud_id if not set
    if (!habit.cloudId && data?.id) {
      await updateHabitCloudId(habit.id, data.id)
    }

    return data as CloudHabit
  }, [user, updateHabitCloudId])

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

  // Sync FROM cloud to local (Cloud -> Local)
  const syncFromCloud = useCallback(async () => {
    if (!supabase || !user || !isAuthenticated) {
      log.debug('[CloudSync] Skipping syncFromCloud - not authenticated')
      return
    }

    log.debug('[CloudSync] Starting sync from cloud...')

    try {
      // Fetch all cloud habits for this user
      const { data: cloudHabits, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        log.error('[CloudSync] Error fetching cloud habits:', error)
        throw error
      }

      if (!cloudHabits || cloudHabits.length === 0) {
        log.debug('[CloudSync] No cloud habits found')
        return
      }

      log.debug('[CloudSync] Found', cloudHabits.length, 'cloud habits')

      // Get local habits to compare
      const localHabits = await getHabits()
      const localByCloudId = new Map(
        localHabits.filter(h => h.cloudId).map(h => [h.cloudId!, h])
      )
      const localByName = new Map(
        localHabits.map(h => [h.name.toLowerCase(), h])
      )

      for (const cloudHabit of cloudHabits) {
        // Check if we already have this habit by cloud_id
        const existingByCloudId = localByCloudId.get(cloudHabit.id)

        if (existingByCloudId) {
          // Update local habit if cloud has higher streak or more recent data
          const cloudStreak = cloudHabit.streak ?? 0
          const cloudBestStreak = cloudHabit.best_streak ?? 0
          if (cloudStreak > existingByCloudId.streak ||
              cloudBestStreak > existingByCloudId.bestStreak) {
            log.debug('[CloudSync] Updating local habit from cloud:', cloudHabit.name)
            await updateHabitFromCloud(existingByCloudId.id, {
              streak: Math.max(cloudStreak, existingByCloudId.streak),
              best_streak: Math.max(cloudBestStreak, existingByCloudId.bestStreak),
              icon: cloudHabit.icon || existingByCloudId.icon,
              color: cloudHabit.color || existingByCloudId.color,
            })
          }
          continue
        }

        // Check if we have this habit by name (no cloud_id set yet)
        const existingByName = localByName.get(cloudHabit.name.toLowerCase())

        if (existingByName && !existingByName.cloudId) {
          // Link existing local habit to cloud and update
          log.debug('[CloudSync] Linking local habit to cloud:', cloudHabit.name)
          const cloudStreak = cloudHabit.streak ?? 0
          const cloudBestStreak = cloudHabit.best_streak ?? 0
          await updateHabitCloudId(existingByName.id, cloudHabit.id)
          await updateHabitFromCloud(existingByName.id, {
            streak: Math.max(cloudStreak, existingByName.streak),
            best_streak: Math.max(cloudBestStreak, existingByName.bestStreak),
            icon: cloudHabit.icon || existingByName.icon,
            color: cloudHabit.color || existingByName.color,
          })
          continue
        }

        // Create new local habit from cloud
        log.debug('[CloudSync] Creating local habit from cloud:', cloudHabit.name)
        await createHabitFromCloud({
          cloud_id: cloudHabit.id,
          name: cloudHabit.name,
          frequency: cloudHabit.frequency || 'daily',
          streak: cloudHabit.streak ?? 0,
          best_streak: cloudHabit.best_streak ?? 0,
          icon: cloudHabit.icon || '⭐',
          color: cloudHabit.color || '#8B5CF6',
          target_type: cloudHabit.target_type || 'boolean',
          target_value: cloudHabit.target_value ?? 1,
          target_unit: cloudHabit.target_unit,
          created_at: cloudHabit.created_at || new Date().toISOString(),
        })
      }

      log.debug('[CloudSync] Sync from cloud complete')
    } catch (error) {
      log.error('[CloudSync] syncFromCloud failed:', error)
      throw error
    }
  }, [user, isAuthenticated, getHabits, createHabitFromCloud, updateHabitCloudId, updateHabitFromCloud])

  // Sync TO cloud (Local -> Cloud)
  const syncToCloud = useCallback(async () => {
    if (!supabase || !user || !isAuthenticated) {
      log.debug('[CloudSync] Skipping syncToCloud - not authenticated')
      return
    }

    log.debug('[CloudSync] Starting sync to cloud...')

    try {
      const localHabits = await getHabits()
      log.debug('[CloudSync] Syncing', localHabits.length, 'local habits to cloud')

      // Fetch existing cloud habits
      const { data: existingHabits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id)

      const existingByName = new Map(
        (existingHabits || []).map(h => [h.name.toLowerCase(), h.id])
      )

      for (const habit of localHabits) {
        if (habit.cloudId) {
          // Update existing cloud habit
          log.debug('[CloudSync] Updating cloud habit:', habit.name)
          const updateData: CloudHabitUpdate = {
            streak: habit.streak,
            best_streak: habit.bestStreak || 0,
            icon: habit.icon || '⭐',
            color: habit.color || '#8B5CF6',
          }
          await supabase
            .from('habits')
            .update(updateData)
            .eq('id', habit.cloudId)
        } else {
          // Check if habit exists in cloud by name
          const existingId = existingByName.get(habit.name.toLowerCase())

          if (existingId) {
            // Link local to existing cloud habit and update
            log.debug('[CloudSync] Linking and updating existing cloud habit:', habit.name)
            await updateHabitCloudId(habit.id, existingId)
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
            // Create new cloud habit
            log.debug('[CloudSync] Creating new cloud habit:', habit.name)
            await uploadHabit(habit)
          }
        }
      }

      log.debug('[CloudSync] Sync to cloud complete')
    } catch (error) {
      log.error('[CloudSync] syncToCloud failed:', error)
      throw error
    }
  }, [user, isAuthenticated, getHabits, uploadHabit, updateHabitCloudId])

  // Full bidirectional sync: Cloud -> Local, then Local -> Cloud
  const fullSync = useCallback(async () => {
    if (!supabase || !user || !isAuthenticated) {
      log.debug('[CloudSync] Skipping fullSync - not authenticated')
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
      // First: Pull from cloud to local (ensures we get habits from other devices)
      await syncFromCloud()

      // Then: Push local to cloud (ensures local changes are synced)
      await syncToCloud()

      setLastSyncAt(new Date())
      log.debug('[CloudSync] Full sync complete')
    } catch (error) {
      log.error('[CloudSync] Full sync failed:', error)
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
      syncInProgress.current = false
    }
  }, [user, isAuthenticated, syncFromCloud, syncToCloud])

  // Sync single habit immediately (called after creating a habit)
  const syncHabit = useCallback(async (habit: Habit): Promise<CloudHabit | null> => {
    if (!supabase || !user || !isAuthenticated) {
      log.debug('[CloudSync] Skipping syncHabit - not authenticated')
      return null
    }

    try {
      log.debug('[CloudSync] Syncing single habit:', habit.name)
      const cloudHabit = await uploadHabit(habit)
      return cloudHabit
    } catch (error) {
      log.error('[CloudSync] Failed to sync habit:', error)
      return null
    }
  }, [user, isAuthenticated, uploadHabit])

  // Fetch habits from cloud (for display/comparison)
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

  // Delete habit from cloud
  const deleteHabitFromCloud = useCallback(async (habitCloudId: string) => {
    if (!supabase) return

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitCloudId)

    if (error) {
      log.error('[CloudSync] Delete error:', error)
      throw error
    }
  }, [])

  // Auto-sync when authenticated (full bidirectional sync)
  useEffect(() => {
    if (isAuthenticated && isSupabaseConfigured()) {
      // Delay initial sync slightly
      const timeout = setTimeout(() => {
        fullSync()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [isAuthenticated, fullSync])

  // Subscribe to realtime updates and sync when changes detected
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
          log.debug('[CloudSync] Realtime update:', payload.eventType)
          // Trigger sync from cloud when external changes detected
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            syncFromCloud()
          }
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [user, isAuthenticated, syncFromCloud])

  return {
    isSyncing,
    lastSyncAt,
    syncError,
    isConfigured: isSupabaseConfigured(),
    // Sync operations
    fullSync,
    syncToCloud,
    syncFromCloud,
    syncHabit,
    // Data fetching
    fetchFromCloud,
    fetchFriendHabits,
    // Individual operations
    uploadHabit,
    uploadCompletion,
    updateHabitCategory,
    setHabitPublic,
    deleteHabitFromCloud,
  }
}
