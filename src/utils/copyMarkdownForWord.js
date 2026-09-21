import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const wrapClipboardHtml = (bodyHtml) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment-->${bodyHtml}<!--EndFragment--></body></html>`;

const markdownComponents = {
  br: () => createElement("br"),
  a: ({ href, children }) =>
    createElement("a", { href: href || undefined }, children),
};

/**
 * Render markdown to an HTML fragment suitable for pasting into Word.
 * Uses the same remark plugins as agent chat so copied output matches on-screen formatting.
 */
export const markdownToClipboardHtml = (markdown, { preprocess } = {}) => {
  const source = preprocess ? preprocess(String(markdown || "")) : String(markdown || "");
  const bodyHtml = renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm, remarkBreaks],
        components: markdownComponents,
      },
      source
    )
  );
  return wrapClipboardHtml(bodyHtml);
};

export const htmlFragmentToPlainText = (html) => {
  if (typeof document === "undefined") return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText || div.textContent || "").trim();
};

const writeHtmlClipboard = async (html, plainText) => {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      }),
    ]);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available");
  }

  const container = document.createElement("div");
  container.innerHTML = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/)?.[1] || html;
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  document.body.removeChild(container);

  if (!copied) {
    throw new Error("execCommand copy failed");
  }
};

/**
 * Copy markdown to the clipboard with rich HTML so Word preserves bold, lists, and headings.
 */
export const copyMarkdownForWord = async (markdown, { preprocess } = {}) => {
  const html = markdownToClipboardHtml(markdown, { preprocess });
  const fragment =
    html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/)?.[1] || "";
  const plainText = htmlFragmentToPlainText(fragment) || String(markdown || "").trim();

  try {
    await writeHtmlClipboard(html, plainText);
  } catch (err) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plainText);
      return;
    }
    throw err;
  }
};
