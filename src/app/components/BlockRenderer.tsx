import React, { useState, useEffect } from 'react';
import { toCdnUrl } from '@/utils/toCdnUrl';

// ============================================================
// BlockRenderer: WordPress Gutenberg 블록 → React 컴포넌트
// 워드프레스 에디터에서 작성한 순서 그대로 렌더
// - 개별 이미지: 그대로
// - gallery 블록: slider
// - Sliderberg 블록: Embla slider로 재렌더
// - ACF gallery ids → acf-slider-gallery도 gallery slider로 처리
// - video/embed: 그대로
// ============================================================

interface ParsedBlock {
  type:
    | 'paragraph'
    | 'heading'
    | 'image'
    | 'gallery'
    | 'sliderberg'
    | 'video'
    | 'embed'
    | 'list'
    | 'quote'
    | 'separator'
    | 'spacer'
    | 'unknown';
  html: string;
  attrs?: Record<string, any>;
  align?: 'left' | 'center' | 'right' | 'wide' | 'full';
}

interface RenderGroup {
  type: 'single' | 'image-slider';
  blocks: ParsedBlock[];
}

interface ExtractedImage {
  src: string;
  caption: string;
  width?: number;
  height?: number;
  styleWidth?: string;
  styleMaxWidth?: string;
  classWidth?: string;
  align?: 'left' | 'center' | 'right' | 'wide' | 'full';
}

// 추가: 최상단 아무데나 (import 아래 추천)
const handleLinkClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest('a') as HTMLAnchorElement | null;

  if (!anchor) return;

  const href = anchor.getAttribute('href') || '';

  const normalizeCustomFootnotePath = (value: string): string => {
    if (!value) return '';

    // 1) 원문 href 그대로 먼저 검사
    let raw = value.trim();

    // 2) 절대 URL이면 pathname으로 변환
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('//')
    ) {
      try {
        const url = new URL(raw, window.location.origin);
        raw = decodeURIComponent(url.pathname || '');
      } catch {
        return '';
      }
    }

    // 3) query/hash 제거
    raw = raw.split('#')[0].split('?')[0].trim();

    // 4) 끝 슬래시 정리
    if (!raw.startsWith('/')) raw = `/${raw}`;
    raw = raw.replace(/\/+$/, '/');

    return raw;
  };

  const normalizedHref = normalizeCustomFootnotePath(href);

const customFootnoteRefMatch = normalizedHref.match(/^\/상단\s*각주(\d+)\/?$/);
const customFootnoteBodyMatch = normalizedHref.match(/^\/하단\s*각주(\d+)\/?$/);

