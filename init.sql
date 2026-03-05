-- 1. KULLANICILAR TABLOSU (Müşteriler ve Sisteme Girenler)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'customer', -- customer, admin
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. HİZMETLER TABLOSU (Katalog: Saç Kesimi, Terapi vs.)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    base_price NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SAĞLAYICILAR / ÇALIŞANLAR TABLOSU (Berber, Doktor, Avukat)
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Eğer çalışan da sisteme login olacaksa
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100), -- Örn: Uzman Psikolog, Kıdemli Berber
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ÇALIŞAN - HİZMET İLİŞKİSİ (Hangi çalışan hangi hizmeti veriyor?)
CREATE TABLE IF NOT EXISTS provider_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_price NUMERIC(10,2), -- Usta berber daha pahalıya kesebilir
    UNIQUE(provider_id, service_id)
);

-- 5. ÇALIŞMA SAATLERİ (Çalışan Hangi Günler Müsait?)
CREATE TABLE IF NOT EXISTS availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0: Pazar, 1: Pazartesi ... 6: Cumartesi
    start_time TIME NOT NULL,     -- Örn: 09:00:00
    end_time TIME NOT NULL,       -- Örn: 18:00:00
    is_active BOOLEAN DEFAULT true
);

-- 6. RANDEVULAR TABLOSU (Artık provider_id var!)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL, -- Randevu bitişini tutmak çakışmaları bulmayı çok hızlandırır
    status VARCHAR(50) DEFAULT 'booked', -- booked, cancelled, completed
    total_price NUMERIC(10,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0: Pazar, 1: Pazartesi ... 6: Cumartesi
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(provider_id, day_of_week)
);