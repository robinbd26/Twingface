import { NextResponse } from 'next/server';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const runtime = 'nodejs';

// Public: the taxonomy is reference data (industry/category/designation and
// rental category names) needed by onboarding, profile pages and filters.
export async function GET() {
  try {
    const taxonomy = await getTaxonomySnapshot();
    return NextResponse.json({ taxonomy });
  } catch (error) {
    console.error('[mediaworld/taxonomy GET] error:', error);
    return NextResponse.json({ error: 'Unable to load taxonomy.' }, { status: 500 });
  }
}
