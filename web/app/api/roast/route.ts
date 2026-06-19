import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url, site_name, work_goal, visit_count_today, time_of_day } =
      await request.json();

    // Require a valid Supabase session. This is free for all users, but the
    // request must come from a signed-in user so the Gemini key cannot be
    // abused by anonymous callers.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Call Gemini 1.5 Flash
    const prompt = `You are a Disappointed Nigerian Dad. Your child has just opened ${site_name} instead of working.

Context:
- Site opened: ${site_name} (${url})
- What they should be working on: ${work_goal || 'their important tasks'}
- Current time: ${time_of_day}
- Times visited today: ${visit_count_today}

Write ONE roast. Rules:
- 1 to 2 sentences only. Never more.
- Tone: quiet, tired, deeply unimpressed. Not angry. Just done.
- Zero exclamation marks. Zero.
- Reference their actual work goal directly in the roast.
- Be specific to what people actually do on that site.
- The more visits today, the more exhausted and resigned the tone.
- Sound exactly like a Nigerian father who expected better and is no longer surprised.

Return only the roast text. No quotes. No labels. No explanation.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.9 }
        })
      }
    );

    const geminiData = await geminiResponse.json();
    const roast = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!roast) {
      // Fallback to a static roast if Gemini fails
      const fallbacks = [
        "You opened this site again. I am not surprised. I am just tired.",
        "This site will not finish your work. Only you can do that. Close it.",
        "I watched you open this. I chose not to comment. I am commenting now."
      ];
      return NextResponse.json({
        roast: fallbacks[Math.floor(Math.random() * fallbacks.length)]
      });
    }

    return NextResponse.json({ roast });
  } catch (error) {
    console.error('Roast generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast' },
      { status: 500 }
    );
  }
}