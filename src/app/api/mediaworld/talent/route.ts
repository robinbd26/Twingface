import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { browseTalents, parseTalentBrowseParams } from '@/lib/mediaworld/talent-browse';

export const runtime = 'nodejs';

// Browsing is auth-gated, matching /api/for-rent: profile contact details
// must not reach anonymous visitors.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const parsed = parseTalentBrowseParams(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { talents, nextCursor } = await browseTalents(parsed.data);
    return NextResponse.json({ talents, nextCursor });
  } catch (error) {
    console.error('[mediaworld/talent GET] error:', error);
    return NextResponse.json({ error: 'Unable to load talent profiles.' }, { status: 500 });
  }
}
