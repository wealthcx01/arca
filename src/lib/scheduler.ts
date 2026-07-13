/**
 * Simple job scheduler using setInterval.
 * Replaces Vobase ctx.scheduler.
 */

type JobFn = () => Promise<void>;

interface ScheduledJob {
  name: string;
  fn: JobFn;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
  lastRun: Date | null;
  lastError: string | null;
}

class Scheduler {
  private jobs = new Map<string, ScheduledJob>();

  register(name: string, fn: JobFn, intervalMs: number): void {
    this.jobs.set(name, {
      name,
      fn,
      intervalMs,
      timer: null,
      running: false,
      lastRun: null,
      lastError: null,
    });
  }

  start(name: string): void {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job not found: ${name}`);
    if (job.timer) return; // Already running

    const run = async () => {
      if (job.running) return;
      job.running = true;
      try {
        await job.fn();
        job.lastRun = new Date();
        job.lastError = null;
      } catch (err) {
        job.lastError = err instanceof Error ? err.message : String(err);
        console.error(`[scheduler] Job ${name} failed:`, job.lastError);
      } finally {
        job.running = false;
      }
    };

    job.timer = setInterval(run, job.intervalMs);
    // Also run immediately
    run();
  }

  startAll(): void {
    for (const name of this.jobs.keys()) {
      this.start(name);
    }
  }

  stop(name: string): void {
    const job = this.jobs.get(name);
    if (!job?.timer) return;
    clearInterval(job.timer);
    job.timer = null;
  }

  stopAll(): void {
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  async runOnce(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job not found: ${name}`);
    if (job.running) throw new Error(`Job ${name} already running`);

    job.running = true;
    try {
      await job.fn();
      job.lastRun = new Date();
      job.lastError = null;
    } catch (err) {
      job.lastError = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      job.running = false;
    }
  }

  getStatus(): Array<{
    name: string;
    running: boolean;
    lastRun: Date | null;
    lastError: string | null;
  }> {
    return Array.from(this.jobs.values()).map((j) => ({
      name: j.name,
      running: j.running,
      lastRun: j.lastRun,
      lastError: j.lastError,
    }));
  }
}

export const scheduler = new Scheduler();
