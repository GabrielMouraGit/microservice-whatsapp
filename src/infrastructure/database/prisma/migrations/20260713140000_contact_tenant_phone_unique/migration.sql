-- DropIndex
DROP INDEX "Contact_phone_key";

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenant_id_phone_key" ON "Contact"("tenant_id", "phone");
