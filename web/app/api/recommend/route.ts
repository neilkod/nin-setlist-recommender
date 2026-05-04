import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import type { TargetVector } from '@/lib/types'

const VALID_ALBUMS = new Set([
  'pretty-hate-machine', 'broken', 'the-downward-spiral', 'the-fragile',
  'with-teeth', 'year-zero', 'ghosts-i-iv', 'the-slip', 'hesitation-marks',
  'not-the-actual-events', 'add-violence', 'bad-witch', 'tron-ares',
])

const PROMPT = `You are a Nine Inch Nails setlist recommender. A fan has described the kind of concert they want to find from NIN's 35+ year live archive. Parse their description into a JSON object representing their preferences.

Return ONLY valid JSON with these optional fields (omit any that aren't clearly implied):

{
  "nostalgia": <float 0.0–1.0 — 0=recent material, 1=classic early-career songs>,
  "rarity": <float 0.0–1.0 — 0=crowd-pleasing hits everyone knows, 1=deep cuts rarely played>,
  "tourRarity": <float 0.0–1.0 — 0=standard nightly setlist, 1=most off-script unique night>,
  "yearMin": <integer — earliest show year to consider>,
  "yearMax": <integer — latest show year to consider>,
  "albumWeights": <object — album slug → weight 0.0–1.0, higher = stronger preference>
}

Valid album slugs and their eras:
- pretty-hate-machine (1989, debut)
- broken (1992, EP)
- the-downward-spiral (1994)
- the-fragile (1999)
- with-teeth (2005)
- year-zero (2007)
- ghosts-i-iv (2008)
- the-slip (2008)
- hesitation-marks (2013)
- not-the-actual-events (2016)
- add-violence (2017)
- bad-witch (2018)
- tron-ares (2025)

Era date ranges:
- Early / PHM era: 1988–1991
- Broken / TDS era: 1992–1996
- Fragile era: 1999–2001
- With Teeth era: 2005–2007
- Year Zero / Ghosts / Slip era: 2007–2009
- Hesitation Marks era: 2013–2014
- Add Violence / Bad Witch era: 2016–2018
- Peel It Back era: 2025–2026

Examples:
- "late 90s heavy on The Fragile" → {"yearMin":1999,"yearMax":2001,"albumWeights":{"the-fragile":1.0},"nostalgia":0.4}
- "rare deep cuts from early career" → {"rarity":0.9,"nostalgia":0.8,"yearMax":1996}
- "most unusual setlist possible" → {"rarity":0.9,"tourRarity":0.9}
- "a hits-heavy crowd pleaser show" → {"rarity":0.1}
- "downward spiral era show" → {"albumWeights":{"the-downward-spiral":1.0},"yearMin":1994,"yearMax":1996}

Return {} if the description is too vague to extract any meaningful preferences.`

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  let text: string
  try {
    const body = await request.json()
    text = body?.text?.trim() ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent(`${PROMPT}\n\nFan description: "${text}"`)
    const raw = result.response.text()
    const parsed = JSON.parse(raw)

    // Sanitise — don't trust the model to stay in bounds
    const target: TargetVector = {}
    const clamp = (v: unknown): number | undefined =>
      typeof v === 'number' ? Math.min(1, Math.max(0, v)) : undefined

    const nostalgia = clamp(parsed.nostalgia)
    const rarity = clamp(parsed.rarity)
    const tourRarity = clamp(parsed.tourRarity)
    if (nostalgia !== undefined)  target.nostalgia  = nostalgia
    if (rarity !== undefined)     target.rarity     = rarity
    if (tourRarity !== undefined) target.tourRarity = tourRarity

    if (typeof parsed.yearMin === 'number') target.yearMin = Math.max(1988, parsed.yearMin)
    if (typeof parsed.yearMax === 'number') target.yearMax = Math.min(2026, parsed.yearMax)

    if (parsed.albumWeights && typeof parsed.albumWeights === 'object') {
      const weights: Record<string, number> = {}
      for (const [slug, w] of Object.entries(parsed.albumWeights)) {
        if (VALID_ALBUMS.has(slug) && typeof w === 'number' && w > 0) {
          weights[slug] = Math.min(1, w)
        }
      }
      if (Object.keys(weights).length > 0) target.albumWeights = weights
    }

    return NextResponse.json({ target })
  } catch (err) {
    console.error('Gemini parse error:', err)
    return NextResponse.json({ error: 'Failed to parse description' }, { status: 500 })
  }
}
