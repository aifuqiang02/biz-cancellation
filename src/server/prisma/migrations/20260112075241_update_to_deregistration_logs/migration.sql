/*
  Warnings:

  - You are about to drop the `deregistration_tasks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "deregistration_tasks" DROP CONSTRAINT "deregistration_tasks_deregistrationBusinessId_fkey";

-- DropTable
DROP TABLE "deregistration_tasks";

-- CreateTable
CREATE TABLE "deregistration_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "remark" TEXT,
    "operator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deregistrationBusinessId" TEXT NOT NULL,

    CONSTRAINT "deregistration_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "deregistration_logs" ADD CONSTRAINT "deregistration_logs_deregistrationBusinessId_fkey" FOREIGN KEY ("deregistrationBusinessId") REFERENCES "deregistration_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
