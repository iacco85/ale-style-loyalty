import { z } from "@hono/zod-openapi";

export const loyaltyProgressSchema = z.object({
  points_per_reward: z.number().openapi({ description: "Punti necessari per uno sconto", example: 100 }),
  reward_euros: z.number().openapi({ description: "Euro di sconto ogni `points_per_reward` punti", example: 5 }),
  rewards_available: z.number().openapi({ description: "Sconti già sbloccati e non ancora usati" }),
  rewards_total_euros: z.number().openapi({ description: "Importo totale degli sconti sbloccati (sconti × euro per sconto)" }),
  points_into_next: z.number().openapi({ description: "Punti accumulati verso il prossimo sconto" }),
  points_to_next: z.number().openapi({ description: "Punti che mancano al prossimo sconto" }),
  percent: z.number().openapi({ description: "0-99, avanzamento della barra verso il prossimo sconto" }),
});

export const loyaltySnapshotSchema = loyaltyProgressSchema.extend({ points: z.number() });

export function toProgress({ points: _points, ...progress }: z.infer<typeof loyaltySnapshotSchema>) {
  return progress;
}
