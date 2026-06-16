"use client";

import { Star } from "lucide-react";
import { useState } from "react";

export function RatingInput({
  name = "rating",
  defaultValue = 4
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [rating, setRating] = useState(defaultValue);

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={rating} />
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        return (
          <button
            key={value}
            type="button"
            className="focus-ring rounded-md p-1 text-brass"
            onClick={() => setRating(value)}
            aria-label={`${value} sur 5`}
          >
            <Star
              className="h-5 w-5"
              fill={value <= rating ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
