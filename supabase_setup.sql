-- StudyFlow — À exécuter dans Supabase > SQL Editor > New query
-- Projet : oydtxmrajqjpngeybpaz

-- Supprimer si existe déjà (recommencer proprement)
DROP TABLE IF EXISTS userdata_pin;

-- Créer la table
CREATE TABLE userdata_pin (
  profile_id  TEXT PRIMARY KEY,
  username    TEXT NOT NULL DEFAULT '',
  payload     JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver le RLS (pas d'auth Supabase = pas de RLS nécessaire)
ALTER TABLE userdata_pin DISABLE ROW LEVEL SECURITY;

-- Autoriser explicitement la clé "anon" à tout faire
GRANT ALL ON userdata_pin TO anon;
GRANT ALL ON userdata_pin TO authenticated;

-- Mise à jour auto du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_pin()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER userdata_pin_updated_at
  BEFORE UPDATE ON userdata_pin
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_pin();

-- Vérification : doit afficher "userdata_pin" dans les résultats
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'userdata_pin';
