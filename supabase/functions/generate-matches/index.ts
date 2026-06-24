import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, eventId } = await req.json()
    if (!userId || !eventId) {
      return new Response(JSON.stringify({ error: "Missing userId or eventId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ""

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get current user's profile
    const { data: userProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileErr || !userProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Fetch other participants in the same event
    const { data: participants, error: partErr } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .neq('user_id', userId)

    if (partErr || !participants) {
      return new Response(JSON.stringify({ error: "No other participants found" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const otherUserIds = participants.map(p => p.user_id)

    // Exclude connected users
    const { data: connections } = await supabase
      .from('connections')
      .select('user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)

    const connectedUserIds = new Set<string>()
    if (connections) {
      connections.forEach(c => {
        connectedUserIds.add(c.user_a === userId ? c.user_b : c.user_a)
      })
    }

    // Exclude blocked users
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

    const blockedUserIds = new Set<string>()
    if (blocks) {
      blocks.forEach(b => {
        if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id)
        if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id)
      })
    }

    // Filter candidates
    const candidateIds = otherUserIds.filter(id => !connectedUserIds.has(id) && !blockedUserIds.has(id))

    if (candidateIds.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch candidate profiles (limit to 10 for AI context size efficiency)
    const { data: candidateProfiles, error: candErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', candidateIds)
      .limit(10)

    if (candErr || !candidateProfiles || candidateProfiles.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let matches: any[] = []

    if (anthropicApiKey) {
      const prompt = `You are a networking assistant for a hackathon.

Current user profile:
Name: ${userProfile.full_name}
Skills: ${userProfile.skills ? userProfile.skills.join(', ') : ''}
Interests: ${userProfile.interests ? userProfile.interests.join(', ') : ''}
Looking for: ${userProfile.looking_for}
Bio: ${userProfile.bio ?? ''}

Candidate profiles:
${JSON.stringify(candidateProfiles.map(p => ({
        id: p.id,
        name: p.full_name,
        skills: p.skills,
        interests: p.interests,
        looking_for: p.looking_for,
        bio: p.bio
      })), null, 2)}

For each candidate, return a JSON object with:
- user_id: the candidate's id
- compatibility_score: integer 0-100
- reason: one sentence explaining why they match (max 15 words)
- icebreaker: one conversation starter question tailored to their shared interests (max 20 words)

Return ONLY a valid JSON array. No explanation. No markdown. Do not wrap in \`\`\`json. Just the JSON text.`

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.content[0].text.trim()
        try {
          matches = JSON.parse(text)
        } catch (e) {
          console.error("Failed to parse Claude JSON response. Raw text was:", text, e)
          matches = generateHeuristicMatches(userProfile, candidateProfiles)
        }
      } else {
        const errorText = await response.text()
        console.error("Anthropic API error response:", errorText)
        matches = generateHeuristicMatches(userProfile, candidateProfiles)
      }
    } else {
      matches = generateHeuristicMatches(userProfile, candidateProfiles)
    }

    // Insert new matches into ai_suggestions database
    if (matches && matches.length > 0) {
      // Delete old suggestions for this user in this event
      await supabase
        .from('ai_suggestions')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)

      const inserts = matches.map((m: any) => ({
        user_id: userId,
        suggested_user_id: m.user_id,
        event_id: eventId,
        compatibility_score: m.compatibility_score,
        reason: m.reason,
        icebreaker: m.icebreaker
      }))

      await supabase.from('ai_suggestions').insert(inserts)
    }

    // Return current suggestions from database
    const { data: suggestions, error: sugErr } = await supabase
      .from('ai_suggestions')
      .select('id, user_id, suggested_user_id, event_id, compatibility_score, reason, icebreaker, generated_at, profiles:suggested_user_id(*)')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .order('compatibility_score', { ascending: false })
      .limit(5)

    return new Response(JSON.stringify({ suggestions: suggestions || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function generateHeuristicMatches(user: any, candidates: any[]) {
  return candidates.map(cand => {
    const userSkills = new Set(user.skills || [])
    const candSkills = cand.skills || []
    const skillOverlap = candSkills.filter((s: string) => userSkills.has(s))

    const userInterests = new Set(user.interests || [])
    const candInterests = cand.interests || []
    const interestOverlap = candInterests.filter((i: string) => userInterests.has(i))

    let score = 50 + (skillOverlap.length * 10) + (interestOverlap.length * 5)
    if (user.looking_for === 'teammate' && cand.looking_for === 'collaborator') score += 15
    if (user.looking_for === 'mentor' && cand.looking_for === 'mentor') score -= 10
    if (score > 98) score = 98
    if (score < 40) score = 40

    let reason = "Shares interests in " + (interestOverlap[0] || "coding") + " and similar hackathon goals."
    if (skillOverlap.length > 0) {
      reason = `Complementary skills: overlap in ${skillOverlap.slice(0, 2).join(', ')}.`
    }

    const icebreaker = `Hey ${cand.full_name}, I noticed you work with ${candSkills[0] || 'tech'}. Want to brainstorm some ideas together?`

    return {
      user_id: cand.id,
      compatibility_score: Math.round(score),
      reason,
      icebreaker
    }
  })
}
