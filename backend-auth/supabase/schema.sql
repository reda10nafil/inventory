-- ============================================
-- SUPABASE SCHEMA - Synchroflow
-- ============================================

-- Utenti Google (auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operatori (multi-profilo per account Google)
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prodotti inventario
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log di sincronizzazione (per real-time tra operatori)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id);
CREATE INDEX IF NOT EXISTS idx_products_operator_id ON products(operator_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_operator_id ON sync_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: utenti vedono solo i propri dati
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid()::text = google_id);

CREATE POLICY "Operators can view own data"
  ON operators FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Products can be viewed by operators"
  ON products FOR SELECT
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Sync logs can be viewed by operators"
  ON sync_logs FOR SELECT
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
