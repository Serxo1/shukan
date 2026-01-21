import { useState, useCallback, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Profile, Friendship } from '@/types/database'

interface FriendshipWithProfiles extends Friendship {
  requester?: Profile
  addressee?: Profile
}

interface FriendWithProfile extends Friendship {
  friend: Profile
}

export function useFriends() {
  const { user } = useAuthStore()
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([])
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchFriends = useCallback(async () => {
    if (!supabase || !user) return

    setIsLoading(true)
    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(*),
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (error) throw error

      const typedFriendships = friendships as unknown as FriendshipWithProfiles[]

      const friendsList = (typedFriendships || [])
        .filter(f => f.requester && f.addressee)
        .map(f => ({
          ...f,
          friend: f.requester_id === user.id ? f.addressee! : f.requester!
        }))

      setFriends(friendsList)
    } catch (error) {
      console.error('[Friends] Error fetching friends:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const fetchPendingRequests = useCallback(async () => {
    if (!supabase || !user) return

    try {
      // Requests sent TO me
      const { data: incoming, error: inError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(*)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')

      if (inError) throw inError

      const typedIncoming = incoming as unknown as FriendshipWithProfiles[]

      setPendingRequests((typedIncoming || [])
        .filter(f => f.requester)
        .map(f => ({
          ...f,
          friend: f.requester!
        })))

      // Requests sent BY me
      const { data: outgoing, error: outError } = await supabase
        .from('friendships')
        .select(`
          *,
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending')

      if (outError) throw outError

      const typedOutgoing = outgoing as unknown as FriendshipWithProfiles[]

      setSentRequests((typedOutgoing || [])
        .filter(f => f.addressee)
        .map(f => ({
          ...f,
          friend: f.addressee!
        })))
    } catch (error) {
      console.error('[Friends] Error fetching requests:', error)
    }
  }, [user])

  const sendFriendRequest = useCallback(async (addresseeId: string) => {
    if (!supabase || !user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      } as never)
      .select()
      .single()

    if (error) throw error
    await fetchPendingRequests()
    return data
  }, [user, fetchPendingRequests])

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' } as never)
      .eq('id', friendshipId)

    if (error) throw error
    await Promise.all([fetchFriends(), fetchPendingRequests()])
  }, [fetchFriends, fetchPendingRequests])

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) throw error
    await fetchPendingRequests()
  }, [fetchPendingRequests])

  const removeFriend = useCallback(async (friendshipId: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) throw error
    await fetchFriends()
  }, [fetchFriends])

  const blockUser = useCallback(async (friendshipId: string) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'blocked' } as never)
      .eq('id', friendshipId)

    if (error) throw error
    await Promise.all([fetchFriends(), fetchPendingRequests()])
  }, [fetchFriends, fetchPendingRequests])

  const searchUsers = useCallback(async (query: string) => {
    if (!supabase || !user || query.length < 2) return []

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user.id)
      .limit(10)

    if (error) throw error
    return (data || []) as Profile[]
  }, [user])

  useEffect(() => {
    if (user && isSupabaseConfigured()) {
      fetchFriends()
      fetchPendingRequests()
    }
  }, [user, fetchFriends, fetchPendingRequests])

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    searchUsers,
    refresh: () => Promise.all([fetchFriends(), fetchPendingRequests()]),
  }
}
