export const PLANS = {
  starter: {
    name: 'Starter',
    description: 'For freelancers managing their own projects',
    projects: 5,
    teamMembers: 0,
    features: [
      '5 Projects',
      'Tasks & Kanban Board',
      'Risk Radar',
      'Timeline & Milestones',
      'Time & Billing',
      'Notifications & Task dependencies',
    ],
    notIncluded: [
      'Proposals & Estimates (AI)',
      'AI Planner',
      'Meetings AI',
      'Scope Control AI',
      'Reports & AI Reports',
      'Recurring Retainer Invoices',
      'Client Portal',
      'Workload AI',
      'Team member login',
      'Invoice automation',
    ],
    prices: {
      monthly: { id: 'price_1TdjWgB2X3LkDhkWCh4mHGvs', amount: 17 },
      quarterly: { id: 'price_1TdjWgB2X3LkDhkWfRlBPSJH', amount: 42 },
      yearly: { id: 'price_1TdjXrB2X3LkDhkWxR2V9BBo', amount: 147 },
    }
  },
  pro: {
    name: 'Pro',
    description: 'For consultants who want AI to work smarter',
    projects: 10,
    teamMembers: 3,
    features: [
      '10 Projects',
      '3 Team member logins',
      'AI Planner — generate full project plans',
      'Meetings AI — structured summaries & actions',
      'Scope Control AI — change impact analysis',
      'Proposals & Estimates (AI)',
      'Invoice email automation',
      'Weekly AI Status Reports',
      'Professional Reports with executive summary',
      'n8n Automations',
    ],
    notIncluded: [
      'Recurring Retainer Invoices',
      'Client Portal & client logins',
      'Workload AI',
      'End-of-Sprint & Client-Ready Reports',
      'White label emails',
    ],
    prices: {
      monthly: { id: 'price_1TdjgxB2X3LkDhkWabdHxsdr', amount: 37 },
      quarterly: { id: 'price_1TdjhcB2X3LkDhkWyLYDj2Zq', amount: 89 },
      yearly: { id: 'price_1TdjiBB2X3LkDhkWuGKOt45V', amount: 297 },
    }
  },
  agency: {
    name: 'Agency',
    description: 'For agencies running a team and retainer clients',
    projects: 25,
    teamMembers: 15,
    features: [
      '25 Projects',
      '15 Team member logins',
      'Everything in Pro',
      'Recurring Retainer Invoices (auto-send)',
      'Client Portal & client logins',
      'Workload AI — capacity & rebalancing',
      'End-of-Sprint AI Reports',
      'Client-Ready AI Reports',
      'White label emails',
      'Priority support',
      'Early access to new features',
    ],
    notIncluded: [],
    prices: {
      monthly: { id: 'price_1TdjjLB2X3LkDhkW4Cul3QwO', amount: 67 },
      quarterly: { id: 'price_1TdjkMB2X3LkDhkWQeYJrMZN', amount: 161 },
      yearly: { id: 'price_1TdjkxB2X3LkDhkW1yzpYoLL', amount: 537 },
    }
  }
}

export type PlanType = keyof typeof PLANS
export type PeriodType = 'monthly' | 'quarterly' | 'yearly'

export function getPlanFromPriceId(priceId: string): { plan: PlanType, period: PeriodType } | null {
  for (const [plan, data] of Object.entries(PLANS)) {
    for (const [period, price] of Object.entries(data.prices)) {
      if (price.id === priceId) {
        return { plan: plan as PlanType, period: period as PeriodType }
      }
    }
  }
  return null
}
