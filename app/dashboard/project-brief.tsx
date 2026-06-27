'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

interface Stakeholder {
  name: string;
  role: string;
  email: string;
  notes: string;
}

interface ProjectProfile {
  id?: string;
  project_id: string;
  goals: string;
  timeline_summary: string;
  notes: string;
  stakeholders: Stakeholder[];
  risk_summary: string;
  project_style: string;
  communication_cadence: string;
  ai_enriched_at?: string;
  is_template?: boolean;
  template_name?: string;
}

interface ProjectBriefProps {
  projectId: string;
  projectName: string;
  planId: string;
}

const isPro    = (planId: string) => ['pro', 'agency'].includes(planId);
const isAgency = (planId: string) => planId === 'agency';

const gold    = '#C9A84C';
const goldDim = '#C9993A';
const navy    = '#050D1A';
const border  = 'rgba(201,153,58,0.2)';
const borderMd = 'rgba(201,153,58,0.35)';
const textBright = '#F0F6FF';
const textMid    = '#C8DCF4';
const textDim    = '#8FA8C8';

const inp: React.CSSProperties = {
  width: '100%',
  background: 'rgba(16,36,72,0.8)',
  border: `1px solid ${border}`,
  borderRadius: '3px',
  padding: '9px 12px',
  fontSize: '12px',
  color: textBright,
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
  resize: 'vertical',
};