// 커스텀 각주는 이제 href 자체를 해시 링크로 바꿨기 때문에
// 여기서 별도 이동 처리하지 않음
if (customFootnoteRefMatch || customFootnoteBodyMatch) {
  return;
}

  // 3) 라우터 링크는 그대로
  if (href.startsWith('#/')) return;

  const isFootnoteHash = (value: string) => {
    return (
      value.startsWith('#footnote') ||
      value.startsWith('#fn') ||
      value.startsWith('#note') ||
      value.startsWith('#_ftn') ||
      value.startsWith('#_edn') ||
      value.startsWith('#fnref') ||
      value.startsWith('#footnote-ref') ||
      /^#\d+$/.test(value)
    );
  };

  const scrollToFootnote = (rawId: string) => {
    const id = rawId.replace(/^#/, '');
    const numeric = id.replace(/[^\d]/g, '');

    const el =
      document.getElementById(id) ||
      document.querySelector(`[name="${id}"]`) ||
      document.getElementById(`footnote-${id}`) ||
      document.getElementById(`fn-${id}`) ||
      document.getElementById(`note-${id}`) ||
      document.getElementById(`_ftn${numeric}`) ||
      document.getElementById(`_ftnref${numeric}`) ||
      document.getElementById(`_edn${numeric}`) ||
      document.getElementById(`fnref-${numeric}`) ||
      document.getElementById(`footnote-ref-${numeric}`) ||
      document.getElementById(numeric) ||
      document.getElementById(`footnote-${numeric}`) ||
      document.getElementById(`fn-${numeric}`) ||
      document.getElementById(`fnref${numeric}`) ||
      document.getElementById(`note-${numeric}`) ||
      document.querySelector(`[name="_ftn${numeric}"]`) ||
      document.querySelector(`[name="_ftnref${numeric}"]`) ||
      document.querySelector(`[name="_edn${numeric}"]`) ||
      document.querySelector(`[name="fn${numeric}"]`) ||
      document.querySelector(`[name="fnref${numeric}"]`) ||
      document.querySelector(`[name="note${numeric}"]`) ||
      document.querySelector(`[name="${numeric}"]`);

    if (el) {
      e.preventDefault();
      e.stopPropagation();
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return true;
    }

    return false;
  };

  // 4) 기존 hash footnote도 계속 지원
  if (href.startsWith('#') && isFootnoteHash(href)) {
    const handled = scrollToFootnote(href);

    if (!handled) {
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }

  // 5) 일반 상대 hash는 그대로
  if (href.startsWith('#')) {
    return;
  }

  // 6) 절대경로 + hash footnote도 계속 지원
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//')
  ) {
    try {
      const url = new URL(href, window.location.origin);
      const hash = url.hash || '';

      if (hash && isFootnoteHash(hash)) {
        const handled = scrollToFootnote(hash);

        if (!handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
    } catch {
      return;
    }

    // 일반 외부 링크는 그대로 브라우저 기본 동작 사용
    return;
  }
};

// ============================================================
// HTML Sanitization
// ============================================================
const sanitizeHtml = (html: string): string => {
  let cleaned = html;

    cleaned = cleaned.replace(
  /\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/gi,
  (_match, captionAttrs, inner) => {
    const imgMatch = inner.match(/<img[^>]+>/i);
    const imgTag = imgMatch ? imgMatch[0] : '';

    const captionText = inner
      .replace(/<img[^>]+>/i, '')
      .replace(/<\/?a[^>]*>/gi, '')
      .trim();

    const alignMatch = captionAttrs.match(/align=["']?(alignleft|alignright|aligncenter)["']?/i);
    const widthMatch = captionAttrs.match(/width=["']?(\d+)["']?/i);
    const idMatch = captionAttrs.match(/id=["']?([^"'\s\]]+)["']?/i);

    const alignClass = alignMatch ? alignMatch[1].toLowerCase() : '';
    const widthAttr = widthMatch ? ` style="max-width: ${widthMatch[1]}px;"` : '';
    const idAttr = idMatch ? ` id="${idMatch[1]}"` : '';

    return `<figure class="wp-block-image${alignClass ? ` ${alignClass}` : ''}"${idAttr}${widthAttr}>${imgTag}${
      captionText ? `<figcaption>${captionText}</figcaption>` : ''
    }</figure>`;
  }
);

  // ============================================================
  // [gallery ids="..."] → gallery HTML 변환
  // ============================================================
  cleaned = cleaned.replace(
    /\[gallery\b([^\]]*)ids=['"]([^'"]+)['"]([^\]]*)\]/gi,
    (_, _beforeIds, idsStr) => {
      const ids = idsStr
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean);

      return `
        <figure class="wp-block-gallery" data-gallery-ids="${ids.join(',')}">
          ${ids
            .map(
              (id: string) => `
                <figure class="wp-block-image">
                  <img data-gallery-id="${id}" alt="" />
                </figure>
              `
            )
            .join('')}
        </figure>
      `;
    }
  );

  cleaned = cleaned.replace(/\[embed\](.*?)\[\/embed\]/gi, (_, url) => {
    const trimmedUrl = url.trim();

    const vimeoMatch = trimmedUrl.match(
      /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/
    );
    if (vimeoMatch) {
      return `<figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div></figure>`;
    }

    const ytMatch = trimmedUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
    );
    if (ytMatch) {
      return `<figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></figure>`;
    }

    return `<figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="${trimmedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe></div></figure>`;
  });

    cleaned = cleaned.replace(
    /<p([^>]*)>(?:[ \t\r\n]|<br\s*\/?>)*<\/p>/gi,
    '<p$1><br></p>'
  );
  // anchor가 단독 block으로 떨어진 경우 앞뒤 문장과 합치기
cleaned = cleaned.replace(
  /<\/p>\s*(<a[^>]+>.*?<\/a>)\s*<p>/gi,
  ' $1 '
);

  return cleaned;
};

// ============================================================
// Align helpers
// ============================================================
const detectAlign = (
  html: string,
  attrs?: Record<string, any>
): ParsedBlock['align'] => {
  const validAligns = ['left', 'center', 'right', 'wide', 'full'] as const;
  type AlignType = (typeof validAligns)[number];
  const isValid = (v: string): v is AlignType =>
    validAligns.includes(v as AlignType);

  if (attrs?.align && isValid(attrs.align)) return attrs.align;
  if (attrs?.textAlign && isValid(attrs.textAlign)) return attrs.textAlign;

  if (/\balignleft\b/i.test(html)) return 'left';
  if (/\balignright\b/i.test(html)) return 'right';
  if (/\baligncenter\b/i.test(html)) return 'center';
  if (/\balignwide\b/i.test(html)) return 'wide';
  if (/\balignfull\b/i.test(html)) return 'full';

  const textAlignMatch = html.match(/has-text-align-(left|center|right)/i);
  if (textAlignMatch) return textAlignMatch[1].toLowerCase() as AlignType;

  const styleMatch = html.match(
    /style="[^"]*text-align:\s*(left|center|right)/i
  );
  if (styleMatch) return styleMatch[1].toLowerCase() as AlignType;

  return undefined;
};

const textAlignClass = (align?: ParsedBlock['align']): string => {
  switch (align) {
    case 'left':
      return 'text-left';
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    default:
      return '';
  }
};

// ============================================================
// Shared styles
// ============================================================
const wpContentStyles = [
  '[&_a]:inline',
  '[&_a]:text-foreground/55',
  '[&_a]:underline',
  '[&_a]:decoration-foreground/20',
  '[&_a]:underline-offset-[3px]',
  '[&_a]:transition-colors',
  '[&_a]:duration-300',
  '[&_a:hover]:text-foreground/80',
  '[&_a:hover]:decoration-foreground/40',
  '[&_ul_ul]:mt-1 [&_ul_ul]:pl-4 [&_ol_ol]:mt-1 [&_ol_ol]:pl-4',
].join(' ');

const withExternalLinkTarget = (html: string): string => {
  if (!html) return '';

  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,
    (_match, beforeHref, href, afterHref) => {
      let normalizedHref = href;

      const attrsBase = `${beforeHref} ${afterHref}`
        .replace(/\shref=["'][^"']*["']/gi, '')
        .replace(/\starget=["'][^"']*["']/gi, '')
        .replace(/\srel=["'][^"']*["']/gi, '')
        .trim();

      const isAbsolute =
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//');

      const isFootnoteHash = (value: string) => {
        return (
          value.startsWith('#footnote') ||
          value.startsWith('#fn') ||
          value.startsWith('#note') ||
          value.startsWith('#_ftn') ||
          value.startsWith('#_edn') ||
          value.startsWith('#fnref') ||
          value.startsWith('#footnote-ref') ||
          /^#\d+$/.test(value)
        );
      };

            const isCustomFootnotePath = (value: string) => {
        return (
          /^\/상단\s*각주\d+\/?$/i.test(value) ||
          /^\/하단\s*각주\d+\/?$/i.test(value)
        );
      };

            const getCustomFootnoteMeta = (value: string) => {
        const normalizedValue = value.replace(/\/+$/, '/');

        const refMatch = normalizedValue.match(/^\/상단\s*각주(\d+)\/?$/i);
        if (refMatch) {
          return {
            type: 'ref' as const,
            number: refMatch[1],
            normalizedHref: `#custom-footnote-body-${refMatch[1]}`,
            customId: `custom-footnote-ref-${refMatch[1]}`,
          };
        }

        const bodyMatch = normalizedValue.match(/^\/하단\s*각주(\d+)\/?$/i);
        if (bodyMatch) {
          return {
            type: 'body' as const,
            number: bodyMatch[1],
            normalizedHref: `#custom-footnote-ref-${bodyMatch[1]}`,
            customId: `custom-footnote-body-${bodyMatch[1]}`,
          };
        }

        return null;
      };

      // 1) 이미 상대 hash인 footnote는 그대로 유지
      if (href.startsWith('#') && isFootnoteHash(href)) {
        return `<a ${attrsBase} href="${href}">`;
      }

      // 2) 일반 상대 hash도 그대로 유지
      if (href.startsWith('#')) {
        return `<a ${attrsBase} href="${href}">`;
      }

            // 3) 커스텀 상대 각주는 해시 링크 + 고정 id 부여
      if (isCustomFootnotePath(href)) {
        const meta = getCustomFootnoteMeta(href);

        if (meta) {
          return `<a ${attrsBase} href="${meta.normalizedHref}" id="${meta.customId}" data-custom-footnote="${meta.type}" data-footnote-number="${meta.number}">`;
        }

        return `<a ${attrsBase} href="${href}">`;
      }

      // 4) 절대 URL인 경우
      if (isAbsolute) {
        try {
          const url = new URL(href, window.location.origin);
          const hash = url.hash || '';
          const pathname = decodeURIComponent(url.pathname || '');

          // hash footnote 절대 URL → 상대 hash로 정규화
          if (hash && isFootnoteHash(hash)) {
            normalizedHref = hash;
            return `<a ${attrsBase} href="${normalizedHref}">`;
          }

          // 커스텀 각주 절대 URL → 해시 링크 + 고정 id로 정규화
          if (isCustomFootnotePath(pathname)) {
            const meta = getCustomFootnoteMeta(pathname);

            if (meta) {
              return `<a ${attrsBase} href="${meta.normalizedHref}" id="${meta.customId}" data-custom-footnote="${meta.type}" data-footnote-number="${meta.number}">`;
            }

            return `<a ${attrsBase} href="${pathname}">`;
          }
        } catch {
          return `<a ${attrsBase} href="${href}" target="_blank" rel="noopener noreferrer">`;
        }

        // footnote가 아닌 진짜 외부 링크는 새창 유지
        return `<a ${attrsBase} href="${href}" target="_blank" rel="noopener noreferrer">`;
      }

      // 5) 나머지 내부 링크는 그대로
      return `<a ${attrsBase} href="${href}">`;
    }
  );
};

