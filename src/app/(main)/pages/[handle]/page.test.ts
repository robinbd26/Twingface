import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function textContent(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  const children = (node as { props?: { children?: unknown } }).props?.children;
  return Array.isArray(children) ? children.map(textContent).join(' ') : textContent(children);
}

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }),
  notFound: vi.fn(() => { throw new Error('not-found'); }),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { page: { findUnique: mocks.findUnique }, pagePost: { findMany: mocks.findMany } } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));

import PageDetailPage from './page';
import EditPagePage from './edit/page';

const currentUser = { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null };
const safePage = {
  id: 'page-a',
  name: 'Remote Job Bangladesh',
  handle: 'remotejob.bd',
  category: 'Community',
  bio: 'Jobs for everyone',
  avatarUrl: null,
  coverUrl: null,
  ownerId: 'user-a',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  owner: { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null },
};
const pagePost = {
  id: 'pp-a',
  content: 'New circular posted',
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/post.jpg',
  imagePublicId: 'twingface/pages/page-a/posts/abc',
  pageId: 'page-a',
  authorId: 'user-a',
  createdAt: new Date('2026-01-02'),
  updatedAt: new Date('2026-01-02'),
  author: { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null },
};

describe('page detail screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(globalThis, { React });
    mocks.getCurrentUser.mockResolvedValue(currentUser);
    mocks.findUnique.mockResolvedValue(safePage);
    mocks.findMany.mockResolvedValue([pagePost]);
  });

  it.each([['page detail', PageDetailPage], ['edit page', EditPagePage]])('redirects unauthenticated users from %s', async (_name, Page) => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(Page({ params: Promise.resolve({ handle: 'remotejob.bd' }) })).rejects.toThrow('redirect:/login');
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('renders the not-found boundary for unknown handles', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(PageDetailPage({ params: Promise.resolve({ handle: 'missing' }) })).rejects.toThrow('not-found');
  });

  it('sends non-owners to the public page instead of the edit screen', async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...currentUser, id: 'user-b' });
    await expect(EditPagePage({ params: Promise.resolve({ handle: 'remotejob.bd' }) })).rejects.toThrow('redirect:/pages/remotejob.bd');
  });

  it('renders the owner composer and timeline for page owners', async () => {
    const markup = await PageDetailPage({ params: Promise.resolve({ handle: 'remotejob.bd' }) });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { pageId: 'page-a' } }));
    const text = textContent(markup);
    expect(text).toContain('New circular posted');
    expect(text).toContain('Remote Job Bangladesh');
    expect(text).toContain('Farah Rahman');
  });

  it('uses the approved dark page template and owner edit affordances', () => {
    const detailSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/[handle]/page.tsx'), 'utf8');
    const editSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/[handle]/edit/page.tsx'), 'utf8');
    const formSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/[handle]/edit/edit-page-form.tsx'), 'utf8');
    const composerSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/pages/[handle]/page-post-form.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

    expect(detailSource).toContain("data-theme='dark'");
    expect(detailSource).toContain('<DashboardNavbar');
    expect(detailSource).toContain('href={`/pages/${page.handle}/edit`}');
    expect(detailSource).toContain('<PagePostForm pageId={page.id} />');
    expect(detailSource).toContain("handle.toLowerCase()");
    expect(editSource).toContain('EditPageForm');
    expect(editSource).toContain('notFound()');
    expect(formSource).toContain('fetch(`/api/pages/${page.id}`');
    expect(formSource).toContain("method: 'PATCH'");
    expect(formSource).toContain("method: 'DELETE'");
    expect(formSource).toContain("formData.set(kind, image)");
    expect(composerSource).toContain('fetch(`/api/pages/${pageId}/posts`');
    expect(composerSource).toContain("data-testid='input-page-post-image'");
    expect(composerSource).toContain("form.set('image', selectedImage)");
    expect(detailSource).toContain("post.imageUrl ? <img className='page-post-image'");
    expect(css).toContain('.page-post-image{width:100%;max-height:480px;object-fit:cover;display:block;border-radius:8px;margin-top:10px}');
    expect(css).toContain('.page-cover{width:100%;height:220px;object-fit:cover;display:block}');
    expect(css).toContain('.page-avatar{width:84px;height:84px');
  });
});