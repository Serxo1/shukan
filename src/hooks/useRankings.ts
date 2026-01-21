import { useState, useCallback, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { CategoryRanking, Category } from '@/types/database'

export interface RankingEntry {
  category_id: number | null
  category_name: string | null
  user_id: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  total_streak: number | null
  habit_count: number | null
  total_completions: number | null
  rank: number
  isCurrentUser: boolean
}

export function useRankings() {
  const { user } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [rankings, setRankings] = useState<Record<number, RankingEntry[]>>({})
  const [globalRankings, setGlobalRankings] = useState<RankingEntry[]>([])
  const [friendsRankings, setFriendsRankings] = useState<RankingEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id')

    if (error) {
      console.error('[Rankings] Error fetching categories:', error)
      return
    }

    setCategories((data || []) as Category[])
  }, [])

  const fetchCategoryRankings = useCallback(async (categoryId: number) => {
    if (!supabase) return []

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('category_rankings')
        .select('*')
        .eq('category_id', categoryId)
        .order('total_streak', { ascending: false })
        .limit(50)

      if (error) throw error

      const typedData = (data || []) as CategoryRanking[]

      const rankedData: RankingEntry[] = typedData.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        isCurrentUser: entry.user_id === user?.id
      }))

      setRankings(prev => ({ ...prev, [categoryId]: rankedData }))
      return rankedData
    } catch (error) {
      console.error('[Rankings] Error fetching category rankings:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const fetchGlobalRankings = useCallback(async () => {
    if (!supabase) return

    setIsLoading(true)
    try {
      // First get public profile IDs
      const { data: publicProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_public', true)

      if (profilesError) throw profilesError

      const publicIds = new Set((publicProfiles || []).map(p => p.id))
      // Also include current user even if not public
      if (user?.id) publicIds.add(user.id)

      const { data, error } = await supabase
        .from('category_rankings')
        .select('*')

      if (error) throw error

      const typedData = (data || []) as CategoryRanking[]

      // Group by user and sum totals - only include public profiles
      const userTotals = new Map<string, {
        user_id: string
        username: string | null
        display_name: string | null
        avatar_url: string | null
        total_streak: number
        habit_count: number
        total_completions: number
      }>()

      for (const entry of typedData) {
        if (!entry.user_id || !publicIds.has(entry.user_id)) continue

        const existing = userTotals.get(entry.user_id)
        if (existing) {
          existing.total_streak += entry.total_streak || 0
          existing.habit_count += entry.habit_count || 0
          existing.total_completions += entry.total_completions || 0
        } else {
          userTotals.set(entry.user_id, {
            user_id: entry.user_id,
            username: entry.username,
            display_name: entry.display_name,
            avatar_url: entry.avatar_url,
            total_streak: entry.total_streak || 0,
            habit_count: entry.habit_count || 0,
            total_completions: entry.total_completions || 0
          })
        }
      }

      const sortedRankings: RankingEntry[] = Array.from(userTotals.values())
        .sort((a, b) => b.total_streak - a.total_streak)
        .slice(0, 50)
        .map((entry, index) => ({
          ...entry,
          category_id: 0,
          category_name: 'global',
          rank: index + 1,
          isCurrentUser: entry.user_id === user?.id
        }))

      setGlobalRankings(sortedRankings)
    } catch (error) {
      console.error('[Rankings] Error fetching global rankings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const fetchFriendsRankings = useCallback(async (friendIds: string[]) => {
    if (!supabase || !user) return

    setIsLoading(true)
    try {
      // Include current user + friends
      const userIds = [user.id, ...friendIds]

      const { data, error } = await supabase
        .from('category_rankings')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error

      const typedData = (data || []) as CategoryRanking[]

      // Group by user and sum totals
      const userTotals = new Map<string, {
        user_id: string
        username: string | null
        display_name: string | null
        avatar_url: string | null
        total_streak: number
        habit_count: number
        total_completions: number
      }>()

      for (const entry of typedData) {
        if (!entry.user_id) continue

        const existing = userTotals.get(entry.user_id)
        if (existing) {
          existing.total_streak += entry.total_streak || 0
          existing.habit_count += entry.habit_count || 0
          existing.total_completions += entry.total_completions || 0
        } else {
          userTotals.set(entry.user_id, {
            user_id: entry.user_id,
            username: entry.username,
            display_name: entry.display_name,
            avatar_url: entry.avatar_url,
            total_streak: entry.total_streak || 0,
            habit_count: entry.habit_count || 0,
            total_completions: entry.total_completions || 0
          })
        }
      }

      const sortedRankings: RankingEntry[] = Array.from(userTotals.values())
        .sort((a, b) => b.total_streak - a.total_streak)
        .map((entry, index) => ({
          ...entry,
          category_id: 0,
          category_name: 'friends',
          rank: index + 1,
          isCurrentUser: entry.user_id === user?.id
        }))

      setFriendsRankings(sortedRankings)
    } catch (error) {
      console.error('[Rankings] Error fetching friends rankings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const getUserRank = useCallback((categoryId?: number) => {
    if (!user) return null

    const rankingList = categoryId ? rankings[categoryId] : globalRankings
    const userEntry = rankingList?.find(r => r.isCurrentUser)
    return userEntry?.rank || null
  }, [user, rankings, globalRankings])

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchCategories()
    }
  }, [fetchCategories])

  return {
    categories,
    rankings,
    globalRankings,
    friendsRankings,
    isLoading,
    fetchCategoryRankings,
    fetchGlobalRankings,
    fetchFriendsRankings,
    getUserRank,
    refresh: fetchGlobalRankings,
  }
}
