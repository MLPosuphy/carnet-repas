"use client";

import { ArrowLeft, ArrowRight, Check, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { finishCookingSessionAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RatingInput } from "@/components/ui/RatingInput";
import { Textarea } from "@/components/ui/Textarea";
import { Timer } from "@/components/ui/Timer";

type CookStep = {
  id: string;
  text: string;
  timerMinutes: number | null;
  temperature: string | null;
  equipment: string | null;
  tip: string | null;
};

export function CookModeStep({
  recipeId,
  title,
  defaultServings,
  steps
}: {
  recipeId: string;
  title: string;
  defaultServings: number;
  steps: CookStep[];
}) {
  const [index, setIndex] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [liveNote, setLiveNote] = useState("");
  const step = steps[index];

  const progress = useMemo(
    () => Math.round(((index + 1) / Math.max(steps.length, 1)) * 100),
    [index, steps.length]
  );

  if (showFinish) {
    return (
      <Card>
        <CardBody>
          <form
            action={finishCookingSessionAction.bind(null, recipeId)}
            className="grid gap-4"
          >
            <h2 className="text-2xl font-semibold">Session terminée</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Portions cuisinées
                <Input
                  name="servingsCooked"
                  type="number"
                  min={1}
                  defaultValue={defaultServings}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Temps préparation réel
                <Input name="actualPrepTimeMinutes" type="number" min={0} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Temps cuisson réel
                <Input name="actualCookTimeMinutes" type="number" min={0} />
              </label>
              <div className="grid gap-1 text-sm font-medium">
                Note
                <RatingInput />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                name="wouldCookAgain"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-[#d7cdbb]"
              />
              Je referais cette recette
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Commentaire
              <Textarea name="notes" defaultValue={liveNote} />
            </label>
            <Button type="submit">
              <Check className="h-4 w-4" />
              Enregistrer
            </Button>
          </form>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-[#6d6257]">
            Étape {index + 1} / {steps.length}
          </p>
          <div className="mt-2 h-2 rounded-full bg-cream">
            <div
              className="h-2 rounded-full bg-sage transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-xl leading-9">{step.text}</p>
          <div className="flex flex-wrap gap-2 text-sm text-[#6d6257]">
            {step.temperature ? <span>{step.temperature}</span> : null}
            {step.equipment ? <span>{step.equipment}</span> : null}
          </div>
          {step.tip ? (
            <p className="rounded-md bg-[#e2eadf] px-3 py-2 text-sm text-[#425c43]">
              {step.tip}
            </p>
          ) : null}
          {step.timerMinutes ? <Timer minutes={step.timerMinutes} /> : null}
        </div>

        <label className="grid gap-1 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Note pendant la cuisson
          </span>
          <Textarea
            value={liveNote}
            onChange={(event) => setLiveNote(event.target.value)}
            placeholder="Ajustements, idées, cuisson réelle..."
          />
        </label>

        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
          {index < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() =>
                setIndex((current) => Math.min(steps.length - 1, current + 1))
              }
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => setShowFinish(true)}>
              <Check className="h-4 w-4" />
              Terminer
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
