export interface BatchJob<T = unknown> {
  id: string;
  input: T;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Blob;
  error?: string;
  progress: number;
}

export interface BatchProcessorOpts<T> {
  items: T[];
  concurrency?: number;
  onJobUpdate?: (job: BatchJob<T>) => void;
  onAllComplete?: (results: BatchJob<T>[]) => void;
  signal?: AbortSignal;
}

export class BatchProcessor<T = unknown> {
  private queue: BatchJob<T>[] = [];
  private running = 0;
  private concurrency: number;
  private onJobUpdate?: (job: BatchJob<T>) => void;
  private onAllComplete?: (results: BatchJob<T>[]) => void;
  private signal?: AbortSignal;
  private processFn!: (input: T, signal: AbortSignal) => Promise<Blob>;
  private resolveAll?: (results: BatchJob<T>[]) => void;

  constructor(
    processFn: (input: T, signal: AbortSignal) => Promise<Blob>,
    opts: BatchProcessorOpts<T>
  ) {
    this.concurrency = opts.concurrency ?? 3;
    this.onJobUpdate = opts.onJobUpdate;
    this.onAllComplete = opts.onAllComplete;
    this.signal = opts.signal;
    this.queue = opts.items.map((input, i) => ({
      id: `batch-${Date.now()}-${i}`,
      input,
      status: 'pending' as const,
      progress: 0,
    }));
  }

  async run(): Promise<BatchJob<T>[]> {
    return new Promise((resolve) => {
      this.resolveAll = resolve;
      this.signal?.addEventListener('abort', () => {
        this.queue.forEach(j => { if (j.status === 'pending') j.status = 'error'; });
        this.finish();
      });
      this.processNext();
    });
  }

  private processNext(): void {
    while (this.running < this.concurrency) {
      const job = this.queue.find(j => j.status === 'pending');
      if (!job) {
        if (this.running === 0) this.finish();
        return;
      }
      this.running++;
      this.runJob(job).finally(() => {
        this.running--;
        this.processNext();
      });
    }
  }

  private async runJob(job: BatchJob<T>): Promise<void> {
    job.status = 'processing';
    this.onJobUpdate?.(job);
    try {
      const ctrl = new AbortController();
      this.signal?.addEventListener('abort', () => ctrl.abort());
      job.result = await this.processFn(job.input, ctrl.signal);
      job.status = 'done';
      job.progress = 1;
    } catch (e) {
      job.status = 'error';
      job.error = e instanceof Error ? e.message : 'Unknown error';
    }
    this.onJobUpdate?.(job);
  }

  private finish(): void {
    this.onAllComplete?.(this.queue);
    this.resolveAll?.(this.queue);
  }
}

export function downloadBatchResults(jobs: BatchJob<unknown>[], filenamePrefix = 'batch'): void {
  jobs.forEach((job, i) => {
    if (job.result) {
      const ext = job.result.type.includes('mp4') ? 'mp4' : job.result.type.includes('webm') ? 'webm' : 'bin';
      const url = URL.createObjectURL(job.result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenamePrefix}-${i + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}
