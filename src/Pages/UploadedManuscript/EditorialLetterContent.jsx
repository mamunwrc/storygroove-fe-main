import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { formatEditorialLetterMarkdown } from "./editorialLetterFormat";

const letterMarkdownComponents = {
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  hr: () => <hr className="elm-letter-divider" aria-hidden="true" />,
  br: () => <span className="elm-letter-line-break" aria-hidden="true" />,
};

const EditorialLetterContent = ({ children, className = "" }) => {
  const formatted = useMemo(
    () => formatEditorialLetterMarkdown(children),
    [children]
  );

  return (
    <div className={`elm-letter-markdown ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={letterMarkdownComponents}
      >
        {formatted}
      </ReactMarkdown>
    </div>
  );
};

export default memo(EditorialLetterContent);
