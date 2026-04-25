/*
  Warnings:

  - You are about to drop the column `contact_id` on the `Message` table. All the data in the column will be lost.
  - Added the required column `chat_id` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "contact_id",
ADD COLUMN     "chat_id" TEXT NOT NULL,
ADD COLUMN     "session_id" TEXT NOT NULL;
