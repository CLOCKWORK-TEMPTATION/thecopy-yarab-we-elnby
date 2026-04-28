import { EventEmitter } from "node:events";

export type ConnectionOptions = Record<string, unknown>;

export interface JobsOptions {
  attempts?: number;
  backoff?: {
    type?: "fixed" | "exponential";
    delay?: number;
  };
  priority?: number;
  removeOnComplete?: unknown;
  removeOnFail?: unknown;
}

export interface QueueOptions {
  connection?: ConnectionOptions;
  defaultJobOptions?: JobsOptions;
}

export interface WorkerOptions {
  connection?: ConnectionOptions;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  autorun?: boolean;
  lockDuration?: number;
}

type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused";

interface QueueStore {
  name: string;
  jobs: Map<string, Job>;
  queueInstances: Set<Queue>;
  workers: Set<Worker>;
  nextId: number;
  paused: boolean;
  draining: boolean;
  defaultJobOptions: JobsOptions;
  timers: Set<NodeJS.Timeout>;
}

interface JobInit<DataType, NameType extends string> {
  store: QueueStore;
  id: string;
  name: NameType;
  data: DataType;
  opts: JobsOptions;
  state: JobState;
}

const stores = new Map<string, QueueStore>();
const NON_EXECUTING_PROCESSORS = new Set([
  "processAIAnalysis",
  "processDocument",
  "processCacheWarming",
]);

function getStore(
  name: string,
  defaultJobOptions: JobsOptions = {},
): QueueStore {
  let store = stores.get(name);
  if (!store) {
    store = {
      name,
      jobs: new Map(),
      queueInstances: new Set(),
      workers: new Set(),
      nextId: 0,
      paused: false,
      draining: false,
      defaultJobOptions,
      timers: new Set(),
    };
    stores.set(name, store);
  } else if (Object.keys(store.defaultJobOptions).length === 0) {
    store.defaultJobOptions = defaultJobOptions;
  }

  return store;
}

function mergeJobOptions(
  defaults: JobsOptions = {},
  overrides: JobsOptions = {},
): JobsOptions {
  return {
    ...defaults,
    ...overrides,
    backoff: {
      ...(defaults.backoff ?? {}),
      ...(overrides.backoff ?? {}),
    },
  };
}

function getJobStateCount(store: QueueStore, states: JobState[]): number {
  return Array.from(store.jobs.values()).filter((job) =>
    states.includes(job.__getState()),
  ).length;
}

function emitQueueEvent(
  store: QueueStore,
  event: string,
  ...args: unknown[]
): void {
  for (const queue of store.queueInstances) {
    queue.emit(event, ...args);
  }
}

function emitWorkerEvent(
  store: QueueStore,
  event: string,
  ...args: unknown[]
): void {
  for (const worker of store.workers) {
    worker.emit(event, ...args);
  }
}

function maybeCleanupStore(store: QueueStore): void {
  if (store.queueInstances.size > 0 || store.workers.size > 0) {
    return;
  }

  for (const timer of store.timers) {
    clearTimeout(timer);
  }
  store.timers.clear();
  store.jobs.clear();
  stores.delete(store.name);
}

function getRetryDelay(job: Job): number {
  const delay = job.opts.backoff?.delay ?? 0;
  if (!delay) return 0;

  if (job.opts.backoff?.type === "exponential") {
    return delay * Math.max(1, 2 ** Math.max(job.attemptsMade - 1, 0));
  }

  return delay;
}

function shouldProcessWithWorker(worker: Worker): boolean {
  return !NON_EXECUTING_PROCESSORS.has(worker.processorName);
}

function getNextWaitingJob(store: QueueStore): Job | undefined {
  const waitingJobs = Array.from(store.jobs.values()).filter(
    (job) => job.__getState() === "waiting",
  );

  waitingJobs.sort((left, right) => {
    const leftPriority = left.opts.priority ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = right.opts.priority ?? Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.timestamp - right.timestamp;
  });

  return waitingJobs[0];
}

function scheduleStoreDrain(store: QueueStore): void {
  if (store.draining || store.paused) {
    return;
  }

  queueMicrotask(() => {
    void drainStore(store);
  });
}

function drainStore(store: QueueStore): void {
  if (store.draining || store.paused) {
    return;
  }

  store.draining = true;

  try {
    while (!store.paused) {
      const worker = Array.from(store.workers).find(
        (candidate) =>
          !candidate.closed &&
          candidate.autorun &&
          shouldProcessWithWorker(candidate) &&
          candidate.activeCount < candidate.concurrency,
      );

      if (!worker) {
        break;
      }

      const job = getNextWaitingJob(store);
      if (!job) {
        break;
      }

      job.__setState("active");
      job.processedOn = Date.now();
      job.attemptsMade += 1;
      worker.activeCount += 1;

      emitQueueEvent(store, "active", job);
      emitWorkerEvent(store, "active", job);

      void runJob(store, worker, job);
    }
  } finally {
    store.draining = false;
  }
}

