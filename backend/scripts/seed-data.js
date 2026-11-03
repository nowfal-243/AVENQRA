const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function seed() {
  console.log('[Seed] Seeding database with initial data...');

  // 1. Departments
  const departmentsData = [
    { name: 'Roads & Infrastructure', code: 'ROAD', slaHours: 48 },
    { name: 'Waste Management', code: 'WASTE', slaHours: 24 },
    { name: 'Water Supply & Sewage', code: 'WATER', slaHours: 36 },
    { name: 'Electrical & Streetlights', code: 'ELEC', slaHours: 24 },
    { name: 'Drainage & Flood Control', code: 'DRAIN', slaHours: 48 },
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, slaHours: d.slaHours },
      create: d,
    });
    deptMap[d.code] = dept;
  }
  console.log('[Seed] Departments ready:', Object.keys(deptMap).length);

  // 2. Passwords
  const adminPass = await bcrypt.hash('admin123', 10);
  const officerPass = await bcrypt.hash('officer123', 10);
  const citizenPass = await bcrypt.hash('citizen123', 10);

  // 3. Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@avenqra.com' },
    update: { password: adminPass, role: 'SUPER_ADMIN', isVerified: true },
    create: {
      id: 'admin-demo-uuid-101',
      name: 'Super Admin Officer',
      email: 'admin@avenqra.com',
      password: adminPass,
      phone: '+91 9876543210',
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  // 4. Field Officers
  const officerUser1 = await prisma.user.upsert({
    where: { email: 'officer@avenqra.com' },
    update: { password: officerPass, role: 'OFFICER', isVerified: true },
    create: {
      id: 'officer-demo-uuid-202',
      name: 'Field Officer Rajesh',
      email: 'officer@avenqra.com',
      password: officerPass,
      phone: '+91 9876543211',
      role: 'OFFICER',
      isVerified: true,
    },
  });

  const officerUser2 = await prisma.user.upsert({
    where: { email: 'kavita@avenqra.com' },
    update: { password: officerPass, role: 'OFFICER', isVerified: true },
    create: {
      id: 'officer-demo-uuid-203',
      name: 'Officer Kavita Rao',
      email: 'kavita@avenqra.com',
      password: officerPass,
      phone: '+91 9876543212',
      role: 'OFFICER',
      isVerified: true,
    },
  });

  const officerUser3 = await prisma.user.upsert({
    where: { email: 'arun@avenqra.com' },
    update: { password: officerPass, role: 'OFFICER', isVerified: true },
    create: {
      id: 'officer-demo-uuid-204',
      name: 'Officer Arun Nair',
      email: 'arun@avenqra.com',
      password: officerPass,
      phone: '+91 9876543213',
      role: 'OFFICER',
      isVerified: true,
    },
  });

  // Officer Profiles
  const off1 = await prisma.officer.upsert({
    where: { userId: officerUser1.id },
    update: { departmentId: deptMap.ROAD.id, status: 'ACTIVE' },
    create: {
      id: 'demo-off-1',
      userId: officerUser1.id,
      departmentId: deptMap.ROAD.id,
      badgeNumber: 'OFF-901',
      status: 'ACTIVE',
    },
  });

  const off2 = await prisma.officer.upsert({
    where: { userId: officerUser2.id },
    update: { departmentId: deptMap.WASTE.id, status: 'ACTIVE' },
    create: {
      id: 'demo-off-2',
      userId: officerUser2.id,
      departmentId: deptMap.WASTE.id,
      badgeNumber: 'OFF-902',
      status: 'ACTIVE',
    },
  });

  const off3 = await prisma.officer.upsert({
    where: { userId: officerUser3.id },
    update: { departmentId: deptMap.WATER.id, status: 'ACTIVE' },
    create: {
      id: 'demo-off-3',
      userId: officerUser3.id,
      departmentId: deptMap.WATER.id,
      badgeNumber: 'OFF-903',
      status: 'ACTIVE',
    },
  });

  // 5. Citizen User
  const citizenUser = await prisma.user.upsert({
    where: { email: 'citizen@avenqra.com' },
    update: { password: citizenPass, role: 'CITIZEN', isVerified: true },
    create: {
      id: 'citizen-demo-uuid-303',
      name: 'Deepak Sharma',
      email: 'citizen@avenqra.com',
      password: citizenPass,
      phone: '+91 9876543214',
      role: 'CITIZEN',
      isVerified: true,
    },
  });

  const citizenProfile = await prisma.citizen.upsert({
    where: { userId: citizenUser.id },
    update: { address: '14/2 Beach Road, Calicut' },
    create: {
      id: 'demo-cit-1',
      userId: citizenUser.id,
      address: '14/2 Beach Road, Calicut',
      totalComplaints: 4,
    },
  });

  console.log('[Seed] Users and profiles seeded successfully.');

  // 6. Seed Initial Realistic Complaints
  const initialComplaints = [
    {
      ticketNumber: 'AVN-2026-4561',
      citizenId: citizenProfile.id,
      departmentId: deptMap.ROAD.id,
      title: 'Severe crater pothole at MG Road bus terminus',
      description: 'Dangerous deep pothole on high speed corridor causing motorcycle skids and tire blowouts.',
      category: 'Pothole & Road Damage',
      currentStatus: 'ASSIGNED',
      priority: 'HIGH',
      isEscalated: false,
      latitude: 11.2588,
      longitude: 75.7804,
      addressFormatted: 'MG Road Bus Terminus, Kozhikode',
      assignedOfficerId: off1.id,
    },
    {
      ticketNumber: 'AVN-2026-890003',
      citizenId: citizenProfile.id,
      departmentId: deptMap.ROAD.id,
      title: 'Vandalized guard rail and sharp metal edges at Mananchira',
      description: 'Pedestrian guard rail smashed near playground, sharp exposed iron is hazardous to public.',
      category: 'Pothole & Road Damage',
      currentStatus: 'ESCALATED',
      priority: 'CRITICAL',
      isEscalated: true,
      latitude: 11.2505,
      longitude: 75.7808,
      addressFormatted: 'Mananchira Park Perimeter, Kozhikode',
      assignedOfficerId: off1.id,
    },
    {
      ticketNumber: 'AVN-2026-4510',
      citizenId: citizenProfile.id,
      departmentId: deptMap.WASTE.id,
      title: 'Commercial garbage dumping overflowing on SM Street',
      description: 'Multiple open waste bins blocking market footpath with hazardous organic decomposition.',
      category: 'Waste Management',
      currentStatus: 'IN_PROGRESS',
      priority: 'MEDIUM',
      isEscalated: false,
      latitude: 11.257,
      longitude: 75.779,
      addressFormatted: 'SM Street Commercial Plaza, Kozhikode',
      assignedOfficerId: off2.id,
    },
    {
      ticketNumber: 'AVN-2026-890002',
      citizenId: citizenProfile.id,
      departmentId: deptMap.ELEC.id,
      title: 'Dangling high voltage electrical cable over walkway',
      description: 'Overhead service line disconnected and hanging 1.5m above sidewalk near school gate.',
      category: 'Electrical & Streetlights',
      currentStatus: 'RESOLVED',
      priority: 'CRITICAL',
      isEscalated: false,
      latitude: 11.2612,
      longitude: 75.7845,
      addressFormatted: 'Court Road Junction, Kozhikode',
      assignedOfficerId: null,
    },
    {
      ticketNumber: 'AVN-2026-4520',
      citizenId: citizenProfile.id,
      departmentId: deptMap.DRAIN.id,
      title: 'Stormwater culvert collapse causing localized flash floods',
      description: 'Culvert collapsed under cul-de-sac, stormwater overflowing into front yards.',
      category: 'Drainage & Flood Control',
      currentStatus: 'SUBMITTED',
      priority: 'HIGH',
      isEscalated: false,
      latitude: 11.253,
      longitude: 75.789,
      addressFormatted: 'Arayidathupalam Bypass, Kozhikode',
      assignedOfficerId: null,
    },
    {
      ticketNumber: 'AVN-2026-4535',
      citizenId: citizenProfile.id,
      departmentId: deptMap.WATER.id,
      title: 'Major water main pipe fracture spraying roadway',
      description: 'Drinking water distribution line burst creating 10-meter geyser and eroding road foundation.',
      category: 'Water Supply & Sewage',
      currentStatus: 'IN_PROGRESS',
      priority: 'HIGH',
      isEscalated: false,
      latitude: 11.248,
      longitude: 75.775,
      addressFormatted: 'South Beach Overbridge, Kozhikode',
      assignedOfficerId: off3.id,
    },
  ];

  for (const c of initialComplaints) {
    const existing = await prisma.complaint.findUnique({ where: { ticketNumber: c.ticketNumber } });
    if (!existing) {
      const complaint = await prisma.complaint.create({
        data: {
          ticketNumber: c.ticketNumber,
          citizenId: c.citizenId,
          departmentId: c.departmentId,
          title: c.title,
          description: c.description,
          category: c.category,
          currentStatus: c.currentStatus,
          priority: c.priority,
          isEscalated: c.isEscalated,
          location: {
            create: {
              latitude: c.latitude,
              longitude: c.longitude,
              addressFormatted: c.addressFormatted,
            },
          },
          statusLogs: {
            create: {
              status: c.currentStatus,
              remarks: `Initial logged status: ${c.currentStatus}`,
              updatedById: adminUser.id,
            },
          },
          assignments: c.assignedOfficerId
            ? {
                create: {
                  officerId: c.assignedOfficerId,
                  assignedById: adminUser.id,
                },
              }
            : undefined,
        },
      });
      console.log(`[Seed] Created complaint: ${complaint.ticketNumber}`);
    }
  }

  // 7. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'High Priority Alert',
        message: 'Complaint AVN-2026-890003 has breached the 48-hour SLA deadline and has been auto-escalated.',
        isRead: false,
      },
      {
        userId: officerUser1.id,
        title: 'New Assignment',
        message: 'You have been dispatched to inspect AVN-2026-4561 (Pothole at MG Road).',
        isRead: false,
      },
    ],
  });

  console.log('[Seed] Database successfully seeded with 100% real persistent data!');
}

seed()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
