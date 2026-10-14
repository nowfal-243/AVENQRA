-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT,
    "totalComplaints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "badgeNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "departmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currentStatus" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_images" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT NOT NULL DEFAULT 'INITIAL',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "addressFormatted" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "predictedCategory" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "severityScore" DOUBLE PRECISION NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_status" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL,
    "remarks" TEXT,
    "updatedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "citizens_userId_key" ON "citizens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "officers_userId_key" ON "officers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "officers_badgeNumber_key" ON "officers"("badgeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_ticketNumber_key" ON "complaints"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "locations_complaintId_key" ON "locations"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_complaintId_key" ON "ai_analysis"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_complaintId_key" ON "feedback"("complaintId");

-- AddForeignKey
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_images" ADD CONSTRAINT "complaint_images_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status" ADD CONSTRAINT "complaint_status_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status" ADD CONSTRAINT "complaint_status_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

