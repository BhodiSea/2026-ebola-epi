import { FilterChipsInteractive } from "./filter-chips-interactive";
import { listPathogens } from "@/lib/queries/outbreaks";

interface FilterChipsProps {
  currentPathogen?: string;
  currentStatus?: string;
}

async function FilterChips({ currentPathogen, currentStatus }: Readonly<FilterChipsProps>) {
  const pathogens = await listPathogens();
  return (
    <FilterChipsInteractive
      pathogens={pathogens}
      {...(currentPathogen !== undefined && { currentPathogen })}
      {...(currentStatus !== undefined && { currentStatus })}
    />
  );
}

export { FilterChips };
