PRAGMA foreign_keys=OFF;

CREATE TABLE "new_chinese_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "child_id" TEXT NOT NULL,
  "config_name" TEXT NOT NULL DEFAULT '词表',
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "daily_count" INTEGER NOT NULL DEFAULT 10,
  "items_json" TEXT NOT NULL DEFAULT '[]',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "new_chinese_configs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_chinese_configs" (
  "id",
  "child_id",
  "config_name",
  "is_enabled",
  "is_active",
  "daily_count",
  "items_json",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  "child_id",
  '词表1',
  "is_enabled",
  true,
  "daily_count",
  "items_json",
  "created_at",
  "updated_at"
FROM "chinese_configs";

DROP TABLE "chinese_configs";
ALTER TABLE "new_chinese_configs" RENAME TO "chinese_configs";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
