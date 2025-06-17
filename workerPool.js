const { Worker } = require('worker_threads');
const path = require('path');

class WorkerPool {
  constructor(workerPath, poolSize = require('os').cpus().length) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];

    for (let i = 0; i < poolSize; i++) {
      this._addNewWorker();
    }
  }

  _addNewWorker() {
    const worker = new Worker(this.workerPath);
    worker.on('message', (result) => {
      worker._resolve(result);
      this.idleWorkers.push(worker);
      this._processQueue();
    });
    worker.on('error', (err) => {
      if (worker._reject) worker._reject(err);
      // Remove faulty worker and replace it
      this.workers = this.workers.filter(w => w !== worker);
      this.idleWorkers = this.idleWorkers.filter(w => w !== worker);
      this._addNewWorker();
    });
    worker.on('exit', (code) => {
      this.workers = this.workers.filter(w => w !== worker);
      this.idleWorkers = this.idleWorkers.filter(w => w !== worker);
      if (code !== 0) this._addNewWorker();
    });
    this.workers.push(worker);
    this.idleWorkers.push(worker);
  }

  _processQueue() {
    if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) return;
    const { message, resolve, reject } = this.taskQueue.shift();
    const worker = this.idleWorkers.shift();
    worker._resolve = resolve;
    worker._reject = reject;
    worker.postMessage(message);
  }

  runTask(message) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ message, resolve, reject });
      this._processQueue();
    });
  }
}
module.exports = WorkerPool;