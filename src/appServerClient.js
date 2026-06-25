const { spawn } = require("node:child_process");
const readline = require("node:readline");
const EventEmitter = require("node:events");
const { codexCommand, codexEnv } = require("./codexBinary");

class AppServerClient extends EventEmitter {
  constructor({ cwd }) {
    super();
    this.cwd = cwd;
    this.nextId = 1;
    this.pending = new Map();
    this.proc = null;
  }

  start() {
    this.proc = spawn(codexCommand(), ["app-server"], {
      cwd: this.cwd,
      env: codexEnv(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    // app-server writes non-fatal operational logs to stderr.
    this.proc.stderr.resume();

    this.proc.on("error", (error) => {
      this.emit("notification", { method: "error", params: { message: `failed to start codex app-server: ${error.message}` } });
    });

    this.proc.on("exit", (code) => {
      this.emit("notification", { method: "error", params: { message: `codex app-server exited: ${code}` } });
    });

    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => this.handleLine(line));
  }

  handleLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }

    if (msg.method) this.emit("notification", msg);
  }

  send(method, params) {
    const id = this.nextId++;
    const message = params === undefined ? { method, id } : { method, id, params };
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 15000);
    });
  }

  notify(method, params) {
    this.proc.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  async initialize() {
    await this.send("initialize", {
      clientInfo: {
        name: "codex_learning_pet",
        title: "Codex Learning Pet",
        version: "0.1.0"
      },
      capabilities: { experimentalApi: true }
    });
    this.notify("initialized", {});
    this.emit("notification", { method: "app/connected", params: {} });
  }

  async latestThread() {
    const listed = await this.send("thread/list", {
      cwd: this.cwd,
      limit: 1,
      sortKey: "updated_at",
      sortDirection: "desc",
      archived: false
    });
    return listed?.data?.[0] || null;
  }

  async resumeThread(thread) {
    if (!thread) return null;
    await this.send("thread/resume", { threadId: thread.id, cwd: this.cwd });
    this.emit("notification", { method: "app/threadSelected", params: thread });
    return thread;
  }

  async attachLatestThread() {
    return this.resumeThread(await this.latestThread());
  }

  async readThread(threadId) {
    return this.send("thread/read", { threadId, includeTurns: true });
  }

  stop() {
    if (this.proc && !this.proc.killed) this.proc.kill();
  }
}

module.exports = { AppServerClient };
