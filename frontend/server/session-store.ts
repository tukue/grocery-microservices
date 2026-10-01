import { randomUUID } from "node:crypto";
import { createClient, type RedisClientType } from "redis";

export interface SessionRecord {
  email: string;
  expiresAt: number;
  id: string;
  jwt: string;
  userId: string;
}
export type NewSession = Omit<SessionRecord, "id">;

export interface SessionStore {
  create(input: NewSession): Promise<SessionRecord>;
  get(id: string | undefined, now?: number): Promise<SessionRecord | null>;
  delete(id: string | undefined): Promise<boolean>;
}

export class RedisSessionStore implements SessionStore {
  private constructor(
    private readonly client: RedisClientType,
    private readonly prefix = "grocery:session:",
  ) {}

  static async connect(url: string): Promise<RedisSessionStore> {
    const client = createClient({ url });
    client.on("error", (error) =>
      // eslint-disable-next-line no-console
      console.error("Redis session store error", error),
    );
    await client.connect();
    return new RedisSessionStore(client as RedisClientType);
  }

  async create(input: NewSession): Promise<SessionRecord> {
    const session = { ...input, id: randomUUID() };
    const ttl = Math.max(1, Math.ceil((input.expiresAt - Date.now()) / 1000));
    await this.client.set(this.prefix + session.id, JSON.stringify(session), {
      EX: ttl,
      NX: true,
    });
    return session;
  }

  async get(id: string | undefined, now = Date.now()) {
    if (!id) return null;
    const raw = await this.client.get(this.prefix + id);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as SessionRecord;
      if (session.id !== id || session.expiresAt <= now) {
        await this.delete(id);
        return null;
      }
      return session;
    } catch {
      await this.delete(id);
      return null;
    }
  }

  async delete(id: string | undefined) {
    return id ? (await this.client.del(this.prefix + id)) > 0 : false;
  }
}

/** Test-only adapter. Runtime code uses RedisSessionStore. */
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  async create(input: NewSession): Promise<SessionRecord> {
    const session = { ...input, id: randomUUID() };
    this.sessions.set(session.id, session);
    return session;
  }
  async get(id: string | undefined, now = Date.now()) {
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }
  async delete(id: string | undefined) {
    return id ? this.sessions.delete(id) : false;
  }
}
