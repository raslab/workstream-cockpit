-- CreateTable
CREATE TABLE "personal_access_tokens" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_access_tokens_token_hash_key" ON "personal_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "personal_access_tokens_person_id_idx" ON "personal_access_tokens"("person_id");

-- AddForeignKey
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