async function runJob(
  store: QueueStore,
  worker: Worker,
  job: Job,
): Promise<void> {
  try {
    const result = await worker.processor(job);
    await job.moveToCompleted(result, "0", false);
    emitQueueEvent(store, "completed", job);
    emitWorkerEvent(store, "completed", job);
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    emitQueueEvent(store, "failed", job, normalizedError);
    emitWorkerEvent(store, "failed", job, normalizedError);

    const maxAttempts = Math.max(job.opts.attempts ?? 1, 1);
    if (job.attemptsMade < maxAttempts) {
      job.failedReason = normalizedError.message;
      job.finishedOn = Date.now();
      job.__setState("delayed");

      const timer = setTimeout(() => {
        store.timers.delete(timer);
        if (!store.jobs.has(String(job.id))) {
          return;
        }

        job.failedReason = undefined;
        job.finishedOn = undefined;
        job.__setState(store.paused ? "paused" : "waiting");
        scheduleStoreDrain(store);
      }, getRetryDelay(job));

      store.timers.add(timer);
    } else {
      await job.moveToFailed(normalizedError, "0", false);
    }
  } finally {
    worker.activeCount = Math.max(0, worker.activeCount - 1);
    scheduleStoreDrain(store);
  }
}

export class Job<
  DataType = unknown,
  ReturnType = unknown,
  NameType extends string = string,
> {
  public readonly id?: string;
  public readonly name: NameType;
  public readonly data: DataType;
  public readonly opts: JobsOptions;
  public readonly timestamp: number;
  public progress: number | undefined;
  public returnvalue: ReturnType | undefined;
  public failedReason: string | undefined;
  public processedOn: number | undefined;
  public finishedOn: number | undefined;
  public attemptsMade = 0;

  private readonly store: QueueStore;
  private state: JobState;

  constructor(init: JobInit<DataType, NameType>) {
    this.store = init.store;
    this.id = init.id;
    this.name = init.name;
    this.data = init.data;
    this.opts = init.opts;
    this.state = init.state;
    this.timestamp = Date.now();
  }

  __getState(): JobState {
    return this.state;
  }

  __setState(state: JobState): void {
    this.state = state;
  }

  updateProgress(progress: number): Promise<void> {
    this.progress = progress;
    return Promise.resolve();
  }

  getState(): Promise<JobState> {
    return Promise.resolve(this.state);
  }

  moveToCompleted(
    returnvalue: ReturnType,
    _token: string,
    _fetchNext: boolean,
  ): Promise<void> {
    this.returnvalue = returnvalue;
    this.failedReason = undefined;
    this.finishedOn = Date.now();
    this.state = "completed";
    return Promise.resolve();
  }

  moveToFailed(
    error: Error,
    _token: string,
    _fetchNext: boolean,
  ): Promise<void> {
    this.returnvalue = undefined;
    this.failedReason = error.message;
    this.finishedOn = Date.now();
    this.state = "failed";
    return Promise.resolve();
  }

  retry(): Promise<void> {
    if (this.state !== "failed") {
      return Promise.resolve();
    }

    this.failedReason = undefined;
    this.finishedOn = undefined;
    this.state = this.store.paused ? "paused" : "waiting";
    scheduleStoreDrain(this.store);
    return Promise.resolve();
  }
}

export class Queue<
  DataType = unknown,
  ReturnType = unknown,
  NameType extends string = string,
