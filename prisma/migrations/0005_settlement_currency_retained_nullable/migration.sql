ALTER TABLE "public"."Settlement" ALTER COLUMN "currency" DROP NOT NULL;
ALTER TABLE "public"."Settlement" ALTER COLUMN "currency" DROP DEFAULT;
