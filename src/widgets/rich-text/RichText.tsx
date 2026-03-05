'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import RichTextOptions from './RichTextOptions';

interface RichTextConfig {
  content?: string;
  scrollSpeed?: number;
  fontSize?: number;
  textColor?: string;
  scrollDirection?: 'up' | 'down';
  pauseOnHover?: boolean;
}

const DEFAULT_CONTENT = `## Campus Announcements

**Library Hours Change** — Starting next week, the library will extend hours until midnight on weekdays.

Registration for Summer 2026 courses opens **March 15th**. Visit the registrar's office or check the portal.

---

*Career Fair* is happening this Friday in the Student Center Atrium from 10 AM to 3 PM. Bring your resume!

> "The beautiful thing about learning is that nobody can take it away from you." — B.B. King

**Parking reminder:** Lot C will be closed for maintenance March 10–12. Use Lot D as an alternative.

The campus **recycling program** has been expanded — new bins are now available in all buildings.`;

/** Very minimal markdown-to-HTML converter for signage use */
function markdownToHtml(md: string): string {
  return md
    // Horizontal rule
    .replace(/^---+$/gm, '<hr class="my-4 border-t border-current opacity-20" />')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-current opacity-70 pl-4 py-1 my-2 italic">$1</blockquote>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Em dash
    .replace(/ — /g, ' — ')
    // Line breaks (double newline = paragraph break)
    .replace(/\n\n/g, '</p><p class="mb-3">')
    // Single newline within paragraph = <br>
    .replace(/\n/g, '<br />')
    // Wrap in paragraph
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, '</p>');
}

export default function RichText({ config, theme }: WidgetComponentProps) {
  const richConfig = config as RichTextConfig | undefined;
  const content = richConfig?.content?.trim() || DEFAULT_CONTENT;
  const scrollSpeed = richConfig?.scrollSpeed ?? 40;
  const fontSize = richConfig?.fontSize ?? 16;
  const textColor = richConfig?.textColor?.trim() || '';
  const scrollDirection = richConfig?.scrollDirection ?? 'up';
  const pauseOnHover = richConfig?.pauseOnHover ?? false;

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [paused, setPaused] = useState(false);

  const checkOverflow = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const cH = container.clientHeight;
    const iH = inner.scrollHeight;
    setContainerHeight(cH);
    setContentHeight(iH);
    setNeedsScroll(iH > cH + 4);
  }, []);

  useEffect(() => {
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [checkOverflow, content, fontSize]);

  const html = markdownToHtml(content);
  const resolvedColor = textColor || theme.accent;

  // Total travel distance: content must fully scroll through the viewport
  const totalTravel = contentHeight + containerHeight;
  const duration = totalTravel > 0 ? (totalTravel / (fontSize * 0.8)) * (scrollSpeed / 10) : scrollSpeed;

  const isUp = scrollDirection === 'up';

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      {needsScroll ? (
        <div
          className="rich-text-scroll"
          style={{
            animationDuration: `${duration}s`,
            animationPlayState: paused ? 'paused' : 'running',
            animationDirection: isUp ? 'normal' : 'reverse',
            paddingTop: isUp ? containerHeight : 0,
            paddingBottom: isUp ? 0 : containerHeight,
          }}
        >
          <div
            ref={innerRef}
            className="rich-text-content px-5 py-4 leading-relaxed"
            style={{ fontSize, color: resolvedColor }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ) : (
        <div
          ref={innerRef}
          className="rich-text-content px-5 py-4 leading-relaxed h-full"
          style={{ fontSize, color: resolvedColor }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {/* Top and bottom fade gradients */}
      {needsScroll && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${theme.background || '#1a1a2e'}, transparent)`,
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${theme.background || '#1a1a2e'}, transparent)`,
            }}
          />
        </>
      )}
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'rich-text',
  name: 'Rich Text',
  description: 'Auto-scrolling rich text announcements',
  icon: 'newspaper',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: RichText,
  OptionsComponent: RichTextOptions,
  defaultProps: {
    content: '',
    scrollSpeed: 40,
    fontSize: 16,
    textColor: '',
    scrollDirection: 'up',
    pauseOnHover: false,
  },
});
