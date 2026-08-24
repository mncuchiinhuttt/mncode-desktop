import type { ModelOption } from "@/types";

export function modelLabel(value: string, models: ModelOption[]) {
  return models.find((model) => model.id === value)?.name ?? value;
}