const normalizeRenderableHtml = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // 이미 escape되어 화면에 "&nbsp;" 문자로 보일 수 있는 경우까지 정리
    .replace(/&amp;nbsp;/gi, '\u00a0')

    // 실제 HTML entity는 실제 non-breaking space로 보존
    .replace(/&nbsp;/gi, '\u00a0')

    // 빈 문단은 줄바꿈 1개로 유지
    .replace(/<p([^>]*)>\s*<\/p>/gi, '<p$1><br></p>')
    .replace(/<p([^>]*)>\s*(<br\s*\/?>\s*)+<\/p>/gi, '<p$1><br></p>')
    .trim();
};

const getRenderableHtml = (input: string): string => {
  return withExternalLinkTarget(normalizeRenderableHtml(input));
};

// ============================================================
// Parse WordPress block comments
// ============================================================
const parseBlocks = (html: string): ParsedBlock[] => {
  if (!html || !html.trim()) return [];

  const cleanHtml = sanitizeHtml(html);
  const blocks: ParsedBlock[] = [];
  const blockPattern =
    /<!-- wp:(\S+?)(?:\s+(\{[^}]*\}))?\s*(?:\/)?-->([\s\S]*?)(?:<!-- \/wp:\1\s*-->)?/g;

  let lastIndex = 0;
  let match;
  let paragraphBuffer: string[] = [];

  const flushParagraphBuffer = () => {
    if (paragraphBuffer.length === 0) return;

    const combinedParagraphHtml = paragraphBuffer
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n\n');

    if (combinedParagraphHtml) {
      blocks.push(...parseOrphanHtml(combinedParagraphHtml));
    }

    paragraphBuffer = [];
  };

  while ((match = blockPattern.exec(cleanHtml)) !== null) {
    const beforeContent = cleanHtml.slice(lastIndex, match.index).trim();
    if (beforeContent) {
      flushParagraphBuffer();
      blocks.push(...parseOrphanHtml(beforeContent));
    }

    const blockName = match[1];
    const attrsStr = match[2];
    const innerHtml = match[3]?.trim() || '';

    let attrs: Record<string, any> = {};
    if (attrsStr) {
      try {
        attrs = JSON.parse(attrsStr);
      } catch {}
    }

    const blockType = mapBlockType(blockName);

    if (blockType === 'paragraph') {
      paragraphBuffer.push(innerHtml);
      lastIndex = match.index + match[0].length;
      continue;
    }

    flushParagraphBuffer();

    const align = detectAlign(innerHtml, attrs);
    blocks.push({
      type: blockType,
      html: innerHtml,
      attrs,
      align,
    });

    lastIndex = match.index + match[0].length;
  }

  const remaining = cleanHtml.slice(lastIndex).trim();
  if (remaining) {
    flushParagraphBuffer();
    blocks.push(...parseOrphanHtml(remaining));
  } else {
    flushParagraphBuffer();
  }

  if (blocks.length === 0 && cleanHtml.trim()) return parseOrphanHtml(cleanHtml);

  return blocks.filter(
    (b) => b.html.trim() || b.type === 'separator' || b.type === 'spacer'
  );
};

const mapBlockType = (blockName: string): ParsedBlock['type'] => {
  switch (blockName) {
    case 'paragraph':
      return 'paragraph';
    case 'heading':
      return 'heading';
    case 'image':
      return 'image';
    case 'gallery':
      return 'gallery';
    case 'sliderberg':
    case 'sliderberg/slider':
      return 'sliderberg';
    case 'video':
      return 'video';
    case 'embed':
    case 'core-embed/youtube':
    case 'core-embed/vimeo':
      return 'embed';
    case 'list':
      return 'list';
    case 'quote':
      return 'quote';
    case 'separator':
      return 'separator';
    case 'spacer':
      return 'spacer';
    default:
      return 'unknown';
  }
};

const isGalleryHtml = (html: string): boolean => {
  return (
    /\bwp-block-gallery\b/i.test(html) ||
    /\bhas-nested-images\b/i.test(html) ||
    /\bblocks-gallery-grid\b/i.test(html) ||
    /\bblocks-gallery-item\b/i.test(html) ||
    /\bacf-slider-gallery\b/i.test(html) ||
    (/\bgallery\b/i.test(html) &&
      (/\bgallery-item\b/i.test(html) ||
        /\bgallery-icon\b/i.test(html) ||
        /\bgallery-caption\b/i.test(html)))
  );
};

const isSingleImageHtml = (html: string): boolean => {
  return /\bwp-block-image\b/i.test(html);
};

const isSliderbergHtml = (html: string): boolean => {
  return (
    /\bsliderberg\b/i.test(html) ||
    /\bsliderberg-slide\b/i.test(html) ||
    /\bwp-block-sliderberg\b/i.test(html)
  );
};

