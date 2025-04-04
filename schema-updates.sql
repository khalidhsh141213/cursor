-- تحديثات قاعدة البيانات لنظام المحفظة

-- جدول المحافظ
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('main', 'trading', 'bonus')),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, type, currency)
);

-- فهرس لتحسين البحث في المحافظ
CREATE INDEX IF NOT EXISTS wallet_user_id_idx ON wallets(user_id);
CREATE INDEX IF NOT EXISTS wallet_type_idx ON wallets(type);
CREATE INDEX IF NOT EXISTS wallet_currency_idx ON wallets(currency);

-- جدول معاملات المحفظة
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  before_balance DECIMAL(20, 8) NOT NULL,
  after_balance DECIMAL(20, 8) NOT NULL,
  description TEXT,
  related_trade_id INTEGER,
  related_transfer_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- فهرس لتحسين البحث في المعاملات
CREATE INDEX IF NOT EXISTS wallet_transaction_wallet_id_idx ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transaction_type_idx ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS wallet_transaction_created_at_idx ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS wallet_transaction_related_trade_id_idx ON wallet_transactions(related_trade_id);

-- جدول تحويلات المحفظة
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id SERIAL PRIMARY KEY,
  from_wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  to_wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  from_transaction_id INTEGER,
  to_transaction_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- فهرس لتحسين البحث في التحويلات
