import { Clock } from "lucide-react";

export function RecipeSteps({
  steps
}: {
  steps: Array<{
    id: string;
    sortOrder: number;
    text: string;
    timerMinutes: number | null;
    temperature: string | null;
    equipment: string | null;
    tip: string | null;
  }>;
}) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li key={step.id} className="rounded-md border border-[#eee6da] bg-white p-4">
          <div className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div className="grid gap-2">
              <p className="leading-7">{step.text}</p>
              <div className="flex flex-wrap gap-2 text-sm text-[#6d6257]">
                {step.timerMinutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    {step.timerMinutes} min
                  </span>
                ) : null}
                {step.temperature ? <span>{step.temperature}</span> : null}
                {step.equipment ? <span>{step.equipment}</span> : null}
              </div>
              {step.tip ? (
                <p className="rounded-md bg-[#e2eadf] px-3 py-2 text-sm text-[#425c43]">
                  {step.tip}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