const parseOrphanHtml = (html: string): ParsedBlock[] => {
  const blocks: ParsedBlock[] = [];
  const parser = new DOMParser();
  const normalizedHtml = html;

  const doc = parser.parseFromString(normalizedHtml, 'text/html');

  const splitInlineHtmlToParagraphBlocks = (
  rawHtml: string,
  fallbackAlign?: ParsedBlock['align']
): ParsedBlock[] => {
  if (!rawHtml) return [];

  const normalized = rawHtml
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(?:\n\s*){2,}/g, '<br><br>');

  const parts = normalized
    .split(/(?:<br\s*\/?>\s*){2,}/gi)
    .map((part) => {
      const withoutLeadingTrailingRegularWhitespace = part
        .replace(/^[ \t\r\n]*(?:<br\s*\/?>[ \t\r\n]*)*/gi, '')
        .replace(/(?:[ \t\r\n]*<br\s*\/?>)*[ \t\r\n]*$/gi, '');

      const withoutHtmlTags = withoutLeadingTrailingRegularWhitespace.replace(/<[^>]+>/g, '');
      const withoutRegularWhitespace = withoutHtmlTags.replace(/[ \t\r\n]/g, '');
      const hasNbsp = withoutHtmlTags.includes('\u00a0') || withoutHtmlTags.includes('&nbsp;');

      if (!withoutRegularWhitespace && !hasNbsp) {
        return '';
      }

      return withoutLeadingTrailingRegularWhitespace;
    })
    .filter((part) => part !== '');

  if (parts.length === 0) return [];

  return parts.map((part) => {
    const onlyNbspAfterTagStrip =
      part
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t\r\n]/g, '')
        .replace(/\u00a0/g, '') === '';

    return {
      type: 'paragraph' as const,
      html: onlyNbspAfterTagStrip ? `<p><br></p>` : `<p>${part}</p>`,
      align: detectAlign(part) || fallbackAlign,
    };
  });
};

  const flushInlineBuffer = (buffer: string[]) => {
    const joined = buffer.join('').trim();

    if (!joined) {
      buffer.length = 0;
      return;
    }

    const paragraphBlocks = splitInlineHtmlToParagraphBlocks(
      joined,
      detectAlign(joined)
    );

    if (paragraphBlocks.length > 0) {
      blocks.push(...paragraphBlocks);
    }

    buffer.length = 0;
  };

  const nodes = Array.from(doc.body.childNodes);
  const inlineBuffer: string[] = [];

  for (const node of nodes) {
    // 1) 텍스트 노드 → 일단 버퍼에 쌓음
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';

      // 일반 공백/줄바꿈만 있는 텍스트 노드는 무시하되,
      // non-breaking space(\u00a0)는 유지
      const hasOnlyRegularWhitespace = text.replace(/[ \t\r\n]/g, '') === '';
      const hasNbsp = text.includes('\u00a0');

      if (hasOnlyRegularWhitespace && !hasNbsp) continue;

      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const normalizedText = escapedText
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '<br>');

      const textWithoutBreaks = normalizedText.replace(/<br\s*\/?>/gi, '');
      const hasOnlyRegularWhitespaceAfterNormalize =
        textWithoutBreaks.replace(/[ \t\r\n]/g, '') === '';
      const hasNbspAfterNormalize = textWithoutBreaks.includes('\u00a0');

      if (hasOnlyRegularWhitespaceAfterNormalize && !hasNbspAfterNormalize) continue;

      inlineBuffer.push(normalizedText);
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const outer = el.outerHTML.trim();
    if (!outer) continue;

    const tag = el.tagName.toUpperCase();
    const align = detectAlign(outer);

    // 2) inline 요소(a, span, strong, em 등)는 버퍼에 쌓음
    const inlineTags = ['A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'MARK', 'SUP', 'SUB', 'SMALL'];

    if (tag === 'BR') {
      inlineBuffer.push('<br>');
      continue;
    }

    if (inlineTags.includes(tag)) {
      inlineBuffer.push(outer);
      continue;
    }

    // 여기서부터는 block 요소이므로, 먼저 inline 버퍼를 flush
    flushInlineBuffer(inlineBuffer);

    // 3. ACF slider gallery wrapper
    if (
      /\bacf-slider-gallery\b/i.test(outer) ||
      /data-slider=['"]acf-gallery['"]/i.test(outer)
    ) {
      blocks.push({ type: 'gallery', html: outer, align });
      continue;
    }

    // 4. WP gallery wrapper
    if (isGalleryHtml(outer)) {
      blocks.push({ type: 'gallery', html: outer, align });
      continue;
    }

    // 5. Sliderberg
    if (isSliderbergHtml(outer)) {
      blocks.push({ type: 'sliderberg', html: outer, align });
      continue;
    }

    // 6. Single image
    if (
      isSingleImageHtml(outer) ||
      (el.tagName === 'IMG' &&
        !el.closest('.wp-block-gallery') &&
        !el.closest('.gallery'))
    ) {
      blocks.push({
        type: 'image',
        html: el.tagName === 'IMG' ? `<figure>${outer}</figure>` : outer,
        align,
      });
      continue;
    }

    // 7. Heading
    if (/^H[1-6]$/i.test(el.tagName)) {
      blocks.push({ type: 'heading', html: outer, align });
      continue;
    }

    // 8. Paragraph
    if (el.tagName === 'P') {
      if (/<iframe/i.test(outer)) {
        blocks.push({ type: 'embed', html: outer, align });
      } else if (/<img/i.test(outer)) {
        blocks.push({ type: 'image', html: outer, align });
      } else {
        const normalizedParagraphHtml = outer.replace(
          /(<p[^>]*>)([\s\S]*?)(<\/p>)/i,
          (_match, openTag, innerContent, closeTag) => {
            const normalizedInner = innerContent
              .replace(/\r\n/g, '\n')
              .replace(/\n/g, '<br>');

            return `${openTag}${normalizedInner}${closeTag}`;
          }
        );

        blocks.push({
          type: 'paragraph',
          html: normalizedParagraphHtml,
          align,
        });
      }
      continue;
    }

    // 9. List
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      blocks.push({ type: 'list', html: outer, align });
      continue;
    }

    // 10. Quote
    if (el.tagName === 'BLOCKQUOTE') {
      blocks.push({ type: 'quote', html: outer, align });
      continue;
    }

    // 11. Separator
    if (el.tagName === 'HR') {
      blocks.push({ type: 'separator', html: outer });
      continue;
    }

    // 12. Video / Embed
    if (/<iframe/i.test(outer) || /<video/i.test(outer)) {
      blocks.push({ type: 'embed', html: outer, align });
      continue;
    }

    // 13. div/section/article wrapper 처리
    const inner = el.innerHTML?.trim() || '';
    if (!inner) continue;

    // 13-1. article-body / article-content / parsed 류 wrapper → 내부만 재귀 처리
    const className = el.className || '';

    const isArticleWrapper =
      /\barticle-body\b/i.test(className) ||
      /\barticle-content\b/i.test(className) ||
      /\barticle-tmpl\b/i.test(className) ||
      /\bparsed\b/i.test(className) ||
      /\bpost-content\b/i.test(className) ||
      /\bentry-content\b/i.test(className);

    if (isArticleWrapper) {
      const innerBlocks = parseOrphanHtml(inner);
      if (innerBlocks.length > 0) {
        blocks.push(...innerBlocks);
        continue;
      }
    }

    // 13-2. wrapper인데 실제로는 single child만 있는 껍데기 div → unwrap
    const elementChildren = Array.from(el.children);
    const meaningfulTextNodes = Array.from(el.childNodes).filter(
      (n) =>
        n.nodeType === Node.TEXT_NODE &&
        (n.textContent || '').replace(/\s+/g, '').trim() !== ''
    );

    if (elementChildren.length === 1 && meaningfulTextNodes.length === 0) {
      const innerBlocks = parseOrphanHtml(inner);
      if (innerBlocks.length > 0) {
        blocks.push(...innerBlocks);
        continue;
      }
    }

                // 13-3. 진짜 inline-only면 <br><br> / 빈 줄 기준으로 paragraph 분리
    const hasOnlyInlineContent =
      inner &&
      !/<(p|div|figure|blockquote|ul|ol|li|h[1-6]|hr|section|article|iframe|video)\b/i.test(inner);

    if (hasOnlyInlineContent) {
      const paragraphBlocks = splitInlineHtmlToParagraphBlocks(
        inner,
        detectAlign(inner)
      );

      if (paragraphBlocks.length > 0) {
        blocks.push(...paragraphBlocks);
        continue;
      }

      blocks.push({
        type: 'paragraph',
        html: `<p>${inner}</p>`,
        align: detectAlign(inner),
      });
      continue;
    }

    // 13-4. 마지막 fallback → 내부 재귀 시도
    const innerBlocks = parseOrphanHtml(inner);
    if (innerBlocks.length > 0) {
      blocks.push(...innerBlocks);
      continue;
    }

    // 14. Unknown fallback (최후)
    if (outer.replace(/<[^>]+>/g, '').trim()) {
      blocks.push({ type: 'unknown', html: outer, align });
    }
  }

  // 마지막에 남은 inline 버퍼 flush
  flushInlineBuffer(inlineBuffer);

  return blocks;
};

