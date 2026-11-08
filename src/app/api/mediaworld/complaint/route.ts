import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  destroyComplaintMedia,
  uploadComplaintImage,
  uploadComplaintVideo,
} from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import {
  complaintAttachmentKind,
  isValidComplaintAttachmentBytes,
  parseMediaComplaintAttachments,
  parseMediaComplaintFields,
} from '@/lib/mediaworld-complaint';

export const runtime = 'nodejs';

type UploadedComplaintMedia = {
  url: string;
  publicId: string;
  kind: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
};

async function cleanupUploadedMedia(uploaded: UploadedComplaintMedia[]) {
  const imagePublicIds = uploaded.filter((item) => item.kind === 'IMAGE').map((item) => item.publicId);
  const videoPublicIds = uploaded.filter((item) => item.kind === 'VIDEO').map((item) => item.publicId);
  if (imagePublicIds.length) await destroyComplaintMedia(imagePublicIds, 'image');
  if (videoPublicIds.length) await destroyComplaintMedia(videoPublicIds, 'video');
}

const safeComplaintSelect = {
  id: true,
  subject: true,
  status: true,
  personType: true,
  personName: true,
  createdAt: true,
  attachments: {
    orderBy: { position: 'asc' },
    select: { id: true, url: true, kind: true, mimeType: true },
  },
} as const;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const contentType = request.headers.get('content-type') ?? '';
    const isMultipart = contentType.startsWith('multipart/form-data');

    let rawFields: Record<string, unknown> = {};
    let formData: FormData | null = null;

    if (isMultipart) {
      formData = await request.formData().catch(() => null);
      if (!formData) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      rawFields = {
        subject: formData.get('subject'),
        details: formData.get('details'),
        contact: formData.get('contact'),
        personType: formData.get('personType'),
        personName: formData.get('personName'),
      };
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      rawFields = body as Record<string, unknown>;
    }

    const parsed = parseMediaComplaintFields(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const attachments = formData ? parseMediaComplaintAttachments(formData) : { attachments: [], errors: [] as string[] };
    if (attachments.errors.length) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { attachments: attachments.errors } },
        { status: 400 },
      );
    }

    const uploaded: UploadedComplaintMedia[] = [];

    for (const file of attachments.attachments) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (!isValidComplaintAttachmentBytes(file.type, bytes)) {
        await cleanupUploadedMedia(uploaded);
        return NextResponse.json(
          { error: 'Please correct the highlighted fields.', fields: { attachments: ['Choose valid image or video files.'] } },
          { status: 400 },
        );
      }
      const kind = complaintAttachmentKind(file);
      const uploadedFile = kind === 'VIDEO'
        ? await uploadComplaintVideo({ bytes, mimeType: file.type, userId: user.id })
        : await uploadComplaintImage({ bytes, mimeType: file.type, userId: user.id });
      uploaded.push({
        url: uploadedFile.imageUrl,
        publicId: uploadedFile.imagePublicId,
        kind,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    try {
      const complaint = await prisma.mediaComplaint.create({
        data: {
          userId: user.id,
          subject: parsed.data.subject,
          details: parsed.data.details,
          contact: parsed.data.contact || null,
          personType: parsed.data.personType,
          personName: parsed.data.personName || null,
          attachments: {
            create: uploaded.map((item, position) => ({
              url: item.url,
              publicId: item.publicId,
              kind: item.kind,
              mimeType: item.mimeType,
              sizeBytes: item.sizeBytes,
              position,
            })),
          },
        },
        select: safeComplaintSelect,
      });
      return NextResponse.json({ complaint }, { status: 201 });
    } catch {
      await cleanupUploadedMedia(uploaded);
      return NextResponse.json({ error: 'Unable to submit complaint.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[mediaworld/complaint POST] error:', error);
    return NextResponse.json({ error: 'Unable to submit complaint.' }, { status: 500 });
  }
}
