import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  if (!['pro', 'agency'].includes(sub?.plan || '')) {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  const { projectId } = await req.json()
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, start_date, end_date')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const [{ data: tasks }, { data: milestones }, { data: risks }, { data: existingProfile }] =
    await Promise.all([
      supabase.from('tasks').select('title, status, due_date, priority').eq('project_id', projectId),
      supabase.from('milestones').select('title, due_date, completed').eq('project_id', projectId),
      supabase.from('risks').select('title, severity, status').eq('project_id', projectId),
      supabase.from('project_profiles').select('*').eq('project_id', projectId).single(),
    ])

  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks?.filter(t => t.status !== 'done' && t.due_date && t.due_date < today) || []

  const prompt = `You are a senior project manager. Based on the following project data, generate a concise project intelligence brief.

PROJECT: ${project.name}
Status: ${project.status}
Timeline: ${project.start_date || 'TBD'} to ${project.end_date || 'TBD'}

TASKS (${tasks?.length || 0} total, ${overdueTasks.length} overdue):
${tasks?.slice(0, 20).map(t => `- ${t.title || t.status} [${t.status}]`).join('\n') || 'None'}

MILESTONES:
${milestones?.map(m => `- ${m.title} due ${m.due_date || 'TBD'}`).join('\n') || 'None'}

RISKS:
${risks?.map(r => `- ${r.title} [${r.severity || 'medium'}]`).join('\n') || 'None'}

EXISTING BRIEF:
Goals: ${existingProfile?.goals || 'Not set'}

Return ONLY valid JSON with these exact keys, no markdown, no preamble:
{"goals":"...","timeline_summary":"...","risk_summary":"...","project_style":"..."}`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const raw = aiData.content?.[0]?.text || '{}'

  let enriched: Record<string, string> = {}
  try {
    enriched = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
  }

  await supabase
    .from('project_profiles')
    .upsert(
      { project_id: projectId, ...enriched, ai_enriched_at: new Date().toISOString() },
      { onConflict: 'project_id' }
    )

  return NextResponse.json({ profile: enriched })
}
