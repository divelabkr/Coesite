-- Migration: hash_recompute_intent
ALTER TABLE "AuditLog" ADD CONSTRAINT audit_hash_not_prev CHECK (hash <> "prevHash");
ALTER TABLE "WormLog" ADD CONSTRAINT worm_hash_not_prev CHECK (hash <> "prevHash");
ALTER TABLE "AdminActionLog" ADD CONSTRAINT admin_hash_not_prev CHECK (hash <> "prevHash");
ALTER TABLE "DmsTriggerLog" ADD CONSTRAINT dms_hash_not_prev CHECK (hash <> "prevHash");
ALTER TABLE "ProofBundle" ADD CONSTRAINT proof_hash_not_prev CHECK (hash <> "prevHash");

CREATE OR REPLACE FUNCTION verify_chain_insert() RETURNS trigger AS $$
DECLARE
  hash_exists boolean;
  prior_exists boolean;
  genesis_count int;
BEGIN
  -- TODO[Phase 1+]: hash should be sha256(canonical(payload, prevHash, agentId/source/...))
  IF NEW.hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Chain violation: invalid hash format on %', TG_TABLE_NAME
      USING ERRCODE = 'P0006';
  END IF;

  IF NEW.hash = NEW."prevHash" THEN
    RAISE EXCEPTION 'Chain violation: hash equals prevHash on %', TG_TABLE_NAME
      USING ERRCODE = 'P0007';
  END IF;

  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE hash = $1)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
    INTO hash_exists USING NEW.hash;
  IF hash_exists THEN
    RAISE EXCEPTION 'Chain violation: duplicate hash % on %', NEW.hash, TG_TABLE_NAME
      USING ERRCODE = 'P0003';
  END IF;

  IF NEW."prevHash" = 'GENESIS' THEN
    IF TG_TABLE_NAME = 'AuditLog' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE "agentId" = $1 AND "prevHash" = ''GENESIS''', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO genesis_count USING NEW."agentId";
    ELSIF TG_TABLE_NAME = 'WormLog' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE source = $1 AND "prevHash" = ''GENESIS''', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO genesis_count USING NEW.source;
    ELSIF TG_TABLE_NAME = 'AdminActionLog' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE "adminId" = $1 AND "prevHash" = ''GENESIS''', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO genesis_count USING NEW."adminId";
    ELSIF TG_TABLE_NAME = 'DmsTriggerLog' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE "triggerType" = $1 AND "prevHash" = ''GENESIS''', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO genesis_count USING NEW."triggerType";
    ELSIF TG_TABLE_NAME = 'ProofBundle' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE "sessionId" = $1 AND "prevHash" = ''GENESIS''', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO genesis_count USING NEW."sessionId";
    ELSE
      RAISE EXCEPTION 'Chain violation: unsupported table %', TG_TABLE_NAME
        USING ERRCODE = 'P0005';
    END IF;

    IF genesis_count > 0 THEN
      RAISE EXCEPTION 'Chain violation: duplicate GENESIS on %', TG_TABLE_NAME
        USING ERRCODE = 'P0003';
    END IF;
  ELSE
    IF TG_TABLE_NAME = 'AuditLog' THEN
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE "agentId" = $1 AND hash = $2)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO prior_exists USING NEW."agentId", NEW."prevHash";
    ELSIF TG_TABLE_NAME = 'WormLog' THEN
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE source = $1 AND hash = $2)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO prior_exists USING NEW.source, NEW."prevHash";
    ELSIF TG_TABLE_NAME = 'AdminActionLog' THEN
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE "adminId" = $1 AND hash = $2)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO prior_exists USING NEW."adminId", NEW."prevHash";
    ELSIF TG_TABLE_NAME = 'DmsTriggerLog' THEN
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE "triggerType" = $1 AND hash = $2)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO prior_exists USING NEW."triggerType", NEW."prevHash";
    ELSIF TG_TABLE_NAME = 'ProofBundle' THEN
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE "sessionId" = $1 AND hash = $2)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
        INTO prior_exists USING NEW."sessionId", NEW."prevHash";
    ELSE
      RAISE EXCEPTION 'Chain violation: unsupported table %', TG_TABLE_NAME
        USING ERRCODE = 'P0005';
    END IF;

    IF NOT prior_exists THEN
      RAISE EXCEPTION 'Chain violation: prevHash % not found on %', NEW."prevHash", TG_TABLE_NAME
        USING ERRCODE = 'P0004';
    END IF;
  END IF;

  RETURN NEW;
END; $$ LANGUAGE plpgsql;
