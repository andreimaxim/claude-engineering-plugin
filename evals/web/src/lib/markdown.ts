// Markdown for untrusted model output. Raw HTML becomes literal text, images are
// replaced by a text placeholder so nothing is fetched, and only http(s) links
// navigate (in a new tab, without a referrer). The HTML string is generated from
// the syntax tree, so it can be inserted with {@html} safely.
import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";

function inertHtml() {
  return (tree: MdastRoot) => {
    visit(tree, "html", (node) => {
      (node as { type: string }).type = "text";
    });
  };
}

const text = (value: string): ElementContent => ({ type: "text", value });

function safeElements() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "img") {
        const alt = typeof node.properties.alt === "string" ? node.properties.alt : "";
        const src = typeof node.properties.src === "string" ? node.properties.src : undefined;
        node.tagName = "span";
        node.properties = { className: ["omitted-image"], title: src };
        node.children = [text(`[image not loaded${alt ? `: ${alt}` : ""}]`)];
        return;
      }
      if (node.tagName === "a") {
        const href = typeof node.properties.href === "string" ? node.properties.href : "";
        if (/^https?:\/\//.test(href)) {
          node.properties = { href, target: "_blank", rel: ["noopener", "noreferrer", "nofollow"] };
        } else {
          node.tagName = "span";
          node.properties = { className: ["inert-link"], title: href || undefined };
        }
        return;
      }
      if (node.tagName === "table" && parent && index !== undefined) {
        parent.children[index] = { type: "element", tagName: "div", properties: { className: ["table-scroll"] }, children: [node] };
        return [SKIP, index + 1];
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(inertHtml)
  .use(remarkRehype)
  .use(rehypeHighlight, { detect: false })
  .use(safeElements)
  .use(rehypeStringify);

export const renderMarkdown = (markdown: string): string => String(processor.processSync(markdown));

const languages: Record<string, string> = {
  py: "python", rb: "ruby", ts: "typescript", js: "javascript", json: "json", yml: "yaml", yaml: "yaml",
  sh: "bash", patch: "diff", diff: "diff", sql: "sql", go: "go", rs: "rust",
};

/** Markdown files render; other files become a highlighted code block. */
export function fileAsMarkdown(path: string, content: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "md") return content;
  const longest = Math.max(2, ...[...content.matchAll(/`{3,}/g)].map((m) => m[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${languages[extension] ?? ""}\n${content}\n${fence}`;
}
