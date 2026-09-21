-- =========================================================
-- FLATLIVE CLUTCH CORE V1 FINAL
-- LIVE 본체와 분리된 CLUTCH 전용 DB
-- USER 기준키: users(id) TEXT
-- 1 FLAT = 1 POINT
-- =========================================================

BEGIN;

CREATE TABLE clutch_sessions (
    clutch_id TEXT PRIMARY KEY,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'INVITING',
                'READY',
                'LIVE',
                'FINISHED',
                'CANCELLED'
            )
        ),

    created_by_user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    ended_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_clutch_sessions_status
ON clutch_sessions(status);


CREATE TABLE clutch_participants (
    clutch_id TEXT NOT NULL
        REFERENCES clutch_sessions(clutch_id)
        ON DELETE CASCADE,

    user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    room_id TEXT NOT NULL,

    nickname TEXT NOT NULL,

    avatar_url TEXT NULL,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'INVITED',
                'ACCEPTED',
                'REJECTED',
                'LEFT'
            )
        ),

    joined_at TIMESTAMPTZ NULL,

    left_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    PRIMARY KEY (
        clutch_id,
        user_id
    )
);

CREATE INDEX idx_clutch_participants_room
ON clutch_participants(room_id);

CREATE INDEX idx_clutch_participants_user
ON clutch_participants(user_id);

CREATE INDEX idx_clutch_participants_active
ON clutch_participants(
    clutch_id,
    status
);


CREATE TABLE clutch_rounds (
    round_id TEXT PRIMARY KEY,

    clutch_id TEXT NOT NULL
        REFERENCES clutch_sessions(clutch_id)
        ON DELETE CASCADE,

    round_number INTEGER NOT NULL
        CHECK (round_number >= 1),

    status TEXT NOT NULL
        CHECK (
            status IN (
                'READY',
                'LIVE',
                'FINISHED'
            )
        ),

    duration_seconds INTEGER NOT NULL
        DEFAULT 180
        CHECK (duration_seconds >= 30),

    started_by_user_id TEXT NULL
        REFERENCES users(id)
        ON DELETE SET NULL,

    started_at TIMESTAMPTZ NULL,

    ends_at TIMESTAMPTZ NULL,

    finished_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    UNIQUE (
        clutch_id,
        round_number
    )
);

CREATE INDEX idx_clutch_rounds_clutch
ON clutch_rounds(
    clutch_id,
    round_number
);


CREATE TABLE clutch_score_events (
    score_event_id TEXT PRIMARY KEY,

    clutch_id TEXT NOT NULL
        REFERENCES clutch_sessions(clutch_id)
        ON DELETE CASCADE,

    round_id TEXT NOT NULL
        REFERENCES clutch_rounds(round_id)
        ON DELETE CASCADE,

    receiver_user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    sender_user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    room_id TEXT NOT NULL,

    donation_id TEXT NOT NULL,

    flat_amount BIGINT NOT NULL
        CHECK (flat_amount > 0),

    score BIGINT NOT NULL
        CHECK (score > 0),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CONSTRAINT uq_clutch_score_donation
        UNIQUE (donation_id),

    CONSTRAINT ck_clutch_score_flat_equal
        CHECK (score = flat_amount)
);

CREATE INDEX idx_clutch_score_round
ON clutch_score_events(
    round_id,
    receiver_user_id
);

CREATE INDEX idx_clutch_score_clutch
ON clutch_score_events(
    clutch_id,
    receiver_user_id
);


CREATE VIEW clutch_round_score_totals AS
SELECT
    round_id,
    clutch_id,
    receiver_user_id,
    SUM(score) AS score
FROM clutch_score_events
GROUP BY
    round_id,
    clutch_id,
    receiver_user_id;

COMMIT;
