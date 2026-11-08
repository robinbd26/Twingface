import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MEDIA_WORLD_CATEGORY_LABELS, MEDIAWORLD_DIVISIONS, type MediaWorldCategory } from '@/lib/mediaworld';
import { ALL_DISTRICTS } from '@/lib/constants';

const professionSchema = Object.keys(MEDIA_WORLD_CATEGORY_LABELS) as MediaWorldCategory[];

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const profile = await prisma.mediaProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        fullName: true,
        profession: true,
        bio: true,
        division: true,
        district: true,
        phone: true,
        email: true,
        portfolio: true,
        experience: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[mediaworld/register GET] error:', error);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const profession = typeof body.profession === 'string' ? body.profession : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    const division = typeof body.division === 'string' ? body.division.trim() : '';
    const district = typeof body.district === 'string' ? body.district.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const portfolio = typeof body.portfolio === 'string' ? body.portfolio.trim() : '';
    const experience = typeof body.experience === 'string' ? body.experience.trim() : '';

    const errors: Record<string, string[]> = {};
    if (fullName.length < 3 || fullName.length > 100) errors.fullName = ['Enter a full name between 3 and 100 characters.'];
    if (!professionSchema.includes(profession as MediaWorldCategory)) errors.profession = ['Select a valid profession.'];
    if (bio.length < 10 || bio.length > 500) errors.bio = ['Bio must be 10-500 characters.'];
    if (!MEDIAWORLD_DIVISIONS.includes(division as never)) errors.division = ['Select a valid division.'];
    if (!ALL_DISTRICTS.includes(district)) errors.district = ['Select a valid district.'];
    if (Object.keys(errors).length) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: errors }, { status: 400 });

    const existing = await prisma.mediaProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (existing) return NextResponse.json({ error: 'You already have a Media World profile.', status: existing.status }, { status: 409 });

    const profile = await prisma.mediaProfile.create({
      data: {
        userId: user.id,
        fullName,
        profession: profession as MediaWorldCategory,
        bio,
        division,
        district,
        phone: phone || null,
        email: email || user.email,
        portfolio: portfolio || null,
        experience: experience || null,
      },
      select: {
        id: true,
        fullName: true,
        profession: true,
        bio: true,
        division: true,
        district: true,
        status: true,
      },
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('[mediaworld/register POST] error:', error);
    return NextResponse.json({ error: 'Unable to create profile.' }, { status: 500 });
  }
}
