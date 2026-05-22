DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'coesite_runtime') THEN
    CREATE ROLE coesite_runtime LOGIN PASSWORD NULL;
  END IF;
END $$;

GRANT INSERT, SELECT ON "AuditLog", "WormLog", "AdminActionLog", "DmsTriggerLog", "ProofBundle" TO coesite_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog", "WormLog", "AdminActionLog", "DmsTriggerLog", "ProofBundle" FROM coesite_runtime;

GRANT SELECT, INSERT, UPDATE ON "Agent", "Session", "Policy" TO coesite_runtime;

-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO coesite_runtime;
