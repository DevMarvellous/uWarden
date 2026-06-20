import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPersona } from '@/lib/personas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Monetization switch — mirror of the extension's UWARDEN_CONFIG.PREMIUM_FOR_ALL.
// Today everyone is premium. Set PREMIUM_FOR_ALL=false in env to gate AI roasts
// behind the user's real `is_pro` flag once payments exist.
const PREMIUM_FOR_ALL = process.env.PREMIUM_FOR_ALL !== 'false';

export const dynamic = 'force-dynamic';

function randomFrom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(request: NextRequest) {
  const persona = getPersona();
  try {
    const body = await request.json();
    const { url, site_name, work_goal, visit_count_today, time_of_day } = body;
    const activePersona = getPersona(body.persona);

    // Require a valid Supabase session so the Gemini key cannot be abused by
    // anonymous callers.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Entitlement gate. AI roasts are premium; everyone is premium today.
    let entitled = PREMIUM_FOR_ALL;
    if (!entitled) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_pro')
        .eq('id', user.id)
        .single();
      entitled = !!profile?.is_pro;
    }

    // Not entitled → serve a static roast (keeps the overlay UX identical).
    if (!entitled) {
      return NextResponse.json({ roast: randomFrom(activePersona.fallbacks) });
    }

    const prompt = activePersona.buildPrompt({
      site_name,
      url,
      work_goal,
      time_of_day,
      visit_count_today,
    });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.9 },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const roast = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!roast) {
      // Fallback to a static roast if Gemini fails or is rate-limited.
      return NextResponse.json({ roast: randomFrom(activePersona.fallbacks) });
    }

    return NextResponse.json({ roast, persona: activePersona.id });
  } catch (error) {
    console.error('Roast generation error:', error);
    // Last-resort fallback so the overlay always has something to show.
    return NextResponse.json({ roast: randomFrom(persona.fallbacks) });
  }
}
