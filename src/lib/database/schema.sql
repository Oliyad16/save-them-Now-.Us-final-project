-- User Management Schema for Save Them Now Platform
-- This extends the existing missing persons database with user management capabilities

-- Core Users table for NextAuth.js compatibility
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  emailVerified DATETIME,
  image TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User profiles with additional information
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  zip_code TEXT,
  phone TEXT,
  preferred_name TEXT,
  notification_preferences TEXT DEFAULT '{"email": true, "push": false, "sms": false}',
  privacy_settings TEXT DEFAULT '{"profile_visible": false, "share_location": false}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- NextAuth.js required tables
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires DATETIME NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Subscription management
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER, -- in cents
  features TEXT NOT NULL, -- JSON string with feature list
  ai_interactions_daily INTEGER DEFAULT 0, -- 0 = unlimited
  map_access_level TEXT DEFAULT 'full', -- 'limited', 'full', 'premium'
  priority_support BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, canceled, past_due, unpaid
  current_period_start DATETIME,
  current_period_end DATETIME,
  canceled_at DATETIME,
  trial_end DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);

-- Usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS usage_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'ai_interaction', 'api_call', 'map_view', etc.
  resource_id TEXT, -- specific resource accessed
  metadata TEXT, -- JSON with additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily usage summaries for efficient rate limiting
CREATE TABLE IF NOT EXISTS daily_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  ai_interactions INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  map_views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Payment and donation tracking
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  type TEXT NOT NULL, -- 'subscription', 'donation', 'one_time'
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  description TEXT,
  metadata TEXT, -- JSON with additional info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Donation tracking with special handling
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  payment_id INTEGER,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  donor_name TEXT, -- for anonymous donations
  donor_email TEXT, -- for receipts
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  dedication TEXT, -- "In memory of..." or similar
  tax_receipt_sent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- API keys for external integrations (law enforcement, etc.)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL, -- JSON array of permissions
  last_used_at DATETIME,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Security audit log
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'suspicious_activity', etc.
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  details TEXT, -- JSON with event details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default subscription tiers
INSERT OR IGNORE INTO subscription_tiers (id, name, price_monthly, price_yearly, features, ai_interactions_daily, map_access_level) VALUES
  ('free', 'Free Account', 0, 0, '["Full map access", "3 AI interactions per day", "Basic case search"]', 3, 'full'),
  ('guardian', 'Guardian Angel', 500, 5000, '["Unlimited AI interactions", "Advanced pattern analysis", "Priority support", "Badge system"]', 0, 'premium'),
  ('hope', 'Hope Bringer', 2500, 25000, '["All Guardian features", "Predictive analytics", "API access", "Law enforcement tools"]', 0, 'premium'),
  ('lifesaver', 'Life Saver', 10000, 100000, '["All Hope features", "Custom integrations", "Direct communication", "Advanced analytics"]', 0, 'premium'),
  ('hero', 'Missing Hero Champion', 50000, 500000, '["All Life Saver features", "Priority feature requests", "Beta access", "Personal consultation"]', 0, 'premium');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_userId ON accounts(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_sessionToken ON sessions(sessionToken);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id_date ON usage_tracking(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
  AFTER UPDATE ON users 
  BEGIN 
    UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id; 
  END;

CREATE TRIGGER IF NOT EXISTS update_user_profiles_timestamp 
  AFTER UPDATE ON user_profiles 
  BEGIN 
    UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
  END;

CREATE TRIGGER IF NOT EXISTS update_user_subscriptions_timestamp 
  AFTER UPDATE ON user_subscriptions 
  BEGIN 
    UPDATE user_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
  END;

CREATE TRIGGER IF NOT EXISTS update_daily_usage_timestamp 
  AFTER UPDATE ON daily_usage 
  BEGIN 
    UPDATE daily_usage SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
  END;