// ============================================================
// Group blocks for rendering
// ============================================================
const groupBlocksForRendering = (blocks: ParsedBlock[]): RenderGroup[] => {
  const groups: RenderGroup[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // gallery는 그대로 단독 slider
    if (block.type === 'gallery') {
      groups.push({
        type: 'image-slider',
        blocks: [block],
      });
      i += 1;
      continue;
    }

    // 연속된 sliderberg 블록들을 하나의 slider로 묶기
    if (block.type === 'sliderberg') {
      const sliderbergGroup: ParsedBlock[] = [block];
      let j = i + 1;

      while (j < blocks.length && blocks[j].type === 'sliderberg') {
        sliderbergGroup.push(blocks[j]);
        j += 1;
      }

      groups.push({
        type: 'image-slider',
        blocks: sliderbergGroup,
      });

      i = j;
      continue;
    }

    // 나머지는 single
    groups.push({
      type: 'single',
      blocks: [block],
    });
    i += 1;
  }

  return groups;
};

// ============================================================
// Image extraction
// ============================================================
const stripWpResolutionSuffix = (url: string): string => {
  return url.replace(/-\d+x\d+\.(jpe?g|png|webp|gif|avif)$/i, '.$1');
};

const getBestImageUrl = (html: string): string | null => {
  const srcMatch = html.match(/<img[^>]+src="([^"]+)"/i);
  if (srcMatch) return toCdnUrl(stripWpResolutionSuffix(srcMatch[1]));

  const srcsetMatch = html.match(/srcset="([^"]+)"/i);
  if (srcsetMatch) {
    const entries = srcsetMatch[1].split(',').map((s) => s.trim());
    let bestUrl = '';
    let bestW = 0;

    for (const entry of entries) {
      const parts = entry.split(/\s+/);
      if (parts.length >= 2) {
        const w = parseInt(parts[1], 10);
        if (!Number.isNaN(w) && w > bestW) {
          bestW = w;
          bestUrl = parts[0];
        }
      }
    }

    if (bestUrl) return toCdnUrl(stripWpResolutionSuffix(bestUrl));
  }

  const aHrefMatch = html.match(
    /<a[^>]+href="([^"]+\.(?:jpe?g|png|webp|gif|avif)(?:\?[^"]*)?)"/i
  );
  if (aHrefMatch) return toCdnUrl(aHrefMatch[1]);

  const dataFullMatch = html.match(/data-(?:full-url|orig-file)="([^"]+)"/i);
  if (dataFullMatch) return toCdnUrl(dataFullMatch[1]);

  return null;
};

const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&');
};

