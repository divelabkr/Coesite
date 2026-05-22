-- Migration: drop_stale_audit_index
DROP INDEX IF EXISTS "AuditLog_hash_idx";
