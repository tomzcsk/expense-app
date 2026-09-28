// Presentation-only helper: map a category/service name to a friendly emoji.
// Matches the approved redesign mockup. No logic depends on this.
export function categoryEmoji(name?: string | null): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('claude')) return '🤖';
  if (n.includes('chatgpt') || n.includes('gpt') || n.includes('openai')) return '💬';
  if (n.includes('cursor')) return '⌨️';
  if (n.includes('copilot')) return '🐙';
  if (n.includes('midjourney')) return '🎨';
  return '📄';
}
