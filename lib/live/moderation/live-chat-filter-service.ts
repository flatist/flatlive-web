import crypto from "crypto";

import { pgPool } from "@/lib/db/postgres";

type FilterSettingsRow = {
  broadcaster_user_id: string;
  auto_block_enabled: boolean;
  updated_at: Date;
};

type ForbiddenWordRow = {
  id: string;
  broadcaster_user_id: string;
  word: string;
  normalized_word: string;
  created_at: Date;
};

export type LiveChatForbiddenWord = {
  id: string;
  word: string;
  createdAt: string;
};

let schemaReady = false;
let schemaPending: Promise<void> | null = null;

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  if (schemaPending) {
    return schemaPending;
  }

  schemaPending = (async () => {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_filter_settings (
        broadcaster_user_id TEXT PRIMARY KEY,
        auto_block_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_forbidden_words (
        id TEXT PRIMARY KEY,
        broadcaster_user_id TEXT NOT NULL,
        word VARCHAR(80) NOT NULL,
        normalized_word VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pgPool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        live_chat_forbidden_words_broadcaster_normalized_idx
      ON live_chat_forbidden_words (
        broadcaster_user_id,
        normalized_word
      )
    `);

    schemaReady = true;
  })();

  try {
    await schemaPending;
  } finally {
    schemaPending = null;
  }
}

export function normalizeChatFilterText(
  value: string,
) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}\p{Cf}]+/gu, "")
    .replace(/(.)\1{3,}/gu, "$1$1$1");
}

/*
 * FLATLIVE_AUTO_PROFANITY_FILTER_V1
 *
 * 초기 기본 사전.
 * 정상 단어 오차단을 줄이기 위해
 * 지나치게 짧거나 일반적인 표현은 최소화한다.
 */
const AUTO_BLOCK_WORDS = [
  "시발",
  "씨발",
  "ㅅㅂ",
  "개새끼",
  "개새",
  "병신",
  "ㅂㅅ",
  "존나",
  "ㅈㄴ",
  "좆",
  "미친놈",
  "미친년",
];

const NORMALIZED_AUTO_BLOCK_WORDS =
  AUTO_BLOCK_WORDS.map(
    normalizeChatFilterText,
  ).filter(Boolean);

export async function getLiveChatFilterSettings(
  broadcasterUserId: string,
) {
  await ensureSchema();

  await pgPool.query(
    `
      INSERT INTO live_chat_filter_settings (
        broadcaster_user_id,
        auto_block_enabled
      )
      VALUES ($1, TRUE)
      ON CONFLICT (broadcaster_user_id)
      DO NOTHING
    `,
    [broadcasterUserId],
  );

  const settings =
    await pgPool.query<FilterSettingsRow>(
      `
        SELECT *
        FROM live_chat_filter_settings
        WHERE broadcaster_user_id = $1
        LIMIT 1
      `,
      [broadcasterUserId],
    );

  const words =
    await pgPool.query<ForbiddenWordRow>(
      `
        SELECT *
        FROM live_chat_forbidden_words
        WHERE broadcaster_user_id = $1
        ORDER BY created_at DESC
        LIMIT 500
      `,
      [broadcasterUserId],
    );

  return {
    autoBlockEnabled:
      settings.rows[0]
        ?.auto_block_enabled !== false,

    words: words.rows.map(
      (row): LiveChatForbiddenWord => ({
        id: row.id,
        word: row.word,
        createdAt:
          row.created_at.toISOString(),
      }),
    ),
  };
}

export async function setLiveChatAutoBlock(
  broadcasterUserId: string,
  enabled: boolean,
) {
  await ensureSchema();

  await pgPool.query(
    `
      INSERT INTO live_chat_filter_settings (
        broadcaster_user_id,
        auto_block_enabled,
        updated_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (broadcaster_user_id)
      DO UPDATE SET
        auto_block_enabled =
          EXCLUDED.auto_block_enabled,
        updated_at = NOW()
    `,
    [
      broadcasterUserId,
      enabled,
    ],
  );

  return getLiveChatFilterSettings(
    broadcasterUserId,
  );
}

export async function addLiveChatForbiddenWord(
  broadcasterUserId: string,
  rawWord: string,
) {
  await ensureSchema();

  const word =
    rawWord.trim().slice(0, 40);

  const normalized =
    normalizeChatFilterText(word);

  if (!word || !normalized) {
    throw new Error(
      "LIVE_CHAT_FILTER_WORD_REQUIRED",
    );
  }

  await pgPool.query(
    `
      INSERT INTO live_chat_forbidden_words (
        id,
        broadcaster_user_id,
        word,
        normalized_word
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (
        broadcaster_user_id,
        normalized_word
      )
      DO NOTHING
    `,
    [
      crypto.randomUUID(),
      broadcasterUserId,
      word,
      normalized,
    ],
  );

  return getLiveChatFilterSettings(
    broadcasterUserId,
  );
}

export async function deleteLiveChatForbiddenWord(
  broadcasterUserId: string,
  id: string,
) {
  await ensureSchema();

  await pgPool.query(
    `
      DELETE FROM live_chat_forbidden_words
      WHERE id = $1
        AND broadcaster_user_id = $2
    `,
    [
      id,
      broadcasterUserId,
    ],
  );

  return getLiveChatFilterSettings(
    broadcasterUserId,
  );
}

export async function checkLiveChatMessage(
  broadcasterUserId: string,
  message: string,
) {
  const settings =
    await getLiveChatFilterSettings(
      broadcasterUserId,
    );

  const normalizedMessage =
    normalizeChatFilterText(message);

  if (
    settings.autoBlockEnabled &&
    NORMALIZED_AUTO_BLOCK_WORDS.some(
      (word) =>
        word &&
        normalizedMessage.includes(word),
    )
  ) {
    return {
      blocked: true,
      source: "AUTO" as const,
    };
  }

  for (const item of settings.words) {
    const normalizedWord =
      normalizeChatFilterText(
        item.word,
      );

    if (
      normalizedWord &&
      normalizedMessage.includes(
        normalizedWord,
      )
    ) {
      return {
        blocked: true,
        source: "CUSTOM" as const,
      };
    }
  }

  return {
    blocked: false,
    source: null,
  };
}
