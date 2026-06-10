import { createHighlighter, type Highlighter } from 'shiki';

// Languages preloaded into the highlighter. Anything else falls back to plain text.
const HIGHLIGHT_LANGS = [
  'python',
  'go',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'bash',
  'sql',
  'json',
  'yaml',
  'dockerfile',
  'rust',
  'toml',
] as const;

const LANG_ALIASES: Record<string, string> = {
  py: 'python',
  golang: 'go',
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  docker: 'dockerfile',
  rs: 'rust',
};

// Singleton highlighter: a static export prerenders 70+ posts in one worker, and
// createHighlighter loads WASM + grammars (~100ms+) — paying that once matters.
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: [...HIGHLIGHT_LANGS],
    });
  }
  return highlighterPromise;
}

function resolveLang(lang: string | undefined): string {
  const normalized = (lang || '').toLowerCase();
  const resolved = LANG_ALIASES[normalized] || normalized;
  return (HIGHLIGHT_LANGS as readonly string[]).includes(resolved) ? resolved : 'text';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function highlightCodeBlock(code: string, lang: string | undefined): Promise<string> {
  const language = resolveLang(lang);
  const trimmed = code.replace(/\n+$/, '');
  let body: string;

  if (language === 'text') {
    body = `<pre class="shiki"><code>${escapeHtml(trimmed)}</code></pre>`;
  } else {
    const highlighter = await getHighlighter();
    body = highlighter.codeToHtml(trimmed, {
      lang: language,
      themes: { dark: 'vitesse-dark', light: 'vitesse-light' },
      defaultColor: false,
    });
  }

  const badge =
    language === 'text' ? '' : `<span class="code-block-lang" aria-hidden="true">${language}</span>`;
  return `<div class="code-block">${badge}${body}</div>`;
}

// Markdown -> HTML for blog posts. Runs at build time on the server (shiki stays out of
// the client bundle). Ported from the previous client-side renderer; code blocks now go
// through shiki and `>` blockquotes are supported.
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  let html = markdown;

  // Phase 1: Extract code blocks and inline code, replace with placeholders
  // This prevents HTML in code examples from being parsed as live DOM elements
  const codeBlockSources: { lang?: string; code: string }[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlockSources.length;
    codeBlockSources.push({ lang, code });
    return `%%CODEBLOCK_${index}%%`;
  });
  const codeBlocks = await Promise.all(
    codeBlockSources.map(({ lang, code }) => highlightCodeBlock(code, lang))
  );

  const inlineCodeBlocks: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const index = inlineCodeBlocks.length;
    inlineCodeBlocks.push(
      `<code style="background: var(--surface);" class="text-theme-accent px-2 py-1 rounded text-sm">${escapeHtml(code)}</code>`
    );
    return `%%INLINECODE_${index}%%`;
  });

  // Phase 2: Apply markdown transformations (code is safely extracted)
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-8 mb-4 text-theme">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-10 mb-6 text-theme">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-12 mb-8 text-theme">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-theme">$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Links — internal links (starting with / or #) stay in-tab; external open in a new tab
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const isInternal = url.startsWith('/') || url.startsWith('#');
    const attrs = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"';
    return `<a href="${url}" class="text-theme-accent hover:opacity-80 underline"${attrs}>${text}</a>`;
  });

  // GFM tables — header row, separator row, then body rows (inline formatting already applied)
  const tableBlocks: string[] = [];
  html = html.replace(
    /^[ \t]*\|(.+)\|[ \t]*\n[ \t]*\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|[ \t]*\n((?:[ \t]*\|.*\|[ \t]*\n?)+)/gm,
    (_match, headerLine, bodyLines) => {
      const parseCells = (line: string) =>
        line.replace(/^[ \t]*\|/, '').replace(/\|[ \t]*$/, '').split('|').map((c) => c.trim());
      const headers: string[] = parseCells(headerLine);
      const rows: string[][] = (bodyLines as string).trim().split('\n').filter(Boolean).map(parseCells);
      const thead =
        '<thead><tr>' +
        headers.map((h: string) => `<th style="border:1px solid var(--border);" class="px-3 py-2 text-left font-semibold text-theme">${h}</th>`).join('') +
        '</tr></thead>';
      const tbody =
        '<tbody>' +
        rows.map((r: string[]) => '<tr>' + r.map((c: string) => `<td style="border:1px solid var(--border);" class="px-3 py-2 text-theme-secondary align-top">${c}</td>`).join('') + '</tr>').join('') +
        '</tbody>';
      const index = tableBlocks.length;
      tableBlocks.push(`<div class="overflow-x-auto my-6"><table class="w-full border-collapse text-sm">${thead}${tbody}</table></div>`);
      return `%%TABLE_${index}%%\n\n`;
    }
  );

  // Blockquotes — consecutive `> ` lines become one <blockquote>. Quotes whose first
  // bold run is Note:/Warning:/Tip: render as a callout card instead of a plain quote.
  const blockquoteBlocks: string[] = [];
  html = html.replace(/(?:^[ \t]*>[ \t]?.*(?:\n|$))+/gm, (match) => {
    const inner = match
      .trimEnd()
      .split('\n')
      .map((line) => line.replace(/^[ \t]*>[ \t]?/, ''))
      .join('<br />')
      .replace(/(?:<br \/>){2,}/g, '<br /><br />');
    const calloutMatch = inner.match(/^<strong[^>]*>(Note|Warning|Tip):/i);
    const calloutClass = calloutMatch ? ` callout callout-${calloutMatch[1].toLowerCase()}` : '';
    const index = blockquoteBlocks.length;
    blockquoteBlocks.push(`<blockquote class="text-theme-secondary${calloutClass}">${inner}</blockquote>`);
    return `%%BLOCKQUOTE_${index}%%\n\n`;
  });

  // Bullet lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 list-disc text-theme-secondary">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-disc text-theme-secondary">.*<\/li>\n?)+/g, '<ul class="my-4">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2 list-decimal text-theme-secondary">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2 list-decimal text-theme-secondary">.*<\/li>\n?)+/g, '<ol class="my-4">$&</ol>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="text-theme-secondary leading-relaxed mb-4">');
  html = `<p class="text-theme-secondary leading-relaxed mb-4">${html}</p>`;

  // Phase 3: Restore tables, blockquotes, and code blocks from placeholders
  tableBlocks.forEach((block, index) => {
    html = html.replace(`%%TABLE_${index}%%`, block);
  });
  blockquoteBlocks.forEach((block, index) => {
    html = html.replace(`%%BLOCKQUOTE_${index}%%`, block);
  });
  codeBlocks.forEach((block, index) => {
    html = html.replace(`%%CODEBLOCK_${index}%%`, block);
  });
  inlineCodeBlocks.forEach((block, index) => {
    html = html.replace(`%%INLINECODE_${index}%%`, block);
  });

  return html;
}
