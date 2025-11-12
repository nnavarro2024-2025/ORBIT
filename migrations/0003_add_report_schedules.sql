CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR NOT NULL,
    frequency VARCHAR NOT NULL,
    day_of_week INTEGER,
    time_of_day VARCHAR,
    format VARCHAR DEFAULT 'pdf' NOT NULL,
    description TEXT,
    email_recipients TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    next_run_at TIMESTAMP,
    last_run_at TIMESTAMP,
    created_by VARCHAR,
    updated_by VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_schedules_report_type_idx ON report_schedules (report_type);
CREATE INDEX IF NOT EXISTS report_schedules_next_run_idx ON report_schedules (next_run_at);
