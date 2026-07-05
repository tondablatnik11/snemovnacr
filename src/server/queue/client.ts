// BullMQ + Redis client

import { Queue, QueueEvents, type ConnectionOptions } from "bullmq";
import { env } from "~/lib/env";

const connection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

// Queue names
export const QUEUE_NAMES = {
  ETL: "etl",
  EMBED: "embed",
  NOTIFY: "notify",
} as const;

// Jednotlivé fronty (lazy init pro testy)
const queues = new Map<string, Queue>();

export function getQueue(name: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection }));
  }
  return queues.get(name)!;
}

export function getQueueEvents(name: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]) {
  return new QueueEvents(name, { connection });
}

// Job typy
export type EtlJobData =
  | { kind: "all" }
  | { kind: "poslanci" }
  | { kind: "hlasovani"; term: number }
  | { kind: "tisky" }
  | { kind: "interpelace" }
  | { kind: "steno"; term: number };

export type EmbedJobData =
  | { kind: "hlasovani"; id: number; text: string }
  | { kind: "tisk"; id: number; text: string }
  | { kind: "rec"; id: number; text: string };

export type NotifyJobData =
  | { kind: "watch-alert"; userId: string; targetType: string; targetId: string }
  | { kind: "petition-milestone"; peticeId: string; count: number };