> extends EventEmitter {
  public readonly name: string;
  public readonly opts: QueueOptions;
  public closed = false;

  private readonly store: QueueStore;

  constructor(name: string, opts: QueueOptions = {}) {
    super();
    this.name = name;
    this.opts = opts;
    this.store = getStore(name, opts.defaultJobOptions);
    this.store.queueInstances.add(this);
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error(`Queue ${this.name} is closed`);
    }
  }

  add(
    name: NameType,
    data: DataType,
    opts: JobsOptions = {},
  ): Promise<Job<DataType, ReturnType, NameType>> {
    this.ensureOpen();

    const id = String(++this.store.nextId);
    const mergedOptions = mergeJobOptions(this.store.defaultJobOptions, opts);
    const initialState: JobState = this.store.paused ? "paused" : "waiting";
    const job = new Job<DataType, ReturnType, NameType>({
      store: this.store,
      id,
      name,
      data,
      opts: mergedOptions,
      state: initialState,
    });

    this.store.jobs.set(id, job);
    emitQueueEvent(this.store, "waiting", job);

    if (!this.store.paused) {
      scheduleStoreDrain(this.store);
    }

    return Promise.resolve(job);
  }

  getJob(
    id: string | number,
  ): Promise<Job<DataType, ReturnType, NameType> | undefined> {
    this.ensureOpen();
    return Promise.resolve(
      this.store.jobs.get(String(id)) as
        | Job<DataType, ReturnType, NameType>
        | undefined,
    );
  }

  getWaitingCount(): Promise<number> {
    this.ensureOpen();
    return Promise.resolve(getJobStateCount(this.store, ["waiting", "paused"]));
  }

  getActiveCount(): Promise<number> {
    this.ensureOpen();
    return Promise.resolve(getJobStateCount(this.store, ["active"]));
  }

  getCompletedCount(): Promise<number> {
    this.ensureOpen();
    return Promise.resolve(getJobStateCount(this.store, ["completed"]));
  }

  getFailedCount(): Promise<number> {
    this.ensureOpen();
    return Promise.resolve(getJobStateCount(this.store, ["failed"]));
  }

  getDelayedCount(): Promise<number> {
    this.ensureOpen();
    return Promise.resolve(getJobStateCount(this.store, ["delayed"]));
  }

  async getJobCounts(): Promise<Record<string, number>> {
    this.ensureOpen();
    return {
      waiting: await this.getWaitingCount(),
      active: await this.getActiveCount(),
      completed: await this.getCompletedCount(),
      failed: await this.getFailedCount(),
      delayed: await this.getDelayedCount(),
    };
  }

  pause(): Promise<void> {
    this.ensureOpen();
    this.store.paused = true;

    for (const job of this.store.jobs.values()) {
      if (job.__getState() === "waiting") {
        job.__setState("paused");
      }
    }
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.ensureOpen();
    this.store.paused = false;

    for (const job of this.store.jobs.values()) {
      if (job.__getState() === "paused") {
        job.__setState("waiting");
      }
    }

    scheduleStoreDrain(this.store);
    return Promise.resolve();
  }

  isPaused(): Promise<boolean> {
    this.ensureOpen();
    return Promise.resolve(this.store.paused);
  }

  clean(
    grace: number,
    _limit: number,
    state: "completed" | "failed",
  ): Promise<void> {
    this.ensureOpen();

    const now = Date.now();
    for (const [id, job] of this.store.jobs.entries()) {
      if (job.__getState() !== state) {
        continue;
      }

      const finishedOn = job.finishedOn ?? now;
      if (grace === 0 || finishedOn <= now - grace) {
        this.store.jobs.delete(id);
      }
    }
    return Promise.resolve();
  }

  obliterate(_opts?: { force?: boolean }): Promise<void> {
    this.ensureOpen();

    for (const timer of this.store.timers) {
      clearTimeout(timer);
    }
    this.store.timers.clear();
    this.store.jobs.clear();
    return Promise.resolve();
  }

  close(): Promise<void> {
    if (this.closed) {
      return Promise.resolve();
    }

    this.closed = true;
    this.store.queueInstances.delete(this);
    maybeCleanupStore(this.store);
    return Promise.resolve();
  }
}

export class Worker<
  DataType = unknown,
  ReturnType = unknown,
  NameType extends string = string,
> extends EventEmitter {
  public readonly name: string;
  public readonly concurrency: number;
  public readonly autorun: boolean;
  public readonly processor: (
    job: Job<DataType, ReturnType, NameType>,
  ) => Promise<ReturnType>;
  public readonly processorName: string;
  public closed = false;
  public activeCount = 0;

  private readonly store: QueueStore;

  constructor(
    name: string,
    processor: (
      job: Job<DataType, ReturnType, NameType>,
    ) => Promise<ReturnType>,
    opts: WorkerOptions = {},
  ) {
    super();
    this.name = name;
    this.processor = processor;
    this.processorName = processor.name || "anonymous";
    this.concurrency = opts.concurrency ?? 1;
    this.autorun = opts.autorun !== false;
    this.store = getStore(name);
    this.store.workers.add(this as unknown as Worker);

    if (this.autorun) {
      scheduleStoreDrain(this.store);
    }
  }

  close(): Promise<void> {
    if (this.closed) {
      return Promise.resolve();
    }

    this.closed = true;
    this.store.workers.delete(this as unknown as Worker);
    maybeCleanupStore(this.store);
    return Promise.resolve();
  }
}

export const QueueEvents = {};
