CREATE OR REPLACE FUNCTION prevent_update_or_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'WORM violation: % on % is forbidden', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'WORM violation: TRUNCATE on % is forbidden', TG_TABLE_NAME
    USING ERRCODE = 'P0002';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER worm_audit_log BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER worm_audit_log_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER worm_log BEFORE UPDATE OR DELETE ON "WormLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER worm_log_truncate
  BEFORE TRUNCATE ON "WormLog"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER worm_admin_action_log BEFORE UPDATE OR DELETE ON "AdminActionLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER worm_admin_action_log_truncate
  BEFORE TRUNCATE ON "AdminActionLog"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER worm_dms_trigger_log BEFORE UPDATE OR DELETE ON "DmsTriggerLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER worm_dms_trigger_log_truncate
  BEFORE TRUNCATE ON "DmsTriggerLog"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER worm_proof_bundle BEFORE UPDATE OR DELETE ON "ProofBundle"
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER worm_proof_bundle_truncate
  BEFORE TRUNCATE ON "ProofBundle"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();
