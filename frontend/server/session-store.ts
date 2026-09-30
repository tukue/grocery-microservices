import { randomUUID } from "node:crypto";

export interface SessionRecord {
  email: string;
  expiresAt: number;
  id: string;
  jwt: string;
  userId: string;
}
export type NewSession = Omit<SessionRecord, "id">;

export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  create(input: NewSession): SessionRecord {
    let id = randomUUID();
    while (this.sessions.has(id)) id = randomUUID();
    const session = { ...input, id };
    this.sessions.set(id, session);
    return session;
  }
  get(id: string | undefined, now = Date.now()): SessionRecord | null {
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= now) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }
  delete(id: string | undefined): boolean {
    return id ? this.sessions.delete(id) : false;
  }
  cleanup(now = Date.now()): number {
    let removed = 0;
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        removed += 1;
      }
    return removed;
  }
}
