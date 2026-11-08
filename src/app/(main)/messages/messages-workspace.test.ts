import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('direct messaging UI contract', () => {
  it('keeps inbox and thread pages protected while sharing the dashboard navbar', () => {
    const inbox = read('src/app/(main)/messages/page.tsx');
    const thread = read('src/app/(main)/messages/[id]/page.tsx');
    expect(inbox).toContain("redirect('/login')");
    expect(thread).toContain("redirect('/login')");
    expect(inbox).toContain('DashboardNavbar');
    expect(thread).toContain('MessagesWorkspace');
  });

  it('loads only API-provided conversations/messages and posts text through the secure endpoint', () => {
    const component = read('src/components/messages/messages-workspace.tsx');
    expect(component).toContain("fetch('/api/conversations')");
    expect(component).toContain('/api/conversations/${conversationId}/messages');
    expect(component).toContain("method: 'POST'");
    expect(component).toContain("headers: { 'Content-Type': 'application/json' }");
    expect(component).toContain('Send');
    expect(component).toContain('setMessages([])');
    expect(component).toContain('const conversationId = selectedConversationId');
    expect(component).toContain('currentConversationId === conversationId');
    expect(component).not.toContain('demoConversation');
  });
});
