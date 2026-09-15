import type { AuditStore } from "./types.js";
import { PostgresAuditStore } from "./postgres.js";
import { SqliteAuditStore } from "./sqlite.js";

export function openAuditStore(auditDb: string): AuditStore {
  return /^postgres(ql)?:\/\//.test(auditDb)
    ? new PostgresAuditStore(auditDb)
    : new SqliteAuditStore(auditDb);
}
