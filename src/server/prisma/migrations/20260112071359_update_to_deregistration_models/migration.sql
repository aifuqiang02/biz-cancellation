-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deregistration_businesses" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "feeAmount" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending_entry',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "deregistration_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deregistration_tasks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deregistrationBusinessId" TEXT NOT NULL,

    CONSTRAINT "deregistration_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "port_allocations" (
    "id" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "deregistrationBusinessId" TEXT NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "port_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "port_allocations_port_key" ON "port_allocations"("port");

-- AddForeignKey
ALTER TABLE "deregistration_businesses" ADD CONSTRAINT "deregistration_businesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deregistration_tasks" ADD CONSTRAINT "deregistration_tasks_deregistrationBusinessId_fkey" FOREIGN KEY ("deregistrationBusinessId") REFERENCES "deregistration_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "port_allocations" ADD CONSTRAINT "port_allocations_deregistrationBusinessId_fkey" FOREIGN KEY ("deregistrationBusinessId") REFERENCES "deregistration_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
