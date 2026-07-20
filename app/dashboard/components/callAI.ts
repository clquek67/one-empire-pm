export async function callAI(system: string, content: string, _maxTokens = 1000): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content }] })
    })
    const data = await res.json()
    if (data.content?.[0]?.text) return data.content[0].text
    console.error('AI API error:', res.status, JSON.stringify(data))
    return `API error: ${data.error?.message || data.error?.type || res.status}`
  } catch (err) {
    console.error('callAI fetch error:', err)
    return 'Network error — please try again.'
  }
}
