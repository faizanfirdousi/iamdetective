CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_text TEXT NOT NULL,
    note TEXT NOT NULL,
    highlight_color VARCHAR(50),
    page_section VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_case_id ON annotations(case_id);
-- Also index user_id for fast dashboard retrieval of user notes
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
