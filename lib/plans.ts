export const PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for solo PMs and freelancers',
    projects: 3,
    teamMembers: 3,
    features: ['3 Projects', '3 Team members/project', 'AI features', 'Time & Billing'],
    notIncluded: ['Automations', 'White label emails', 'Priority support'],
    prices: {
      monthly: { id: 'price_1Te3lBB2X3LkDhkWjswqdbst', amount: 17 },
      quarterly: { id: 'price_1Te3lBB2X3LkDhkWi7PLWCpf', amount: 42 },
      yearly: { id: 'price_1Te3lBB2X3LkDhkWjmq59bTW', amount: 147 },
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
      monthly: { id: 'price_1Te3lgB2X3LkDhkWGut9MGfx', amount: 37 },
      quarterly: { id: 'price_1Te3m3B2X3LkDhkWDACyv5TO', amount: 89 },
      yearly: { id: 'price_1Te3mLB2X3LkDhkWA8kvHPIF', amount: 297 },
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
      monthly: { id: 'price_1Te3msB2X3LkDhkW17w1ArMh', amount: 67 },
      quarterly: { id: 'price_1Te3nNB2X3LkDhkWAgAR65yS', amount: 161 },
      yearly: { id: 'price_1Te3naB2X3LkDhkWd5otZS57', amount: 537 },
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
