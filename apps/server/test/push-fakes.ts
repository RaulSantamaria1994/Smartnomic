import { PushError, type PushMessage, type PushReceipt, type PushSender } from '../src/push/expo';

/** Emisor falso: apunta lo enviado y responde con los tickets que se le pidan. */
export function fakeSender(
  options: {
    ticket?: (
      message: PushMessage,
      index: number,
    ) => { status: 'ok'; id: string } | { status: 'error'; error?: string };
    fail?: boolean;
    receipts?: Record<string, PushReceipt>;
  } = {},
) {
  const sent: PushMessage[][] = [];
  const receiptCalls: string[][] = [];
  const sender: PushSender = {
    async send(messages) {
      sent.push([...messages]);
      if (options.fail) throw new PushError(503);
      return messages.map(
        (m, i) =>
          options.ticket?.(m, i) ?? ({ status: 'ok', id: `ticket-${sent.length}-${i}` } as const),
      );
    },
    async receipts(ids) {
      receiptCalls.push([...ids]);
      return options.receipts ?? {};
    },
  };
  return { sender, sent, receiptCalls, messages: () => sent.flat() };
}

/** Temporizador falso: los avisos se «cierran» cuando el test lo decide. */
export function fakeScheduler() {
  const jobs: { fn: () => void; ms: number; cancelled: boolean; fired: boolean }[] = [];
  const schedule = (fn: () => void, ms: number) => {
    const job = { fn, ms, cancelled: false, fired: false };
    jobs.push(job);
    return () => {
      job.cancelled = true;
    };
  };
  const fire = (index: number) => {
    const job = jobs[index]!;
    if (job.cancelled || job.fired) return;
    job.fired = true;
    job.fn();
  };
  return { jobs, schedule, fire };
}

export function fakeLog() {
  const lines: { level: string; obj: object; msg: string }[] = [];
  return {
    lines,
    log: {
      warn: (obj: object, msg: string) => lines.push({ level: 'warn', obj, msg }),
      error: (obj: object, msg: string) => lines.push({ level: 'error', obj, msg }),
    },
  };
}
