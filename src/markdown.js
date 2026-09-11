import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function documentBody(doc, esc) {
  if (!/\.(md|markdown)$/i.test(doc.name || '')) return `<pre class="document-text">${esc(doc.text)}</pre>`;
  // Project documents are untrusted. No remote images, active HTML or navigation.
  const html = DOMPurify.sanitize(marked.parse(doc.text || '', { gfm: true }), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'del', 'blockquote',
      'ul', 'ol', 'li', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'input', 'details', 'summary'],
    ALLOWED_ATTR: ['title', 'start', 'type', 'checked', 'disabled'],
    ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
  });
  const template = document.createElement('template'); template.innerHTML = html;
  for (const input of template.content.querySelectorAll('input')) {
    input.type = 'checkbox'; input.disabled = true;
  }
  return `<article class="markdown-preview">${template.innerHTML}</article><details class="markdown-source"><summary>Voir le Markdown source</summary><pre class="document-text">${esc(doc.text)}</pre></details>`;
}
