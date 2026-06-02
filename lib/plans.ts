export const PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for solo PMs and freelancers',
    projects: 3,
    teamMembers: 3,
    features: ['3 Projects', '3 Team members/project', 'AI features', 'Time & Billing'],
    notIncluded: ['Automations', 'White label emails', 'Priority support'],
    prices: {
      monthly: { id: 'price_1TdjWgB2X3LkDhkWCh4mHGvs', amount: 17 },
      quarterly: { id: 'price_1TdjWgB2X3LkDhkWfRlBPSJH', amount: 42 },
      yearly: { id: 'price_1TdjXrB2X3LkDhkWxR2V9BBo', amount: 147 },
    }
  },
  pro: {
    name: 'Pro',
    description: 'For growing agencies and consultancies',
    projects: 10,
    teamMembers: 8,
    features: ['10 Projects', '8 Team members/project', 'All AI features', 'Time & Billing', 'n8n Automations', 'Client Portal'],
    notIncluded: ['White label emails', 'Priority support'],
    prices: {
      monthly: { id: 'price_1TdjgxB2X3LkDhkWabdHxsdr', amount: 37 },
      quarterly: { id: 'price_1TdjhcB2X3LkDhkWyLYDj2Zq', amount: 89 },
      yearly: { id: 'price_1TdjiBB2X3LkDhkWuGKOt45V', amount: 297 },
    }
  },
  agency: {
    name: 'Agency',
    description: 'Unlimited power for large teams',
    projects: -1, // unlimited
    teamMembers: -1, // unlimited
    features: ['Unlimited Projects', 'Unlimited Team members', 'All AI features', 'Time & Billing', 'n8n Automations', 'Client Portal', 'White label emails', 'Priority support'],
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