export default function ProjectBrief({ projectId, projectName, planId }: ProjectBriefProps) {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProjectProfile>({
    project_id: projectId,
    goals: '',
    timeline_summary: '',
    notes: '',
    stakeholders: [],
    risk_summary: '',
    project_style: '',
    communication_cadence: '',
  });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [activeTab, setActiveTab] = useState<'brief' | 'stakeholders' | 'templates'>('brief');

  // Templates state
  const [templates, setTemplates]             = useState<ProjectProfile[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate]   = useState(false);
  const [templateSaved, setTemplateSaved]     = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, [projectId]);
  useEffect(() => { if (activeTab === 'templates' && isAgency(planId)) loadTemplates(); }, [activeTab]);

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase
      .from('project_profiles')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (data) setProfile({ ...data, stakeholders: data.stakeholders || [] });
    setLoading(false);
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    const { data } = await supabase
      .from('project_profiles')
      .select('*')
      .eq('is_template', true)
      .order('template_name', { ascending: true });
    if (data) setTemplates(data);
    setTemplatesLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    await supabase
      .from('project_profiles')
      .upsert({ ...profile, project_id: projectId }, { onConflict: 'project_id' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  async function enrichWithAI() {
    if (!isPro(planId)) return;
    setEnriching(true);
    try {
      const res = await fetch('/api/project-brief/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
    } catch (e) {
      console.error('Enrichment failed', e);
    }
    setEnriching(false);
  }

  // Save the current brief as a named template (Agency only)
  async function saveAsTemplate() {
    if (!newTemplateName.trim() || !isAgency(planId)) return;
    setSavingTemplate(true);

    // Templates are stored as project_profiles rows with is_template = true
    // We use a fake project_id prefix to avoid UNIQUE constraint on real project_ids
    const templateProjectId = `template_${Date.now()}`;

    const { error } = await supabase.from('project_profiles').insert({
      project_id: templateProjectId,
      goals: profile.goals,
      timeline_summary: profile.timeline_summary,
      notes: profile.notes,
      stakeholders: profile.stakeholders,
      risk_summary: profile.risk_summary,
      project_style: profile.project_style,
      communication_cadence: profile.communication_cadence,
      is_template: true,
      template_name: newTemplateName.trim(),
      template_source_id: profile.id || null,
    });

    if (!error) {
      setTemplateSaved(true);
      setNewTemplateName('');
      setTimeout(() => setTemplateSaved(false), 2500);
      await loadTemplates();
    }
    setSavingTemplate(false);
  }

  // Apply a template into the current project brief
  async function applyTemplate(template: ProjectProfile) {
    if (!window.confirm(`Apply template "${template.template_name}" to ${projectName}?\n\nThis will overwrite the current brief fields. Your stakeholders will be kept.`)) return;
    setApplyingTemplate(template.id || '');

    const merged: ProjectProfile = {
      ...profile,
      goals: template.goals || profile.goals,
      timeline_summary: template.timeline_summary || profile.timeline_summary,
      notes: template.notes || profile.notes,
      risk_summary: template.risk_summary || profile.risk_summary,
      project_style: template.project_style || profile.project_style,
      communication_cadence: template.communication_cadence || profile.communication_cadence,
      // Stakeholders are NOT overwritten — they're project-specific
    };

    setProfile(merged);

    // Persist immediately
    await supabase
      .from('project_profiles')
      .upsert({ ...merged, project_id: projectId }, { onConflict: 'project_id' });

    setApplyingTemplate(null);
    setActiveTab('brief'); // Jump back to brief so user sees the applied content
  }

  async function deleteTemplate(template: ProjectProfile) {
    if (!template.id) return;
    if (!window.confirm(`Delete template "${template.template_name}"? This cannot be undone.`)) return;
    await supabase.from('project_profiles').delete().eq('id', template.id);
    await loadTemplates();
  }

  function addStakeholder() {
    setProfile(prev => ({
      ...prev,
      stakeholders: [...prev.stakeholders, { name: '', role: '', email: '', notes: '' }],
    }));
  }

  function updateStakeholder(index: number, field: keyof Stakeholder, value: string) {
    setProfile(prev => {
      const updated = [...prev.stakeholders];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, stakeholders: updated };
    });
  }

  function removeStakeholder(index: number) {
    setProfile(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((_, i) => i !== index),
    }));
  }

  const tabs = [
    { id: 'brief',        label: 'Brief' },
    { id: 'stakeholders', label: 'Stakeholders', proOnly: true },
    { id: 'templates',    label: 'Templates',    agencyOnly: true },
  ] as const;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: textDim, fontSize: '12px' }}>
        Loading brief...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 600, color: textBright }}>
            Project Brief
          </div>
          <div style={{ fontSize: '11px', color: textDim, marginTop: '2px' }}>
            {isPro(planId)
              ? 'AI agents read this brief automatically before every response.'
              : 'Upgrade to Pro to have AI agents read this brief automatically.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isPro(planId) && (
            <button onClick={enrichWithAI} disabled={enriching}
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', padding: '6px 12px', borderRadius: '2px', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.3)`, color: gold, cursor: enriching ? 'not-allowed' : 'pointer', opacity: enriching ? 0.6 : 1 }}>
              {enriching ? 'Refreshing...' : '✦ AI Refresh'}
            </button>
          )}
          <button onClick={saveProfile} disabled={saving}
            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', padding: '6px 14px', borderRadius: '2px', background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: navy, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Brief'}
          </button>
        </div>
      </div>

      {/* Upgrade banner */}
      {!isPro(planId) && (
        <div style={{ padding: '10px 14px', background: 'rgba(201,153,58,0.05)', border: `1px solid ${border}`, borderRadius: '3px', fontSize: '11px', color: textMid }}>
          ✦ AI agents read your project brief automatically on Pro and above.{' '}
          <a href="/pricing" style={{ color: gold }}>Plans from $37/mo</a>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {tabs.map(t => {
          const locked = (t as any).proOnly && !isPro(planId) || (t as any).agencyOnly && !isAgency(planId);
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, padding: '7px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? `2px solid ${gold}` : '2px solid transparent', color: activeTab === t.id ? gold : textDim, cursor: 'pointer', marginBottom: '-1px', textTransform: 'capitalize' }}>
              {t.label}
              {(t as any).proOnly && !isPro(planId) && (
                <span style={{ marginLeft: '6px', fontSize: '8px', background: 'rgba(201,153,58,0.15)', color: gold, padding: '1px 5px', borderRadius: '2px' }}>PRO</span>
              )}
              {(t as any).agencyOnly && !isAgency(planId) && (
                <span style={{ marginLeft: '6px', fontSize: '8px', background: 'rgba(77,216,240,0.12)', color: '#4DD8F0', padding: '1px 5px', borderRadius: '2px' }}>AGENCY</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── BRIEF TAB ── */}
      {activeTab === 'brief' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>PROJECT GOALS</div>
            <textarea value={profile.goals} onChange={e => setProfile(p => ({ ...p, goals: e.target.value }))}
              placeholder="What does success look like? What are the key deliverables and outcomes?"
              rows={3} style={inp} />
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>TIMELINE SUMMARY</div>
            <textarea value={profile.timeline_summary} onChange={e => setProfile(p => ({ ...p, timeline_summary: e.target.value }))}
              placeholder="Key dates, phases, and deadlines."
              rows={2} style={inp} />
          </div>
          <div style={{ opacity: isPro(planId) ? 1 : 0.4, pointerEvents: isPro(planId) ? 'auto' : 'none' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>
              RISK SUMMARY {!isPro(planId) && <span style={{ color: gold }}>— PRO</span>}
            </div>
            <textarea value={profile.risk_summary} onChange={e => setProfile(p => ({ ...p, risk_summary: e.target.value }))}
              placeholder="Top risks and how you are mitigating them."
              rows={2} style={inp} />
          </div>
          <div style={{ opacity: isPro(planId) ? 1 : 0.4, pointerEvents: isPro(planId) ? 'auto' : 'none' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>
              CLIENT AND COMMUNICATION STYLE {!isPro(planId) && <span style={{ color: gold }}>— PRO</span>}
            </div>
            <textarea value={profile.project_style} onChange={e => setProfile(p => ({ ...p, project_style: e.target.value }))}
              placeholder="e.g. Client prefers formal tone, weekly updates on Fridays, sensitive to delays."
              rows={2} style={inp} />
          </div>
          <div style={{ opacity: isPro(planId) ? 1 : 0.4, pointerEvents: isPro(planId) ? 'auto' : 'none' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>
              REPORTING CADENCE {!isPro(planId) && <span style={{ color: gold }}>— PRO</span>}
            </div>
            <select value={profile.communication_cadence} onChange={e => setProfile(p => ({ ...p, communication_cadence: e.target.value }))}
              style={{ ...inp, resize: undefined }}>
              <option value="">Select cadence...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="milestone">Milestone-based</option>
            </select>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '5px' }}>ADDITIONAL NOTES</div>
            <textarea value={profile.notes} onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))}
              placeholder="Anything else agents should know about this project."
              rows={2} style={inp} />
          </div>

          {/* Agency shortcut — save as template right from the brief tab */}
          {isAgency(planId) && (
            <div style={{ marginTop: '4px', padding: '12px 14px', background: 'rgba(77,216,240,0.04)', border: '1px solid rgba(77,216,240,0.15)', borderRadius: '3px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: '#4DD8F0', marginBottom: '8px' }}>◫ SAVE AS TEMPLATE</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="Template name e.g. Agency Retainer, SaaS Build..."
                  style={{ ...inp, resize: undefined, flex: 1 }}
                />
                <button onClick={saveAsTemplate} disabled={!newTemplateName.trim() || savingTemplate}
                  style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', padding: '8px 14px', borderRadius: '2px', background: 'rgba(77,216,240,0.12)', border: '1px solid rgba(77,216,240,0.3)', color: '#4DD8F0', cursor: (!newTemplateName.trim() || savingTemplate) ? 'not-allowed' : 'pointer', opacity: (!newTemplateName.trim() || savingTemplate) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {savingTemplate ? 'Saving...' : templateSaved ? '✓ Saved!' : '◫ Save →'}
                </button>
              </div>
              <div style={{ fontSize: '10px', color: textDim, marginTop: '6px' }}>
                Saved templates can be applied to any future project in one click.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STAKEHOLDERS TAB ── */}
      {activeTab === 'stakeholders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!isPro(planId) ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '11px', color: textDim, marginBottom: '12px' }}>Stakeholder mapping is available on Pro and above.</div>
              <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: navy, padding: '8px 16px', borderRadius: '2px', textDecoration: 'none' }}>
                Upgrade to Pro
              </a>
            </div>
          ) : (
            <>
              {profile.stakeholders.map((s, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(16,36,72,0.5)', border: `1px solid rgba(201,153,58,0.15)`, borderRadius: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: goldDim }}>STAKEHOLDER {i + 1}</span>
                    <button onClick={() => removeStakeholder(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#FF9090' }}>
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input value={s.name}  onChange={e => updateStakeholder(i, 'name',  e.target.value)} placeholder="Name"  style={{ ...inp, resize: undefined }} />
                    <input value={s.role}  onChange={e => updateStakeholder(i, 'role',  e.target.value)} placeholder="Role"  style={{ ...inp, resize: undefined }} />
                    <input value={s.email} onChange={e => updateStakeholder(i, 'email', e.target.value)} placeholder="Email" style={{ ...inp, resize: undefined }} />
                    <input value={s.notes} onChange={e => updateStakeholder(i, 'notes', e.target.value)} placeholder="Notes" style={{ ...inp, resize: undefined }} />
                  </div>
                </div>
              ))}
              <button onClick={addStakeholder}
                style={{ padding: '10px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '3px', background: 'none', color: textDim, cursor: 'pointer', fontSize: '11px', fontFamily: 'Rajdhani, sans-serif' }}>
                + Add Stakeholder
              </button>
            </>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isAgency(planId) ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '20px', marginBottom: '10px', opacity: 0.2 }}>◫</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '6px' }}>Brief Templates are an Agency feature</div>
              <div style={{ fontSize: '11px', color: textDim, marginBottom: '14px', lineHeight: 1.6 }}>
                Save briefs as reusable templates and apply them to new client projects in one click.
              </div>
              <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: navy, padding: '8px 16px', borderRadius: '2px', textDecoration: 'none' }}>
                Upgrade to Agency →
              </a>
            </div>
          ) : (
            <>
              {/* Save current brief as template */}
              <div style={{ padding: '14px 16px', background: 'rgba(77,216,240,0.04)', border: '1px solid rgba(77,216,240,0.15)', borderRadius: '3px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: '#4DD8F0', marginBottom: '10px' }}>◫ SAVE CURRENT BRIEF AS TEMPLATE</div>
                <div style={{ fontSize: '11px', color: textDim, marginBottom: '10px', lineHeight: 1.6 }}>
                  Saves the current brief for <strong style={{ color: textMid }}>{projectName}</strong> as a reusable template. Stakeholders are not included.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="Template name e.g. Agency Retainer, SaaS Build, E-Commerce..."
                    style={{ ...inp, resize: undefined, flex: 1 }}
                  />
                  <button onClick={saveAsTemplate} disabled={!newTemplateName.trim() || savingTemplate}
                    style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', padding: '8px 16px', borderRadius: '2px', background: 'rgba(77,216,240,0.12)', border: '1px solid rgba(77,216,240,0.3)', color: '#4DD8F0', cursor: (!newTemplateName.trim() || savingTemplate) ? 'not-allowed' : 'pointer', opacity: (!newTemplateName.trim() || savingTemplate) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    {savingTemplate ? 'Saving...' : templateSaved ? '✓ Saved!' : '◫ Save Template →'}
                  </button>
                </div>
              </div>

              {/* Templates list */}
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '10px' }}>
                  SAVED TEMPLATES · {templates.length}
                </div>

                {templatesLoading && (
                  <div style={{ fontSize: '11px', color: textDim, padding: '16px 0' }}>Loading templates...</div>
                )}

                {!templatesLoading && templates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                    <div style={{ fontSize: '18px', opacity: 0.2, marginBottom: '8px' }}>◫</div>
                    <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.6 }}>
                      No templates yet. Fill in a brief above and save it as a template — then apply it to any future project in one click.
                    </div>
                  </div>
                )}

                {templates.map(t => (
                  <div key={t.id} style={{ padding: '14px 16px', background: 'rgba(16,36,72,0.5)', border: `1px solid ${border}`, borderRadius: '3px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 600, color: textBright, marginBottom: '4px' }}>
                          {t.template_name}
                        </div>
                        {/* Preview snippets */}
                        {t.goals && (
                          <div style={{ fontSize: '11px', color: textDim, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, marginRight: '6px' }}>GOALS</span>
                            {t.goals.slice(0, 80)}{t.goals.length > 80 ? '…' : ''}
                          </div>
                        )}
                        {t.project_style && (
                          <div style={{ fontSize: '11px', color: textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, marginRight: '6px' }}>STYLE</span>
                            {t.project_style.slice(0, 80)}{t.project_style.length > 80 ? '…' : ''}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {t.communication_cadence && (
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', padding: '2px 6px', borderRadius: '2px', background: 'rgba(201,153,58,0.08)', color: goldDim, border: `1px solid rgba(201,153,58,0.2)` }}>
                              {t.communication_cadence}
                            </span>
                          )}
                          {t.risk_summary && (
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', padding: '2px 6px', borderRadius: '2px', background: 'rgba(201,153,58,0.08)', color: goldDim, border: `1px solid rgba(201,153,58,0.2)` }}>
                              has risk summary
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => applyTemplate(t)}
                          disabled={applyingTemplate === t.id}
                          style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', padding: '6px 12px', borderRadius: '2px', background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: navy, border: 'none', cursor: applyingTemplate === t.id ? 'not-allowed' : 'pointer', opacity: applyingTemplate === t.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                          {applyingTemplate === t.id ? 'Applying...' : '⊕ Apply →'}
                        </button>
                        <button
                          onClick={() => deleteTemplate(t)}
                          style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: '2px', background: 'transparent', border: '1px solid rgba(226,75,74,0.25)', color: 'rgba(255,144,144,0.7)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {profile.ai_enriched_at && (
        <div style={{ fontSize: '10px', color: '#6080A0' }}>
          Last AI refresh: {new Date(profile.ai_enriched_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
