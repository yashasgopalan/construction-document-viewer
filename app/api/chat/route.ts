import { NextRequest, NextResponse } from 'next/server'

type Role = 'system' | 'user' | 'assistant'

type HFContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface ChatMessage {
  role: 'user' | 'assistant'
  content: Array<{
    type: 'image' | 'text'
    image?: string // local path, URL, or base64 (we'll map to image_url)
    text?: string
  }>
}

interface ChatRequest {
  messages: ChatMessage[]
  pdfContext?: string
  documentName?: string
  screenshot?: string
}

// Accepts string | array | already-HF-shaped content safely
function toHFParts(parts: unknown): HFContentPart[] {
  // If content is a plain string (legacy client), wrap as text
  if (!Array.isArray(parts)) {
    if (parts == null) return []
    return [{ type: 'text', text: String(parts) }]
  }

  // If content is an array, normalize each element
  return parts.flatMap((p: any) => {
    if (!p) return []

    // Allow simple string items inside array
    if (typeof p === 'string') return [{ type: 'text', text: p }]

    // Text part
    if (p.type === 'text') return [{ type: 'text', text: p.text ?? '' }]

    // Your client shape: { type: 'image', image: '...' }
    if (p.type === 'image' && typeof p.image === 'string') {
      return [{ type: 'image_url', image_url: { url: p.image } }]
    }

    // Already HF-shaped: { type: 'image_url', image_url: { url } }
    if (p.type === 'image_url' && p.image_url?.url) return [p as HFContentPart]

    // Tolerate { type: 'image_url', url: '...' }
    if (p.type === 'image_url' && typeof p.url === 'string') {
      return [{ type: 'image_url', image_url: { url: p.url } }]
    }

    // Fallback: stringify unknown objects as text so the call still works
    try {
      return [{ type: 'text', text: JSON.stringify(p) }]
    } catch {
      return [{ type: 'text', text: String(p) }]
    }
  })
}

function normalizeMessage(m: any): { role: Role; content: HFContentPart[] } {
  const role: Role = m?.role === 'assistant' ? 'assistant' : 'user'
  const content = toHFParts(m?.content)
  return { role, content }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, pdfContext, documentName, screenshot } = body

    let updatedMessages = Array.isArray(messages) ? [...messages] : [];
  if (screenshot) {
  updatedMessages.push({
    role: 'user',
    content: [ { type: 'image', image: screenshot } ]
  });
}


    const systemPrompt =
      `You are Smortr AI, a helpful assistant for analyzing construction documents and PDFs.\n\n` +
      `You have access to the following document: ${documentName || 'Current PDF'}\n\n` +
      (pdfContext
        ? `Document Context:\n${pdfContext}\n\n` +
          `Please analyze this document and answer questions about it. Focus on construction details, specifications, measurements, materials, and any technical information present.\n`
        : 'Please help analyze the construction document.\n') +
      `Be concise, accurate, and helpful. If you cannot find specific information in the provided context, say so clearly.`

    // Build OpenAI/HF Messages API payload:
    const formattedMessages: Array<{ role: Role; content: HFContentPart[] }> = [
      { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
      ...(Array.isArray(updatedMessages) ? updatedMessages.map(normalizeMessage) : []),
    ]
     
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        'Incoming messages shape:',
        Array.isArray(messages)
          ? messages.map(m => ({ role: m?.role, isArray: Array.isArray(m?.content), type: typeof m?.content }))
          : typeof messages
      );
      console.log('Screenshot field:', screenshot);
    }


    const endpoint = process.env.QWEN_API_ENDPOINT || 'https://router.huggingface.co/v1/chat/completions'
    const apiKey = process.env.HF_TOKEN || process.env.OPENAI_API_KEY // allow either name

    if (!apiKey) {
      throw new Error('No API key configured. Set HF_TOKEN (preferred) or OPENAI_API_KEY.')
    }

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-VL-7B-Instruct',
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    })

    const raw = await apiResponse.text()
    if (!apiResponse.ok) {
      // surface real provider error to logs/clients
      throw new Error(`API error ${apiResponse.status}: ${raw}`)
    }

    const data = JSON.parse(raw)
    const msg = data.choices?.[0]?.message

    // Coerce array-of-parts -> string for your client
    const content =
      Array.isArray(msg?.content)
        ? msg.content
            .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
            .filter(Boolean)
            .join('\n')
        : msg?.content || 'I could not parse the model response.'

    return NextResponse.json({
      response: content,
      usage: data.usage || null,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    const fallbackResponse =
      `I’m currently unable to process your request due to a technical issue.\n` +
      `Details: ${error?.message ?? 'unknown error'}`

    return NextResponse.json(
      { response: fallbackResponse, error: 'API processing failed' },
      { status: 500 },
    )
  }
}
