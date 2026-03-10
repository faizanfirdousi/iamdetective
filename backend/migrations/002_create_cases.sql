CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'courtlistener', 'fbi', 'uk_archives'
    jurisdiction VARCHAR(100),
    case_type VARCHAR(50),
    parties TEXT[],
    charges TEXT[],
    status VARCHAR(50), -- 'open', 'closed'
    filed_date DATE,
    summary TEXT,
    full_text TEXT,
    source_url TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction ON cases(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_cases_source ON cases(source);
CREATE INDEX IF NOT EXISTS idx_cases_filed_date ON cases(filed_date);
