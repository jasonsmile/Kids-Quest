-- Add Chinese pinyin practice configuration and subject-aware sessions.
CREATE TABLE "chinese_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "child_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_count" INTEGER NOT NULL DEFAULT 10,
    "items_json" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "chinese_configs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "chinese_configs_child_id_key" ON "chinese_configs"("child_id");

ALTER TABLE "practice_sessions" ADD COLUMN "subject" TEXT NOT NULL DEFAULT 'math';

PRAGMA foreign_keys=off;
CREATE TABLE "new_practice_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "child_id" TEXT NOT NULL,
    "paper_config_id" TEXT,
    "subject" TEXT NOT NULL DEFAULT 'math',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config_version" INTEGER NOT NULL,
    "target_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy" REAL,
    "total_time" INTEGER,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "practice_sessions_paper_config_id_fkey" FOREIGN KEY ("paper_config_id") REFERENCES "paper_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "practice_sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_practice_sessions" (
    "id", "child_id", "paper_config_id", "subject", "date", "config_version", "target_count", "status",
    "completed_count", "correct_count", "accuracy", "total_time", "points_earned", "created_at", "updated_at", "completed_at"
)
SELECT
    "id", "child_id", "paper_config_id", COALESCE("subject", 'math'), "date", "config_version", "target_count", "status",
    "completed_count", "correct_count", "accuracy", "total_time", "points_earned", "created_at", "updated_at", "completed_at"
FROM "practice_sessions";

DROP TABLE "practice_sessions";
ALTER TABLE "new_practice_sessions" RENAME TO "practice_sessions";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=on;
