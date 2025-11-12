CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faqs_category_idx ON faqs (category);
CREATE INDEX IF NOT EXISTS faqs_sort_order_idx ON faqs (sort_order);
