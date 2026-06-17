import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = '8863990215:AAH2E5qkJbPePHEg5L7FSz5kz5Y36bUuzt0'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { chat_id, name } = await request.json()
    if (!chat_id) return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 })

    const firstName = (name || 'there').split(' ')[0]
    const text = `🏛 Empire PM\n\n✅ Connection successful, ${firstName}!\n\nYou will receive your daily project briefing at 9am Singapore time.\n\nHere is a preview of what you will receive:\n\n📋 DUE TODAY — tasks due today\n⚠️ OVERDUE — tasks past their due date\n🔴 RISKS — open overdue risks\n🏁 MILESTONES — upcoming this week\n💰 UNBILLED — hours ready to invoice\n\npm.one-empire.com`

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' })
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.description || 'Telegram error' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
