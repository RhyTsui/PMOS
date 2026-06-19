export function buildConversationShareUrl(conversationId: string, title?: string) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin);
  url.pathname = '/';
  url.searchParams.set('sharedConversationId', conversationId);
  if (title) {
    url.searchParams.set('sharedConversationTitle', title);
  }
  return url.toString();
}
