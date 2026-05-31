import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AiGeneratedLabelProps {
  modelId: string;
  reviewStatus?: string;
}

function AiGeneratedLabel({
  modelId,
  reviewStatus = "Unreviewed",
}: Readonly<AiGeneratedLabelProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 font-mono text-[12px] text-fg-muted">
          <span aria-hidden>✦</span>
          <span>Auto-generated</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-[11px]">
          {modelId} · {reviewStatus}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export { AiGeneratedLabel };
