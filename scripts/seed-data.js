const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const bcrypt = require('../backend/node_modules/bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding complete AVENQRA database records...');

  // 1. Seed Departments
  const departmentsData = [
    { name: 'Roads & Infrastructure', code: 'ROAD', slaHours: 48 },
    { name: 'Waste Management', code: 'WASTE', slaHours: 24 },
    { name: 'Water Supply & Sewage', code: 'WATER', slaHours: 36 },
    { name: 'Electrical & Streetlights', code: 'ELEC', slaHours: 24 },
    { name: 'Drainage & Flood Control', code: 'DRAIN', slaHours: 48 },
  ];

  const departments = [];
  for (const dept of departmentsData) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
    departments.push(d);
  }

  // 2. Seed Super Admin
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@avenqra.gov' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@avenqra.gov',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  // 3. Seed Field Officers
  const officerPassword = await bcrypt.hash('Officer@123', 10);
  const officerUser = await prisma.user.upsert({
    where: { email: 'officer.roads@avenqra.gov' },
    update: {},
    create: {
      name: 'Officer Ramesh Kumar',
      email: 'officer.roads@avenqra.gov',
      password: officerPassword,
      role: 'OFFICER',
      phone: '+91 9876543210',
      isVerified: true,
    },
  });

  const officer = await prisma.officer.upsert({
    where: { userId: officerUser.id },
    update: {},
    create: {
      userId: officerUser.id,
      departmentId: departments[0].id,
      badgeNumber: 'OFF-ROAD-402',
      status: 'ACTIVE',
    },
  });

  // 4. Seed Citizen
  const citizenPassword = await bcrypt.hash('Citizen@123', 10);
  const citizenUser = await prisma.user.upsert({
    where: { email: 'citizen.alex@example.com' },
    update: {},
    create: {
      name: 'Alex Johnson',
      email: 'citizen.alex@example.com',
      password: citizenPassword,
      role: 'CITIZEN',
      phone: '+1 555 0192834',
      isVerified: true,
    },
  });

  const citizen = await prisma.citizen.upsert({
    where: { userId: citizenUser.id },
    update: {},
    create: {
      userId: citizenUser.id,
      address: '5th Avenue, Indiranagar',
    },
  });

  // 5. Seed Sample Complaint
  const sampleTicket = 'AVN-2026-891023';
  const existingComplaint = await prisma.complaint.findUnique({ where: { ticketNumber: sampleTicket } });

  if (!existingComplaint) {
    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber: sampleTicket,
        citizenId: citizen.id,
        departmentId: departments[0].id,
        title: 'Large Pothole on 5th Avenue',
        description: 'Dangerous deep pothole near traffic light causing vehicle damage.',
        category: 'Pothole',
        currentStatus: 'SUBMITTED',
        priority: 'HIGH',
      },
    });

    await prisma.location.create({
      data: {
        complaintId: complaint.id,
        latitude: 12.9716,
        longitude: 77.5946,
        addressFormatted: '5th Avenue, Indiranagar, Bengaluru',
      },
    });

    await prisma.aIAnalysis.create({
      data: {
        complaintId: complaint.id,
        predictedCategory: 'Pothole',
        confidenceScore: 0.94,
        severityScore: 8.4,
        isDuplicate: false,
      },
    });

    await prisma.complaintStatusLog.create({
      data: {
        complaintId: complaint.id,
        status: 'SUBMITTED',
        remarks: 'Report registered via mobile app',
        updatedById: citizenUser.id,
      },
    });
  }

  console.log('✅ AVENQRA Seeding Completed Successfully!');
  console.log('   - Departments:', departments.length);
  console.log('   - Admin:', admin.email);
  console.log('   - Officer:', officerUser.email);
  console.log('   - Citizen:', citizenUser.email);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
