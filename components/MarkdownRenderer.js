import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

/**
 * Shared by the post page (Server Component) and the editor preview (client).
 *
 * Safety: react-markdown never renders raw HTML (no rehype-raw), and the tree
 * is additionally passed through rehype-sanitize. The default (GitHub) schema
 * already allows `language-*` classes on <code>; sanitize runs BEFORE
 * highlight so the highlighter's own <span class="hljs-*"> output is kept.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className', /^language-./]],
  },
};

const components = {
  a({ node, href, children, ...props }) {
    const external = href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...props}
        {...(external && { target: '_blank', rel: 'noopener noreferrer nofollow' })}
      >
        {children}
      </a>
    );
  },
  table({ node, ...props }) {
    return (
      <div className="my-6 overflow-x-auto">
        <table {...props} />
      </div>
    );
  },
  img({ node, alt, ...props }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt || ''} loading="lazy" {...props} />;
  },
};

export default function MarkdownRenderer({ content, className = '' }) {
  return (
    <div
      className={`markdown-body prose max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-white prose-h2:text-[1.9em] prose-h3:text-[1.4em] prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-indigo-300 prose-a:underline-offset-4 hover:prose-a:text-white prose-img:rounded-xl prose-pre:p-5 prose-hr:border-white/10 prose-th:text-slate-400 prose-th:text-xs prose-th:uppercase prose-th:tracking-[0.2em] ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema], [rehypeHighlight, { detect: false }]]}
        components={components}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
