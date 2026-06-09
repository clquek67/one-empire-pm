import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({
    resendKey: process.env.RESEND_API_KEY ? `present (${process.env.RESEND_API_KEY.slice(0,8)}...)` : 'MISSING',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    nodeEnv: process.env.NODE_ENV
  })
}
