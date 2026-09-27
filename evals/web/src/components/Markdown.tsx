import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

// Model output is untrusted. react-markdown never executes raw HTML (it renders as
// text); images are replaced by a text placeholder so nothing is fetched; only
// http(s) links navigate, and they open without a referrer.
const components: Components = {
  img: ({ alt, src }) => (
    <span className="omitted-image" title={typeof src === "string" ? src : undefined}>
      [image not loaded{alt ? `: ${alt}` : ""}]
    </span>
  ),
  a: ({ href, children }) =>
    href && /^https?:\/\//.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ) : (
      <span className="inert-link" title={href}>
        {children}
      </span>
    ),
  table: (props: ComponentProps<"table">) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  ),
};

export function Markdown({ text }: { text: string }) {
  if (!text.trim()) return <p className="muted">No text.</p>;
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: false }]]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

const languages: Record<string, string> = {
  py: "python", rb: "ruby", ts: "typescript", js: "javascript", json: "json", yml: "yaml", yaml: "yaml",
  sh: "bash", patch: "diff", diff: "diff", sql: "sql", go: "go", rs: "rust",
};

/** Show a file: Markdown renders, other files highlight by extension. */
export function FileContent({ path, content }: { path: string; content: string }) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "md") return <Markdown text={content} />;
  const longestFence = Math.max(2, ...[...content.matchAll(/`{3,}/g)].map((m) => m[0].length));
  const fence = "`".repeat(longestFence + 1);
  return <Markdown text={`${fence}${languages[extension] ?? ""}\n${content}\n${fence}`} />;
}
