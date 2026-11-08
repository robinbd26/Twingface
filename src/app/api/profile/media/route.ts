import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadProfileMedia } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import {
  isProfileMediaFile,
  isValidProfileMediaBytes,
  isValidProfileMediaFile,
  ProfileMediaKindSchema,
} from '@/lib/profile-media';
import { safeProfileSelect } from '@/lib/profile';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const parsedKind = ProfileMediaKindSchema.safeParse(formData?.get('kind'));
  const image = formData?.get('image') ?? null;

  if (!parsedKind.success || !isProfileMediaFile(image) || !isValidProfileMediaFile(image)) {
    return NextResponse.json({ error: 'Choose a valid JPEG, PNG, WebP, or GIF image up to 5 MB.' }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  if (!isValidProfileMediaBytes(image.type, bytes)) {
    return NextResponse.json({ error: 'Choose a valid image file.' }, { status: 400 });
  }

  let imageUrl: string;
  try {
    ({ imageUrl } = await uploadProfileMedia({ bytes, mimeType: image.type, userId: currentUser.id, kind: parsedKind.data }));
  } catch {
    return NextResponse.json({ error: 'Unable to upload your image. Please try again.' }, { status: 502 });
  }

  const data = parsedKind.data === 'profile' ? { profileImage: imageUrl } : { coverImage: imageUrl };
  try {
    const profile = await prisma.user.update({ where: { id: currentUser.id }, data, select: safeProfileSelect });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Unable to update your profile. Please try again.' }, { status: 500 });
  }
}
