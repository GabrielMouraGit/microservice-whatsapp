-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateTable
CREATE TABLE "MessageEventLog" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "message_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "MessageEventLog_pkey" PRIMARY KEY ("id")
);
