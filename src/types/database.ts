// Re-export generated types from Supabase CLI
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.generated'
import type { Database } from './database.generated'

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['categories']['Row']

export type CloudHabit = Database['public']['Tables']['habits']['Row']
export type CloudHabitInsert = Database['public']['Tables']['habits']['Insert']
export type CloudHabitUpdate = Database['public']['Tables']['habits']['Update']

export type CloudCompletion = Database['public']['Tables']['completions']['Row']
export type CloudCompletionInsert = Database['public']['Tables']['completions']['Insert']

export type Friendship = Database['public']['Tables']['friendships']['Row']
export type FriendshipInsert = Database['public']['Tables']['friendships']['Insert']
export type FriendshipUpdate = Database['public']['Tables']['friendships']['Update']

export type Competition = Database['public']['Tables']['competitions']['Row']
export type CompetitionParticipant = Database['public']['Tables']['competition_participants']['Row']

export type CategoryRanking = Database['public']['Views']['category_rankings']['Row']
