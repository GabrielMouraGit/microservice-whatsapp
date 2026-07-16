-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "edited_at" TIMESTAMP(3);
