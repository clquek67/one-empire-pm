import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // Auth check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Plan check — Pro+ only
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', session.user.id)
    .single();

  const planId = sub?.plan_id || 'starter';
  if (!['pro', 'agency'].includes(planId)) {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
  }

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  // Verify project belongs to user
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, start_date, end_date')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Fetch supporting data
  const [{ data: tasks }, { data: milestones }, { data: risks }, { data: existingProfile }] =
    await Promise.all([
      supabase.from('tasks').select('title, status, due_date, priority').eq('project_id', projectId),
      supabase.from('milestones').select('title, due_date, completed').eq('project_id', projectId),
      supabase.from('risks').select('title, severity, status').eq('project_id', projectId),
      supabase.from('project_profiles').select('*').eq('project_id', projectId).single(),
    ]);

  const overdueTasks = tasks?.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()) || [];
  const highRisks = risks?.filter(r => r.severity === 'high' && r.status === 'open') || [];

  const prompt = `You are a senior project manager. Based on the following project data, generate a concise project intelligence brief.

PROJECT: ${project.name}
Description: ${project.description || 'Not provided'}
Status: ${project.status}
Timeline: ${project.start_date || 'TBD'} → ${project.end_date || 'TBD'}

TASKS (${tasks?.length || 0} total, ${overdueTasks.length} overdue):
${tasks?.slice(0, 20).map(t => `- ${t.title} [${t.status}]${t.due_date ? ` due ${t.due_date}` : ''}`).join('\n') || 'None'}

MILESTONES:
${milestones?.map(m => `- ${m.title} [${m.completed ? 'done' : 'pending'}] due ${m.due_date || 'TBD'}`).join('\n') || 'None'}

RISKS:
${risks?.map(r => `- ${r.title} [${r.severity}/${r.status}]`).join('\n') || 'None'}

EXISTING BRIEF (if any):
Goals: ${existingProfile?.goals || 'Not set'}
Style: ${existingProfile?.project_style || 'Not set'}

Return ONLY a valid JSON object with these exact keys:
{
  "goals": "2-3 sentences summarising what success looks like based on the project data",
  "timeline_summary": "1-2 sentences on key dates and phases",
  "risk_summary": "1-2 sentences on top risks and recommended mitigations",
  "project_style": "1 sentence on recommended communication approach based on project complexity"
}

No preamble. No markdown. JSON only.`;

  // Call Anthropic
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
  });

  const aiData = await aiRes.json();
  const raw = aiData.content?.[0]?.text || '{}';

  let enriched: Record<string, string> = {};
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    enriched = JSON.parse(clean);
  } catch {
    return NextResponse.json({ error: 'AI response parsing failed' }, { status: 500 });
  }

  // Save enriched profile
  const { error } = await supabase
    .from('project_profiles')
    .upsert(
      {
        project_id: projectId,
        ...enriched,
        ai_enriched_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

  if (error) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  return NextResponse.json({ profile: enriched });
}
