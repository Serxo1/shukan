import { supabase, isSupabaseConfigured } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string }>
  tools?: unknown[]
  tool_choice?: string
  temperature?: number
  max_tokens?: number
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
  }>
}

/**
 * Call OpenAI chat completions via Edge Function
 * Requires authenticated user
 */
export async function callChatEdgeFunction(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('[Edge Function] Chat error:', error)
    throw new Error(error.error || 'Chat API error')
  }

  return response.json()
}

interface TTSRequest {
  text: string
  voice_id?: string
  model_id?: string
  voice_settings?: {
    stability?: number
    similarity_boost?: number
  }
}

/**
 * Call ElevenLabs TTS via Edge Function
 * Returns audio stream
 * Requires authenticated user
 */
export async function callTTSEdgeFunction(request: TTSRequest): Promise<Response> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('[Edge Function] TTS error:', error)
    throw new Error(error.error || 'TTS API error')
  }

  return response
}

/**
 * Check if Edge Functions are available (user is authenticated)
 */
export async function canUseEdgeFunctions(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false
  }

  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}
