import { NextResponse } from 'next/server';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || process.env.NEXT_PUBLIC_ZHIPU_API_KEY;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export async function POST(req: Request) {
  try {
    if (!ZHIPU_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    const { messages } = await req.json();
    
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: messages,
        stream: false,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Zhipu API error:', data);
      return NextResponse.json({ error: data.error?.message || 'AI 服务错误' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
