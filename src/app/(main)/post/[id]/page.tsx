import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safePostSelect } from '@/lib/post';
import PostCard from '@/components/posts/post-card';

export const metadata: Metadata = { title: 'Post - Twingface' };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const post = await prisma.post.findUnique({ where: { id }, select: safePostSelect });
  if (!post) notFound();
  return <main className='container post-detail'><PostCard post={post} viewer={viewer ? { id: viewer.id, name: viewer.name, profileImage: viewer.profileImage } : undefined} /></main>;
}
