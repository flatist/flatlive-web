-- ============================================================
-- FLATLIVE CLUTCH TEAM MODE V1
--
-- 목적
-- 1) 라운드마다 SOLO / TEAM 모드 저장
-- 2) 팀 배치를 라운드 단위로 저장
-- 3) 기존 개인 후원 점수 구조는 그대로 사용
--
-- 원칙
-- - 기존 라운드 = SOLO
-- - TEAM은 4명 2:2만 애플리케이션에서 허용
-- - team_no:
--      SOLO = NULL
--      TEAM = 1 또는 2
-- - seat_no = 화면 안정 배치를 위한 1~4
-- ============================================================


-- ------------------------------------------------------------
-- 1. clutch_rounds에 경기 모드 추가
-- ------------------------------------------------------------

ALTER TABLE clutch_rounds
ADD COLUMN IF NOT EXISTS match_mode TEXT;

UPDATE clutch_rounds
SET match_mode = 'SOLO'
WHERE match_mode IS NULL;

ALTER TABLE clutch_rounds
ALTER COLUMN match_mode
SET DEFAULT 'SOLO';

ALTER TABLE clutch_rounds
ALTER COLUMN match_mode
SET NOT NULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'chk_clutch_round_match_mode'
      AND conrelid =
        'clutch_rounds'::regclass
  ) THEN

    ALTER TABLE clutch_rounds
    ADD CONSTRAINT
      chk_clutch_round_match_mode
    CHECK (
      match_mode IN (
        'SOLO',
        'TEAM'
      )
    );

  END IF;
END
$$;


-- ------------------------------------------------------------
-- 2. 라운드별 참가자/팀 스냅샷
--
-- clutch_participants에 team_no를 넣지 않는다.
-- 같은 연결 세션에서 다음 라운드 팀을 바꿀 수 있기 때문.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS
clutch_round_participants (
  round_id TEXT NOT NULL,

  user_id TEXT NOT NULL,

  team_no SMALLINT NULL,

  seat_no SMALLINT NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT
    pk_clutch_round_participants
    PRIMARY KEY (
      round_id,
      user_id
    ),

  CONSTRAINT
    fk_clutch_round_participants_round
    FOREIGN KEY (
      round_id
    )
    REFERENCES clutch_rounds (
      round_id
    )
    ON DELETE CASCADE,

  CONSTRAINT
    fk_clutch_round_participants_user
    FOREIGN KEY (
      user_id
    )
    REFERENCES users (
      id
    )
    ON DELETE RESTRICT,

  CONSTRAINT
    chk_clutch_round_participants_team
    CHECK (
      team_no IS NULL
      OR team_no IN (
        1,
        2
      )
    ),

  CONSTRAINT
    chk_clutch_round_participants_seat
    CHECK (
      seat_no BETWEEN 1 AND 4
    )
);


-- ------------------------------------------------------------
-- 3. 한 라운드에서 같은 자리 중복 금지
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
uq_clutch_round_participant_seat
ON clutch_round_participants (
  round_id,
  seat_no
);


-- ------------------------------------------------------------
-- 4. 조회용 인덱스
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
idx_clutch_round_participant_user
ON clutch_round_participants (
  user_id
);


CREATE INDEX IF NOT EXISTS
idx_clutch_round_participant_team
ON clutch_round_participants (
  round_id,
  team_no
);


-- ============================================================
-- TEAM 모드의 정확히 4명 / 2:2 검증은
-- startRound 트랜잭션에서 검증한다.
--
-- DB에는 라운드별 결과를 안정적으로 보존하는 역할만 맡긴다.
-- ============================================================
