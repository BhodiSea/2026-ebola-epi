import { Figure } from "./figure";

interface FigureOrMissingProps {
  className?: string;
  quoteId: null | string;
  value: number | string;
}

function FigureOrMissing({ quoteId, value, className }: Readonly<FigureOrMissingProps>) {
  if (quoteId === null) {
    return (
      <abbr title="Source unavailable" className={className}>
        {value}
        <sup className="ml-0.5 text-[8px] text-fg-subtle">?</sup>
      </abbr>
    );
  }
  return <Figure quoteId={quoteId} value={value} {...(className !== undefined && { className })} />;
}

export { FigureOrMissing };
