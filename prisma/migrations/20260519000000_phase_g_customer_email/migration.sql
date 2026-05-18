ALTER TABLE "BookingGroup" ADD COLUMN "customerEmail" TEXT;

UPDATE "BookingGroup"
SET "customerEmail" = (
  SELECT "User"."email"
  FROM "User"
  INNER JOIN "Customer" ON "Customer"."userId" = "User"."id"
  WHERE "Customer"."id" = "BookingGroup"."customerId"
)
WHERE "customerEmail" IS NULL;

ALTER TABLE "BookingGroup" DROP COLUMN "contactEmail";