const getImageMetaFromHtml = (
  html: string,
  fallbackAlign?: ParsedBlock['align']
): ExtractedImage | null => {
  const src = getBestImageUrl(html);
  if (!src) return null;

  const captionMatch = html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
  const widthMatch = html.match(/\bwidth=["']?(\d+)["']?/i);
  const heightMatch = html.match(/\bheight=["']?(\d+)["']?/i);
  const styleWidthMatch = html.match(/style=["'][^"']*width:\s*([^;"']+)/i);
  const styleMaxWidthMatch = html.match(/style=["'][^"']*max-width:\s*([^;"']+)/i);

  let classWidth: string | undefined;
if (/\bsize-thumbnail\b/i.test(html)) classWidth = '150px';
else if (/\bsize-medium\b/i.test(html)) classWidth = '300px';
else if (/\bsize-large\b/i.test(html)) classWidth = '1024px';
// size-full은 강제로 100% 주지 않음

  let align: ExtractedImage['align'] = fallbackAlign;

if (/\balignleft\b/i.test(html) || /float:\s*left/i.test(html)) {
  align = 'left';
} else if (/\balignright\b/i.test(html) || /float:\s*right/i.test(html)) {
  align = 'right';
} else if (
  /\baligncenter\b/i.test(html) ||
  (/margin-left:\s*auto/i.test(html) && /margin-right:\s*auto/i.test(html))
) {
  align = 'center';
} else if (/\balignwide\b/i.test(html)) {
  align = 'wide';
} else if (/\balignfull\b/i.test(html)) {
  align = 'full';
}

  return {
    src,
    caption: captionMatch
      ? decodeHtmlEntities(captionMatch[1].replace(/<[^>]+>/g, '').trim())
      : '',
    width: widthMatch ? Number(widthMatch[1]) : undefined,
    height: heightMatch ? Number(heightMatch[1]) : undefined,
    styleWidth: styleWidthMatch ? styleWidthMatch[1].trim() : undefined,
    styleMaxWidth: styleMaxWidthMatch ? styleMaxWidthMatch[1].trim() : undefined,
    classWidth,
    align,
  };
};

const extractImagesFromBlocks = (blocks: ParsedBlock[]): ExtractedImage[] => {
  const images: ExtractedImage[] = [];

  for (const block of blocks) {
    if (block.type === 'sliderberg') {
      const bgRegex = /background-image:\s*url\((['"]?)(.*?)\1\)/gi;
      let bgMatch;

      while ((bgMatch = bgRegex.exec(block.html)) !== null) {
        const rawSrc = bgMatch[2]?.trim();
        if (!rawSrc) continue;

        const normalizedSrc = toCdnUrl(stripWpResolutionSuffix(rawSrc));

        images.push({
          src: normalizedSrc,
          caption: '',
          align: block.align,
        });
      }

      if (images.length === 0) {
        const imgRegex = /<img[^>]*>/gi;
        let imgMatch;

        while ((imgMatch = imgRegex.exec(block.html)) !== null) {
          const meta = getImageMetaFromHtml(imgMatch[0], block.align);
          if (meta) images.push(meta);
        }
      }
    } else if (block.type === 'gallery') {
      const figureRegex = /<figure[^>]*>[\s\S]*?<\/figure>/gi;
      let m;

      while ((m = figureRegex.exec(block.html)) !== null) {
        const meta = getImageMetaFromHtml(m[0], block.align);
        if (meta) images.push(meta);
      }

      if (images.length === 0) {
        const imgRegex = /<img[^>]*>/gi;
        let im;

        while ((im = imgRegex.exec(block.html)) !== null) {
          const meta = getImageMetaFromHtml(im[0], block.align);
          if (meta) images.push(meta);
        }
      }
    } else if (block.type === 'image') {
      const meta = getImageMetaFromHtml(block.html, block.align);
      if (meta) images.push(meta);
    }
  }

  return images;
};

// ============================================================
// Shared image frame
// ============================================================
const ImageFrame = ({
  image,
  alt,
  priority = false,
  compact = false,
  eager = false,
}: {
  image: ExtractedImage;
  alt: string;
  priority?: boolean;
  compact?: boolean;
  eager?: boolean;
}) => {
  const wrapperAlignClass =
    image.align === 'left'
      ? 'mr-auto'
      : image.align === 'right'
      ? 'ml-auto'
      : 'mx-auto';

  const resolvedMaxWidth =
    image.styleMaxWidth ||
    (image.width ? `${image.width}px` : image.classWidth || undefined);

  const wrapperStyle: React.CSSProperties = {
    width: image.styleWidth || undefined,
    maxWidth: resolvedMaxWidth,
  };

  return (
    <div
      className={`flex ${
        image.align === 'left'
          ? 'justify-start'
          : image.align === 'right'
          ? 'justify-end'
          : 'justify-center'
      }`}
    >
      <div className={`${wrapperAlignClass}`} style={wrapperStyle}>
        <div className="flex items-center justify-center">
          <img
            src={image.src}
            alt={alt}
            width={image.width}
            height={image.height}
            className="block w-auto h-auto max-w-full object-contain"
            loading={eager || priority ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Individual Block Renderers
// ============================================================

  const ParagraphBlock = ({
  html,
  lang,
  align,
}: {
  html: string;
  lang: string;
  align?: ParsedBlock['align'];
}) => {
  const normalizedHtml = normalizeRenderableHtml(html);

  const textOnly = normalizedHtml
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\u00a0/g, '')
    .trim();

  const hasVisibleLineBreakOnly =
    /<br\s*\/?>/i.test(normalizedHtml) ||
    /<p[^>]*>\s*<br\s*\/?>\s*<\/p>/i.test(normalizedHtml) ||
    /<p[^>]*>\s*\u00a0+\s*<\/p>/i.test(normalizedHtml) ||
    /<div[^>]*>\s*\u00a0+\s*<\/div>/i.test(normalizedHtml);

  if (!textOnly && !hasVisibleLineBreakOnly) return null;

  const paragraphAlignClass = textAlignClass(align || 'left');

  return (
    <div className="w-full px-4 md:px-4">
      <div
        className={`${
          lang === 'jp'
            ? 'font-[var(--font-body-jp)]'
            : lang === 'en'
            ? 'font-[var(--font-body-en)]'
            : 'font-[var(--font-body-ko)]'
        } text-foreground/80 text-sm md:text-[16px] leading-[1.5] opacity-100 ${paragraphAlignClass}
          [&_p]:my-0
          [&_div]:my-0
          [&_p+p]:mt-5
          [&_div+div]:mt-5
          [&_p+div]:mt-5
          [&_div+p]:mt-5
          [&_strong]:font-bold [&_strong]:text-foreground [&_strong]:opacity-100
          [&_em]:italic
[&_em]:text-foreground
[&_em]:tracking-[0.01em]
[&_i]:italic
[&_i]:text-foreground
[&_i]:tracking-[0.01em]
          [&_ul]:my-1
          [&_ol]:my-1
          [&_li]:my-1
          ${wpContentStyles}`}
        dangerouslySetInnerHTML={{ __html: getRenderableHtml(normalizedHtml) }}
      />
    </div>
  );
};

const HeadingBlock = ({
  html,
  lang,
  align,
}: {
  html: string;
  lang: string;
  align?: ParsedBlock['align'];
}) => {
  const headingAlignClass = textAlignClass(align || 'left');

  return (
    <div className="w-full px-4 md:px-4">
      <div
        className={`${
          lang === 'jp'
            ? 'font-[var(--font-body-jp)]'
            : lang === 'en'
            ? 'font-[var(--font-body-en)]'
            : 'font-[var(--font-body-ko)]'
        } text-foreground/90 ${headingAlignClass}
          [&_h1]:text-[18px]
          [&_h1]:md:text-[22px]
          [&_h1]:leading-[1.3]
          [&_h1]:font-normal
          [&_h1]:tracking-[-0.01em]
          [&_h1]:mt-0
          [&_h1]:mb-3

          [&_h2]:text-[16px]
          [&_h2]:md:text-[19px]
          [&_h2]:leading-[1.5]
          [&_h2]:font-normal
          [&_h2]:tracking-[-0.01em]
          [&_h2]:mt-0
          [&_h2]:mb-3

          [&_h3]:text-[14px]
          [&_h3]:md:text-[16px]
          [&_h3]:leading-[1.55]
          [&_h3]:font-normal
          [&_h3]:tracking-[-0.005em]
          [&_h3]:mt-0
          [&_h3]:mb-2

          [&_h4]:text-[13px]
          [&_h4]:md:text-[14px]
          [&_h4]:leading-[1.6]
          [&_h4]:font-normal
          [&_h4]:mt-0
          [&_h4]:mb-2

          [&_h5]:text-[12px]
          [&_h5]:md:text-[13px]
          [&_h5]:leading-[1.6]
          [&_h5]:font-normal
          [&_h5]:mt-0
          [&_h5]:mb-2

          [&_h6]:text-[12px]
          [&_h6]:md:text-[12px]
          [&_h6]:leading-[1.6]
          [&_h6]:font-normal
          [&_h6]:mt-0
          [&_h6]:mb-2

          ${wpContentStyles}`}
        dangerouslySetInnerHTML={{ __html: getRenderableHtml(html) }}
      />
    </div>
  );
};

const SingleImageBlock = ({
  block,
  lang,
}: {
  block: ParsedBlock;
   lang: string;
}) => {
  const images = extractImagesFromBlocks([block]);
  if (images.length === 0) return null;

  const image = images[0];
  const captionAlignClass =
    image.align === 'right'
      ? 'text-right'
      : image.align === 'left'
      ? 'text-left'
      : 'text-center';

  return (
    <div className="max-w-5xl mx-auto px-1 md:px-12">
      <ImageFrame image={image} alt={image.caption || 'Image'} />
      {image.caption && (
        <p
  className={`text-[10px] md:text-[11px] text-muted-foreground/50 mt-3 ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  } ${captionAlignClass}`}
>
          {image.caption}
        </p>
      )}
    </div>
  );
};

// ============================================================
// Image Slider (gallery + sliderberg)
// ============================================================
const ImageSliderBlock = ({
  blocks,
  compact,
  lang,
}: {
  blocks: ParsedBlock[];
  compact?: boolean;
  lang: string;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const images = extractImagesFromBlocks(blocks);

  useEffect(() => {
    const updateDeviceType = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;

    const preloadIndexes = [
      currentSlide,
      (currentSlide + 1) % images.length,
      (currentSlide - 1 + images.length) % images.length,
    ];

    const uniqueIndexes = Array.from(new Set(preloadIndexes));

    uniqueIndexes.forEach((index) => {
      const src = images[index]?.src;
      if (!src) return;

      const img = new Image();
      img.src = src;
    });
  }, [currentSlide, images]);

  if (images.length === 0) return null;

  const currentImage = images[currentSlide];
  const currentCaption = currentImage?.caption || '';

 if (images.length === 1) {
  return (
    <div
      className={`${
        compact ? 'mb-8 md:mb-12' : 'mb-1 md:mb-20 min-[1025px]:mb-24'
      } -mx-6 md:-mx-12`}
    >
      <div className="w-full overflow-hidden">
        <ImageFrame
          image={images[0]}
          alt={images[0].caption || 'Image'}
          priority
          eager
          compact={compact}
        />
      </div>

      <div className="mt-5 h-6 flex items-center justify-center">
        {currentCaption && (
          <p
            className={`text-center text-[10px] md:text-[11px] leading-[1.5] tracking-[0.02em] text-muted-foreground/65 ${
              lang === 'jp'
                ? 'font-[var(--font-body-jp)]'
                : lang === 'en'
                ? 'font-[var(--font-body-en)]'
                : 'font-[var(--font-body-ko)]'
            }`}
          >
            {currentCaption}
          </p>
        )}
      </div>
    </div>
  );
}

  return (
    <div
      className={`${
        compact ? 'mb-8 md:mb-12' : 'mb-10 md:mb-10 min-[1025px]:mb-10'//단일 이미지,갤러리에 영향//
      } -mx-6 md:-mx-12`}
    >
      <div className="flex w-full flex-col items-center gap-5 md:gap-6">
        <div className="group relative w-full overflow-hidden">
          <div className="relative">
            {/* Desktop / Tablet: 좌우 invisible click zone */}
            <div
              className="hidden md:block absolute left-0 top-0 z-20 h-full w-1/2 cursor-pointer"
              onClick={goToPrev}
            />
            <div
              className="hidden md:block absolute right-0 top-0 z-20 h-full w-1/2 cursor-pointer"
              onClick={goToNext}
            />

            {/* Mobile: 전체 클릭시 다음 */}
            <div
              className="md:hidden absolute inset-0 z-20 cursor-pointer"
              onClick={goToNext}
            />

            {/* 현재 이미지 1장만 렌더 */}
            <div className="w-full">
              <ImageFrame
                image={currentImage}
                alt={currentImage.caption || `Gallery ${currentSlide + 1}`}
                priority
                eager
                compact={compact}
              />
            </div>
          </div>
        </div>

        <div className="h-auto flex items-center justify-center">
  {currentCaption && (() => {
    const lines = currentCaption
      .split('//')
      .map((p) => p.trim())
      .filter(Boolean);

    return (
      <div
        className={`text-center text-[10px] md:text-[11px] leading-[1.5] tracking-[0.02em] text-muted-foreground/52 ${
          lang === 'jp'
            ? 'font-[var(--font-body-jp)]'
            : lang === 'en'
            ? 'font-[var(--font-body-en)]'
            : 'font-[var(--font-body-ko)]'
        }`}
      >
        {lines.map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
    );
  })()}
</div>

        <div className="flex items-center justify-center gap-8 md:gap-10">
          <button
            type="button"
            className="relative z-10 flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer text-foreground/50 transition-colors active:scale-95 hover:text-foreground min-[1025px]:min-h-0 min-[1025px]:min-w-0"
            aria-label="Previous"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrev();
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 12 12"
              fill="none"
              className="rotate-180 pointer-events-none min-[1025px]:h-5 min-[1025px]:w-5"
            >
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="square"
              />
            </svg>
          </button>

          <span className="whitespace-nowrap text-[11px] tracking-[0.1em] text-foreground/50 min-[1025px]:font-['Ojuju'] min-[1025px]:text-[14px] font-mono">
            {String(currentSlide + 1).padStart(2, '0')} /{' '}
            {String(images.length).padStart(2, '0')}
          </span>

          <button
            type="button"
            className="relative z-10 flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer text-foreground/50 transition-colors active:scale-95 hover:text-foreground min-[1025px]:min-h-0 min-[1025px]:min-w-0"
            aria-label="Next"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 12 12"
              fill="none"
              className="pointer-events-none min-[1025px]:h-5 min-[1025px]:w-5"
            >
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Featured Film Label
// ============================================================
const FeaturedFilmLabel = () => null;

// ============================================================
// Video / Embed
// ============================================================
const VideoEmbedRenderer = ({
  src,
  isIframe = true,
  align,
}: {
  src: string;
  isIframe?: boolean;
  align?: ParsedBlock['align'];
}) => {
  const alignWrapper =
  align === 'left'
    ? 'max-w-5xl mr-auto'
    : align === 'right'
    ? 'max-w-5xl ml-auto'
    : align === 'full'
    ? 'w-full'
    : 'max-w-5xl mx-auto';

  return (
  <div className="mb-12 md:mb-20 -mx-6 md:-mx-12">
    <div className={alignWrapper}>
      <div className="relative w-full aspect-video bg-black/5 overflow-hidden">
          {isIframe ? (
            <iframe
              src={src}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <video
              src={src}
              controls
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
        <FeaturedFilmLabel />
      </div>
    </div>
  );
};

const VideoBlock = ({
  html,
  align,
}: {
  html: string;
  align?: ParsedBlock['align'];
}) => {
  const iframeSrcMatch = html.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i);
  const videoSrcMatch = html.match(/<video[^>]+src=['"]([^'"]+)['"]/i);
  const sourceSrcMatch = html.match(/<source[^>]+src=['"]([^'"]+)['"]/i);

  const src =
    iframeSrcMatch?.[1] ||
    videoSrcMatch?.[1] ||
    sourceSrcMatch?.[1];

  if (src) {
    return (
      <VideoEmbedRenderer
        src={src}
        isIframe={!!iframeSrcMatch}
        align={align}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 mb-12 md:mb-20">
      <div
        className="
          [&_iframe]:w-full
          [&_iframe]:aspect-video
          [&_iframe]:h-auto
          [&_iframe]:max-w-full
          [&_video]:w-full
          [&_video]:h-auto
          [&_video]:max-w-full
          [&_source]:hidden
        "
        dangerouslySetInnerHTML={{ __html: getRenderableHtml(html) }}
      />
    </div>
  );
};

const EmbedBlock = ({
  html,
  align,
}: {
  html: string;
  align?: ParsedBlock['align'];
}) => {
  const iframeSrcMatch = html.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i);
  const urlMatch = html.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([^\s<"]+)/
  );

  if (iframeSrcMatch) {
    return <VideoEmbedRenderer src={iframeSrcMatch[1]} align={align} />;
  }

  if (urlMatch) {
    const url = urlMatch[0];
    let embedUrl = url;

    if (url.includes('youtube') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('vimeo')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    return <VideoEmbedRenderer src={embedUrl} align={align} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12">
      <div
        className="
          [&_iframe]:w-full
          [&_iframe]:aspect-video
          [&_iframe]:h-auto
          [&_iframe]:max-w-full
          [&_video]:w-full
          [&_video]:h-auto
          [&_video]:max-w-full
          [&_source]:hidden
        "
        dangerouslySetInnerHTML={{ __html: getRenderableHtml(html) }}
      />
    </div>
  );
};

const ListBlock = ({
  html,
  lang,
  align,
}: {
  html: string;
  lang: string;
  align?: ParsedBlock['align'];
}) => (
  <div className="max-w-3xl mx-auto px-6 md:px-12">
    <div
      className={`${
        lang === 'jp' ? 'font-[Shippori_Mincho]' : 'font-serif'
      } text-foreground/80 text-sm md:text-base leading-[1.8] opacity-80 [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${textAlignClass(
        align
      )} ${wpContentStyles}`}
      dangerouslySetInnerHTML={{ __html: getRenderableHtml(html) }}
    />
  </div>
);

const QuoteBlock = ({
  html,
  lang,
  align,
}: {
  html: string;
  lang: string;
  align?: ParsedBlock['align'];
}) => (
  <div className="max-w-3xl mx-auto px-6 md:px-12">
    <blockquote
      className={`border-l-2 border-foreground/10 pl-6 ${
  lang === 'jp'
    ? 'font-[var(--font-body-jp)]'
    : lang === 'en'
    ? 'font-[var(--font-body-en)]'
    : 'font-[var(--font-body-ko)]'
} text-foreground/70 text-sm md:text-base leading-[1.8] italic ${textAlignClass(
  align
)} ${wpContentStyles}`}
      dangerouslySetInnerHTML={{ __html: getRenderableHtml(html) }}
    />
  </div>
);

const SeparatorBlock = () => (
  <div className="max-w-3xl mx-auto px-6 md:px-12">
    <hr className="border-t border-black/5 dark:border-white/10" />
  </div>
);

const SpacerBlock = () => <div className="h-8 md:h-12" />;

// ============================================================
// Main BlockRenderer
// ============================================================
interface BlockRendererProps {
  html: string;
  lang: string;
  mediaOnly?: boolean;
  imageOnly?: boolean;
  compact?: boolean;
}

const MEDIA_TYPES = new Set(['image', 'gallery', 'sliderberg', 'video', 'embed']);
const IMAGE_ONLY_TYPES = new Set(['image', 'gallery', 'sliderberg']);

export { parseBlocks, MEDIA_TYPES, groupBlocksForRendering };
export type { ParsedBlock, RenderGroup };

export const BlockRenderer = ({
  html,
  lang,
  mediaOnly = false,
  imageOnly = false,
  compact = false,
}: BlockRendererProps) => {
  const rawBlocks = parseBlocks(html);
  if (rawBlocks.length === 0) return null;

  let blocks = rawBlocks;

  if (mediaOnly) {
    const allowedTypes = imageOnly ? IMAGE_ONLY_TYPES : MEDIA_TYPES;
    blocks = blocks.filter(
      (b) =>
        allowedTypes.has(b.type) || b.type === 'spacer' || b.type === 'separator'
    );
  }

  if (blocks.length === 0) return null;

  const groups = groupBlocksForRendering(blocks);

    return (
    <div
      className="space-y-2 md:space-y-4 min-[1025px]:space-y-5"
      onClickCapture={handleLinkClick}
    >
      {groups.map((group, index) => {
        const key = `group-${index}`;

        if (group.type === 'image-slider') {
  return (
    <ImageSliderBlock
      key={key}
      blocks={group.blocks}
      compact={compact}
      lang={lang}
    />
  );
}

        const block = group.blocks[0];
        const blockKey = `block-${index}-${block.type}`;

        switch (block.type) {
          case 'paragraph':
            return (
              <ParagraphBlock
                key={blockKey}
                html={block.html}
                lang={lang}
                align={block.align}
              />
            );
          case 'heading':
            return (
              <HeadingBlock
                key={blockKey}
                html={block.html}
                lang={lang}
                align={block.align}
              />
            );
          case 'image':
            return <SingleImageBlock key={blockKey} block={block} lang={lang} />;
          case 'video':
            return <VideoBlock key={blockKey} html={block.html} align={block.align} />;
          case 'embed':
            return <EmbedBlock key={blockKey} html={block.html} align={block.align} />;
          case 'list':
            return (
              <ListBlock
                key={blockKey}
                html={block.html}
                lang={lang}
                align={block.align}
              />
            );
          case 'quote':
            return (
              <QuoteBlock
                key={blockKey}
                html={block.html}
                lang={lang}
                align={block.align}
              />
            );
          case 'separator':
            return <SeparatorBlock key={blockKey} />;
          case 'spacer':
            return <SpacerBlock key={blockKey} />;
          case 'unknown': {
  const unknownAlignClass = textAlignClass(block.align || 'left');

  return (
    <div key={blockKey} className="w-full px-4 md:px-4">
      <div
        className={`${
          lang === 'jp'
            ? 'font-[var(--font-body-jp)]'
            : lang === 'en'
            ? 'font-[var(--font-body-en)]'
            : 'font-[var(--font-body-ko)]'
        } text-foreground/80 text-sm md:text-[16px] leading-[1.35] opacity-100 ${unknownAlignClass}
          [&_p]:my-0
          [&_div]:my-0
          [&_p+p]:mt-5
          [&_div+div]:mt-5
          [&_p+div]:mt-5
          [&_div+p]:mt-5
          [&_strong]:font-bold [&_strong]:text-foreground [&_strong]:opacity-100
          [&_em]:italic
          [&_i]:italic
          [&_ul]:my-1
          [&_ol]:my-1
          [&_li]:my-1
          ${wpContentStyles}`}
        dangerouslySetInnerHTML={{ __html: getRenderableHtml(block.html) }}
      />
    </div>
  );
}
          default:
            return null;
        }
      })}
    </div>
  );
};