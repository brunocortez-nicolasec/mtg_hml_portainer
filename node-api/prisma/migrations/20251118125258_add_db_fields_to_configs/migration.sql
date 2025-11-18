-- AlterTable
ALTER TABLE "public"."HRConfig" ADD COLUMN     "db_host" TEXT,
ADD COLUMN     "db_name" TEXT,
ADD COLUMN     "db_password" TEXT,
ADD COLUMN     "db_port" TEXT,
ADD COLUMN     "db_type" TEXT,
ADD COLUMN     "db_user" TEXT;

-- AlterTable
ALTER TABLE "public"."SystemConfig" ADD COLUMN     "db_host" TEXT,
ADD COLUMN     "db_name" TEXT,
ADD COLUMN     "db_password" TEXT,
ADD COLUMN     "db_port" TEXT,
ADD COLUMN     "db_type" TEXT,
ADD COLUMN     "db_user" TEXT;
