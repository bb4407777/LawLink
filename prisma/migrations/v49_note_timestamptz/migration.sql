-- v49: Note 表 DateTime 字段改为 timestamptz
-- 现有数据存的是北京时间，会话时区设为 Asia/Shanghai 确保正确转换

SET timezone = 'Asia/Shanghai';

ALTER TABLE "Note"
  ALTER COLUMN "occurredAt" SET DATA TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);
