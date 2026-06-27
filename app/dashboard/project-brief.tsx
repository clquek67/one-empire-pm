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
}

interface ProjectBriefProps {
  projectId: string;
  projectName: string;
  planId: string;
}

const isPro = (planId: string) => ['pro', 'agency'].includes(planId);
const isAgency = (planId: string) => planId === 'agency';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'brief' | 'stakeholders'>('brief');

  useEffect(() => {
    loadProfile();
  }, [projectId]);

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase
      .from('project_profiles')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (data) {
      setProfile({
        ...data,
        stakeholders: data.stakeholders || [],
      });
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from('project_profiles')
      .upsert({ ...profile, project_id: projectId }, { onConflict: 'project_id' });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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
      if (data.profile) {
        setProfile(prev => ({ ...prev, ...data.profile }));
      }
    } catch (e) {
      console.error('Enrichment failed', e);
    }
    setEnriching(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Project Brief</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isPro(planId)
              ? 'AI agents will read this brief automatically before every response.'
              : 'Upgrade to Pro to have AI agents read this brief automatically.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPro(planId) && (
            <button
              onClick={enrichWithAI}
              disabled={enriching}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 rounded-lg hover:bg-[#C9A84C]/20 transition-colors disabled:opacity-50"
            >
              {enriching ? (
                <div className="w-3.5 h-3.5 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>✦</span>
              )}
              {enriching ? 'Enriching...' : 'AI Refresh'}
            </button>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-[#C9A84C] text-[#060e1a] font-medium rounded-lg hover:bg-[#E8B84B] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Brief'}
          </button>
        </div>
      </div>

      {/* Pro badge */}
      {!isPro(planId) && (
        <div className="flex items-center gap-3 p-3 bg-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-lg">
          <span className="text-[#C9A84C]">✦</span>
          <p className="text-sm text-gray-300">
            AI agents read your project brief automatically on Pro and above.{' '}
            <a href="/pricing" className="text-[#C9A84C] hover:underline">
              Plans from $37/mo
            </a>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {['brief', 'stakeholders'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'brief' | 'stakeholders')}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab}
            {tab === 'stakeholders' && !isPro(planId) && (
              <span className="ml-1.5 text-xs bg-[#C9A84C]/20 text-[#C9A84C] px-1.5 py-0.5 rounded">Pro</span>
            )}
          </button>
        ))}
      </div>

      {/* Brief Tab */}
      {activeTab === 'brief' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Project Goals
            </label>
            <textarea
              value={profile.goals}
              onChange={e => setProfile(prev => ({ ...prev, goals: e.target.value }))}
              placeholder="What does success look like? What are the key deliverables and outcomes?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Timeline Summary
            </label>
            <textarea
              value={profile.timeline_summary}
              onChange={e => setProfile(prev => ({ ...prev, timeline_summary: e.target.value }))}
              placeholder="Key dates, phases, and deadlines. E.g. Phase 1 ends July 15, final delivery Aug 30."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>

          <div className={!isPro(planId) ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Risk Summary
              {!isPro(planId) && <span className="ml-2 text-xs text-[#C9A84C]">Pro</span>}
            </label>
            <textarea
              value={profile.risk_summary}
              onChange={e => setProfile(prev => ({ ...prev, risk_summary: e.target.value }))}
              placeholder="Top risks and how you&apos;re mitigating them."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>

          <div className={!isPro(planId) ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Client &amp; Communication Style
              {!isPro(planId) && <span className="ml-2 text-xs text-[#C9A84C]">Pro</span>}
            </label>
            <textarea
              value={profile.project_style}
              onChange={e => setProfile(prev => ({ ...prev, project_style: e.target.value }))}
              placeholder="E.g. Client prefers formal tone, weekly updates on Fridays, sensitive to delays."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>

          <div className={!isPro(planId) ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Reporting Cadence
              {!isPro(planId) && <span className="ml-2 text-xs text-[#C9A84C]">Pro</span>}
            </label>
            <select
              value={profile.communication_cadence}
              onChange={e => setProfile(prev => ({ ...prev, communication_cadence: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
            >
              <option value="">Select cadence...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="milestone">Milestone-based</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Additional Notes
            </label>
            <textarea
              value={profile.notes}
              onChange={e => setProfile(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Anything else agents should know about this project."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* Stakeholders Tab */}
      {activeTab === 'stakeholders' && (
        <div className="space-y-4">
          {!isPro(planId) ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm mb-3">Stakeholder mapping is available on Pro and above.</p>
              
                href="/pricing"
                className="inline-block px-4 py-2 bg-[#C9A84C] text-[#060e1a] text-sm font-medium rounded-lg hover:bg-[#E8B84B] transition-colors"
              >
                Upgrade to Pro
              </a>
            </div>
          ) : (
            <>
              {profile.stakeholders.map((s, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Stakeholder {i + 1}</span>
                    <button
                      onClick={() => removeStakeholder(i)}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={s.name}
                      onChange={e => updateStakeholder(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                    />
                    <input
                      value={s.role}
                      onChange={e => updateStakeholder(i, 'role', e.target.value)}
                      placeholder="Role (e.g. Client, Sponsor)"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                    />
                    <input
                      value={s.email}
                      onChange={e => updateStakeholder(i, 'email', e.target.value)}
                      placeholder="Email"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                    />
                    <input
                      value={s.notes}
                      onChange={e => updateStakeholder(i, 'notes', e.target.value)}
                      placeholder="Notes (preferences, sensitivities)"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C9A84C]/50"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addStakeholder}
                className="w-full py-2.5 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition-colors"
              >
                + Add Stakeholder
              </button>
            </>
          )}
        </div>
      )}

      {/* Last enriched */}
      {profile.ai_enriched_at && (
        <p className="text-xs text-gray-500">
          Last AI refresh: {new Date(profile.ai_enriched_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