CREATE INDEX IF NOT EXISTS wallet_transfer_from_wallet_id_idx ON wallet_transfers(from_wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transfer_to_wallet_id_idx ON wallet_transfers(to_wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transfer_created_at_idx ON wallet_transfers(created_at);

-- جدول المكافآت
CREATE TABLE IF NOT EXISTS bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL,
  description TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- فهرس لتحسين البحث في المكافآت
CREATE INDEX IF NOT EXISTS bonus_user_id_idx ON bonuses(user_id);
CREATE INDEX IF NOT EXISTS bonus_status_idx ON bonuses(status);
CREATE INDEX IF NOT EXISTS bonus_expiry_date_idx ON bonuses(expiry_date);

-- تحديث جدول الصفقات لإضافة المراجع للمحفظة
ALTER TABLE trades ADD COLUMN IF NOT EXISTS wallet_id INTEGER REFERENCES wallets(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS open_transaction_id INTEGER REFERENCES wallet_transactions(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_transaction_id INTEGER REFERENCES wallet_transactions(id);

-- إنشاء الوظائف والمحفزات

-- وظيفة لإنشاء محافظ افتراضية للمستخدم الجديد
CREATE OR REPLACE FUNCTION create_default_wallets()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء المحفظة الرئيسية (USD)
  INSERT INTO wallets (user_id, type, currency)
  VALUES (NEW.id, 'main', 'USD');
  
  -- إنشاء محفظة التداول (USD)
  INSERT INTO wallets (user_id, type, currency)
  VALUES (NEW.id, 'trading', 'USD');
  
  -- إنشاء محفظة المكافآت (USD)
  INSERT INTO wallets (user_id, type, currency)
  VALUES (NEW.id, 'bonus', 'USD');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لإنشاء المحافظ تلقائياً للمستخدمين الجدد
DROP TRIGGER IF EXISTS create_wallets_for_new_user ON users;
CREATE TRIGGER create_wallets_for_new_user
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_wallets();

-- وظيفة لتحديث الأرصدة المحجوزة عند فتح صفقة
CREATE OR REPLACE FUNCTION lock_funds_for_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id INTEGER;
  v_total DECIMAL(20, 8);
  v_before_balance DECIMAL(20, 8);
  v_after_balance DECIMAL(20, 8);
  v_transaction_id INTEGER;
BEGIN
  -- البحث عن محفظة التداول للمستخدم
  SELECT id, available_balance INTO v_wallet_id, v_before_balance
  FROM wallets
  WHERE user_id = NEW.user_id AND type = 'trading' AND currency = 'USD'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trading wallet not found for user %', NEW.user_id;
  END IF;
  
  -- حساب المبلغ الإجمالي للصفقة (السعر × الكمية + العمولة)
  v_total := (NEW.price::DECIMAL * NEW.shares::DECIMAL) + COALESCE(NEW.commission::DECIMAL, 0);
  
  -- التحقق من كفاية الرصيد
  IF v_before_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient funds: available=%, required=%', v_before_balance, v_total;
  END IF;
  
  -- تحديث أرصدة المحفظة
  v_after_balance := v_before_balance - v_total;
  
  UPDATE wallets
  SET available_balance = available_balance - v_total,
      locked_balance = locked_balance + v_total,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_wallet_id;
  
  -- إنشاء سجل معاملة
  INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    before_balance,
    after_balance,
    description,
    related_trade_id
  )
  VALUES (
    v_wallet_id,
    'trade_lock',
    v_total,
    v_before_balance,
    v_after_balance,
    'Funds locked for trade: ' || NEW.symbol || ' @ ' || NEW.price,
    NEW.id
  )
  RETURNING id INTO v_transaction_id;
  
  -- تحديث حقول الصفقة
  NEW.wallet_id := v_wallet_id;
  NEW.open_transaction_id := v_transaction_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتأمين الأموال عند فتح صفقة
DROP TRIGGER IF EXISTS lock_funds_on_trade_insert ON trades;
CREATE TRIGGER lock_funds_on_trade_insert
BEFORE INSERT ON trades
FOR EACH ROW
WHEN (NEW.status = 'open')
EXECUTE FUNCTION lock_funds_for_trade();

-- وظيفة لتحرير الأموال وحساب الربح/الخسارة عند إغلاق صفقة
CREATE OR REPLACE FUNCTION process_trade_close()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id INTEGER;
  v_open_amount DECIMAL(20, 8);
  v_close_amount DECIMAL(20, 8);
  v_profit_loss DECIMAL(20, 8);
  v_before_balance DECIMAL(20, 8);
  v_after_balance DECIMAL(20, 8);
  v_transaction_id INTEGER;
  v_transaction_type VARCHAR(50);
BEGIN
  -- تنفيذ فقط إذا تم تحديث حالة الصفقة من "مفتوحة" إلى "مغلقة"
  IF (OLD.status = 'open' AND NEW.status = 'closed' AND NEW.close_price IS NOT NULL) THEN
    -- الحصول على معرف المحفظة
    SELECT wallet_id INTO v_wallet_id FROM trades WHERE id = NEW.id;
    
    IF v_wallet_id IS NULL THEN
      RAISE EXCEPTION 'No wallet associated with trade %', NEW.id;
    END IF;
    
    -- حساب المبلغ المؤمن عند فتح الصفقة
    v_open_amount := (OLD.price::DECIMAL * OLD.shares::DECIMAL) + COALESCE(OLD.commission::DECIMAL, 0);
    
    -- حساب قيمة الإغلاق
    v_close_amount := (NEW.close_price::DECIMAL * NEW.shares::DECIMAL);
    
    -- حساب الربح أو الخسارة (يعتمد على نوع الصفقة)
    IF OLD.type = 'buy' THEN
      v_profit_loss := v_close_amount - v_open_amount;
    ELSE -- for 'sell' trades
      v_profit_loss := v_open_amount - v_close_amount;
    END IF;
    
    -- الحصول على الرصيد الحالي
    SELECT available_balance INTO v_before_balance
    FROM wallets
    WHERE id = v_wallet_id
    FOR UPDATE;
    
    -- تحديث أرصدة المحفظة
    v_after_balance := v_before_balance + v_open_amount + v_profit_loss;
    
    UPDATE wallets
    SET available_balance = available_balance + v_open_amount + v_profit_loss,
        locked_balance = locked_balance - v_open_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet_id;
    
    -- تحديد نوع المعاملة
    IF v_profit_loss >= 0 THEN
      v_transaction_type := 'trade_profit';
    ELSE
      v_transaction_type := 'trade_loss';
    END IF;
    
    -- إنشاء سجل معاملة
    INSERT INTO wallet_transactions (
      wallet_id,
      transaction_type,
      amount,
      before_balance,
      after_balance,
      description,
      related_trade_id
    )
    VALUES (
      v_wallet_id,
      v_transaction_type,
      ABS(v_profit_loss),
      v_before_balance,
      v_after_balance,
      'Trade closed: ' || NEW.symbol || ' @ ' || NEW.close_price || ' (' ||
      CASE WHEN v_profit_loss >= 0 THEN 'profit' ELSE 'loss' END || ': ' || ABS(v_profit_loss) || ')',
      NEW.id
    )
    RETURNING id INTO v_transaction_id;
    
    -- تحديث معرف معاملة الإغلاق في الصفقة
    UPDATE trades
    SET close_transaction_id = v_transaction_id
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لمعالجة إغلاق الصفقة
DROP TRIGGER IF EXISTS process_trade_close_trigger ON trades;
CREATE TRIGGER process_trade_close_trigger
AFTER UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION process_trade_close();

-- وظيفة لإلغاء صفقة وإعادة الأموال المؤمنة
CREATE OR REPLACE FUNCTION cancel_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id INTEGER;
  v_amount DECIMAL(20, 8);
  v_before_balance DECIMAL(20, 8);
  v_after_balance DECIMAL(20, 8);
  v_transaction_id INTEGER;
BEGIN
  -- تنفيذ فقط إذا تم تحديث حالة الصفقة من "مفتوحة" إلى "ملغاة"
  IF (OLD.status = 'open' AND NEW.status = 'cancelled') THEN
    -- الحصول على معرف المحفظة
    SELECT wallet_id INTO v_wallet_id FROM trades WHERE id = NEW.id;
    
    IF v_wallet_id IS NULL THEN
      RAISE EXCEPTION 'No wallet associated with trade %', NEW.id;
    END IF;
    
    -- حساب المبلغ المؤمن عند فتح الصفقة
    v_amount := (OLD.price::DECIMAL * OLD.shares::DECIMAL) + COALESCE(OLD.commission::DECIMAL, 0);
    
    -- الحصول على الرصيد الحالي
    SELECT available_balance INTO v_before_balance
    FROM wallets
    WHERE id = v_wallet_id
    FOR UPDATE;
    
    -- تحديث أرصدة المحفظة
    v_after_balance := v_before_balance + v_amount;
    
    UPDATE wallets
    SET available_balance = available_balance + v_amount,
        locked_balance = locked_balance - v_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet_id;
    
    -- إنشاء سجل معاملة
    INSERT INTO wallet_transactions (
      wallet_id,
      transaction_type,
      amount,
      before_balance,
      after_balance,
      description,
      related_trade_id
    )
    VALUES (
      v_wallet_id,
      'trade_cancel',
      v_amount,
      v_before_balance,
      v_after_balance,
      'Trade cancelled: ' || NEW.symbol || ' @ ' || OLD.price,
      NEW.id
    )
    RETURNING id INTO v_transaction_id;
    
    -- تحديث معرف معاملة الإلغاء في الصفقة
    UPDATE trades
    SET close_transaction_id = v_transaction_id
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لمعالجة إلغاء الصفقة
DROP TRIGGER IF EXISTS cancel_trade_trigger ON trades;
CREATE TRIGGER cancel_trade_trigger
AFTER UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION cancel_trade();

-- ترحيل البيانات الموجودة

-- إنشاء محافظ لجميع المستخدمين الموجودين
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM wallets) LOOP
    -- إنشاء المحفظة الرئيسية (USD)
    INSERT INTO wallets (user_id, type, currency, balance, available_balance)
    VALUES (user_rec.id, 'main', 'USD', 10000, 10000);
    
    -- إنشاء محفظة التداول (USD)
    INSERT INTO wallets (user_id, type, currency)
    VALUES (user_rec.id, 'trading', 'USD');
    
    -- إنشاء محفظة المكافآت (USD)
    INSERT INTO wallets (user_id, type, currency)
    VALUES (user_rec.id, 'bonus', 'USD');
  END LOOP;
END $$;

-- تحديث الصفقات المفتوحة الموجودة لربطها بمحافظ المستخدمين
DO $$
DECLARE
  trade_rec RECORD;
  v_wallet_id INTEGER;
  v_total DECIMAL(20, 8);
  v_before_balance DECIMAL(20, 8);
  v_after_balance DECIMAL(20, 8);
  v_transaction_id INTEGER;
BEGIN
  FOR trade_rec IN SELECT * FROM trades WHERE status = 'open' AND wallet_id IS NULL LOOP
    -- البحث عن محفظة التداول للمستخدم
    SELECT id, available_balance INTO v_wallet_id, v_before_balance
    FROM wallets
    WHERE user_id = trade_rec.user_id AND type = 'trading' AND currency = 'USD'
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Trading wallet not found for user %, creating one', trade_rec.user_id;
      -- إنشاء محفظة التداول إذا لم تكن موجودة
      INSERT INTO wallets (user_id, type, currency, balance, available_balance)
      VALUES (trade_rec.user_id, 'trading', 'USD', 10000, 10000)
      RETURNING id, available_balance INTO v_wallet_id, v_before_balance;
    END IF;
    
    -- حساب المبلغ الإجمالي للصفقة
    v_total := (trade_rec.price::DECIMAL * trade_rec.shares::DECIMAL) + COALESCE(trade_rec.commission::DECIMAL, 0);
    
    -- تحديث أرصدة المحفظة
    v_after_balance := v_before_balance - v_total;
    
    UPDATE wallets
    SET available_balance = available_balance - v_total,
        locked_balance = locked_balance + v_total,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet_id;
    
    -- إنشاء سجل معاملة
    INSERT INTO wallet_transactions (
      wallet_id,
      transaction_type,
      amount,
      before_balance,
      after_balance,
      description,
      related_trade_id
    )
    VALUES (
      v_wallet_id,
      'trade_lock',
      v_total,
      v_before_balance,
      v_after_balance,
      'Funds locked for trade: ' || trade_rec.symbol || ' @ ' || trade_rec.price || ' (migrated)',
      trade_rec.id
    )
    RETURNING id INTO v_transaction_id;
    
    -- تحديث حقول الصفقة
    UPDATE trades
    SET wallet_id = v_wallet_id,
        open_transaction_id = v_transaction_id
    WHERE id = trade_rec.id;
  END LOOP;
END $$;