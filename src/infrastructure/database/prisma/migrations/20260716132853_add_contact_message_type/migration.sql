-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'contact';

-- CreateTable
CREATE TABLE "MessageContact" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "vcard" TEXT NOT NULL,
    "phone" TEXT,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "MessageContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageContact_message_id_key" ON "MessageContact"("message_id");

-- AddForeignKey
ALTER TABLE "MessageContact" ADD CONSTRAINT "MessageContact_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageContact" ADD CONSTRAINT "MessageContact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
