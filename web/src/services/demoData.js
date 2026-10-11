/**
 * Demo dataset for AVENQRA.
 *
 * IMPORTANT: every record produced here carries `isDemoRecord: true` and is
 * only ever shown when the application is in clearly-labelled demo mode.
 * Demo data never touches the real backend.
 */

let idCounter = 1000;
const uid = (prefix) => `${prefix}-demo-${(idCounter += 1)}`;

/** Offline-safe placeholder image (SVG data URI) — no external requests. */
export function demoImage(label, bg = '#0F172A', fg = '#38BDF8') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="${bg}"/><rect x="1" y="1" width="638" height="398" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2"/><text x="320" y="190" font-family="Inter, Arial" font-size="26" font-weight="700" fill="${fg}" text-anchor="middle">DEMO IMAGE</text><text x="320" y="228" font-family="Inter, Arial" font-size="16" fill="#94A3B8" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const OFFICERS_SEED = [
  { badge: 'OFF-ROAD-402', name: 'Ramesh Kumar', dept: 'road', status: 'ACTIVE', phone: '+91 98450 10001' },
  { badge: 'OFF-ROAD-415', name: 'Suresh Patil', dept: 'road', status: 'BUSY', phone: '+91 98450 10002' },
  { badge: 'OFF-WST-221', name: 'Lakshmi Devi', dept: 'waste', status: 'ACTIVE', phone: '+91 98450 10003' },
  { badge: 'OFF-WST-233', name: 'Arjun Singh', dept: 'waste', status: 'ACTIVE', phone: '+91 98450 10004' },
  { badge: 'OFF-WAT-118', name: 'Priya Nair', dept: 'water', status: 'ACTIVE', phone: '+91 98450 10005' },
  { badge: 'OFF-WAT-127', name: 'Mohammed Irfan', dept: 'water', status: 'ON_LEAVE', phone: '+91 98450 10006' },
  { badge: 'OFF-ELC-310', name: 'Vikram Rao', dept: 'elec', status: 'ACTIVE', phone: '+91 98450 10007' },
  { badge: 'OFF-DRN-509', name: 'Anitha Reddy', dept: 'drain', status: 'ACTIVE', phone: '+91 98450 10008' },
];

const DEPARTMENTS_SEED = [
  {
    id: 'demo-dept-road', code: 'ROAD', name: 'Roads & Infrastructure', slaHours: 48,
    description: 'Road surface, footpath, signage and public infrastructure defects.',
    adminName: 'Sr. Engineer — G. Sharma',
  },
  {
    id: 'demo-dept-waste', code: 'WASTE', name: 'Waste Management', slaHours: 24,
    description: 'Garbage collection, bin overflow, illegal dumping and sanitation.',
    adminName: 'Sanitary Officer — K. Menon',
  },
  {
    id: 'demo-dept-water', code: 'WATER', name: 'Water Supply', slaHours: 12,
    description: 'Potable water supply, leakage, sewage overflow and plumbing.',
    adminName: 'Water Works Head — D. Joshi',
  },
  {
    id: 'demo-dept-elec', code: 'ELEC', name: 'Electrical', slaHours: 6,
    description: 'Street lighting, traffic signals and public electrical assets.',
    adminName: 'Electrical Supt. — P. Kulkarni',
  },
  {
    id: 'demo-dept-drain', code: 'DRAIN', name: 'Drainage', slaHours: 12,
    description: 'Storm water drains, blockages, flooding and dewatering.',
    adminName: 'Drainage Inspector — S. Das',
  },
];

const COMPLAINT_SEED = [
  { t: 'Deep pothole on 5th Avenue near bus stop', c: 'Pothole', s: 'ASSIGNED', p: 'HIGH', d: 0.2, off: 0, lat: 12.9716, lng: 77.5946, addr: '5th Avenue, Central Ward' },
  { t: 'Overflowing waste bin at market entrance', c: 'Overflowing Waste Bin', s: 'IN_PROGRESS', p: 'MEDIUM', d: 0.5, off: 2, lat: 12.9741, lng: 77.6012, addr: 'City Market Gate 2' },
  { t: 'Open manhole hazard on Main Street', c: 'Public Property Damage', s: 'ESCALATED', p: 'CRITICAL', d: 1.2, off: 1, lat: 12.9689, lng: 77.5891, addr: 'Main St, Junction Rd', esc: true },
  { t: 'Broken street light pole #42', c: 'Streetlight Electrical Failure', s: 'ASSIGNED', p: 'MEDIUM', d: 0.8, off: 6, lat: 12.9812, lng: 77.5935, addr: 'Ring Road Phase 1' },
  { t: 'Fallen tree branch blocking lane', c: 'Fallen Tree', s: 'RESOLVED', p: 'HIGH', d: 2.1, off: 1, lat: 12.9567, lng: 77.5812, addr: 'Lake View Rd', resolved: true },
  { t: 'Sewage overflow near school gate', c: 'Sewage Overflow', s: 'ESCALATED', p: 'CRITICAL', d: 1.6, off: 4, lat: 12.9453, lng: 77.6271, addr: 'Govt. Higher Primary School', esc: true },
  { t: 'Water leakage at pipeline junction', c: 'Water Leakage', s: 'IN_PROGRESS', p: 'HIGH', d: 0.9, off: 4, lat: 12.9901, lng: 77.5723, addr: 'Palace Cross Rd' },
  { t: 'Damaged footpath slabs outside hospital', c: 'Damaged Footpath', s: 'SUBMITTED', p: 'MEDIUM', d: 0.15, off: null, lat: 12.9352, lng: 77.6043, addr: 'Victoria Hospital Rd' },
  { t: 'Garbage dump beside lake shore', c: 'Illegal Waste Dumping', s: 'ASSIGNED', p: 'HIGH', d: 3.4, off: 3, lat: 12.9784, lng: 77.6408, addr: 'Ulsoor Lake East Bank' },
  { t: 'Blocked storm drain causing waterlogging', c: 'Drainage Blockage', s: 'IN_PROGRESS', p: 'HIGH', d: 0.7, off: 7, lat: 12.9265, lng: 77.5812, addr: 'Jayanagar 4th Block' },
  { t: 'Traffic signal stuck on red', c: 'Traffic Signal Failure (Electrical)', s: 'ASSIGNED', p: 'CRITICAL', d: 0.35, off: 6, lat: 12.9762, lng: 77.6033, addr: 'MG Road – Trinity Circle' },
  { t: 'Irregular water supply for 3 days', c: 'Water Supply Interruption', s: 'SUBMITTED', p: 'MEDIUM', d: 0.6, off: null, lat: 13.0012, lng: 77.5612, addr: 'Yeshwanthpur' },
  { t: 'Cracked road after utility work', c: 'Damaged Road', s: 'RESOLVED', p: 'MEDIUM', d: 4.2, off: 0, lat: 12.9724, lng: 77.6112, addr: 'Brigade Rd', resolved: true },
  { t: 'Waste pile-up behind bus depot', c: 'Waste Accumulation', s: 'RESOLVED', p: 'MEDIUM', d: 5.1, off: 2, lat: 12.9889, lng: 77.6205, addr: 'Shanthinagar Depot', resolved: true },
  { t: 'Damaged park bench and railing', c: 'Public Property Damage', s: 'REJECTED', p: 'LOW', d: 6.3, off: 1, lat: 12.9755, lng: 77.5938, addr: 'Cubbon Park East', resolved: true },
  { t: 'Large pothole cluster on service road', c: 'Pothole', s: 'ESCALATED', p: 'CRITICAL', d: 2.8, off: 1, lat: 12.9455, lng: 77.5892, addr: 'Outer Ring Rd, Banashankari', esc: true },
  { t: 'Streetlight flickering all night', c: 'Streetlight Electrical Failure', s: 'SUBMITTED', p: 'LOW', d: 0.25, off: null, lat: 12.9698, lng: 77.6235, addr: 'Indiranagar 100ft Rd' },
  { t: 'Clogged drain water entering houses', c: 'Drainage Blockage', s: 'ASSIGNED', p: 'CRITICAL', d: 1.9, off: 7, lat: 12.9112, lng: 77.6312, addr: 'BTM Layout 2nd Stage' },
  { t: 'Leaking public tap wasting water', c: 'Water Leakage', s: 'RESOLVED', p: 'LOW', d: 6.8, off: 4, lat: 12.9941, lng: 77.5512, addr: 'Malleshwaram 8th Cross', resolved: true },
  { t: 'Illegal construction debris on footpath', c: 'Illegal Waste Dumping', s: 'IN_PROGRESS', p: 'MEDIUM', d: 1.1, off: 3, lat: 12.9582, lng: 77.6012, addr: 'Residency Rd' },
  { t: 'Road cut left unfilled for a week', c: 'Damaged Road', s: 'SUBMITTED', p: 'HIGH', d: 0.45, off: null, lat: 12.9841, lng: 77.6117, addr: 'CMH Rd' },
  { t: 'Overflowing bin near metro station', c: 'Overflowing Waste Bin', s: 'RESOLVED', p: 'MEDIUM', d: 3.1, off: 3, lat: 12.9779, lng: 77.6412, addr: 'Indiranagar Metro', resolved: true },
  { t: 'Sewer line overflow onto road', c: 'Sewage Overflow', s: 'IN_PROGRESS', p: 'CRITICAL', d: 0.55, off: 5, lat: 12.9488, lng: 77.6112, addr: 'Jayanagar 8th Block' },
  { t: 'Damaged zebra crossing paint and bumps', c: 'Damaged Footpath', s: 'ASSIGNED', p: 'LOW', d: 7.2, off: 0, lat: 12.9732, lng: 77.5862, addr: 'Kasturba Rd' },
];

const NOW = Date.now();

function buildStatusLogs(complaint, seedOfficer) {
  const logs = [
    {
      id: uid('log'), status: 'SUBMITTED', remarks: 'Complaint filed by citizen',
      changedAt: new Date(complaint.createdAt).toISOString(),
      updatedBy: { name: complaint.citizen.user.name, role: 'CITIZEN' }, isDemoRecord: true,
    },
  ];
  if (['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'REJECTED'].includes(complaint.currentStatus)) {
    logs.push({
      id: uid('log'), status: 'ASSIGNED',
      remarks: `Assigned to Officer Badge #${seedOfficer.badgeNumber}`,
      changedAt: new Date(new Date(complaint.createdAt).getTime() + 4 * MIN).toISOString(),
      updatedBy: { name: 'Super Admin Officer', role: 'SUPER_ADMIN' }, isDemoRecord: true,
    });
  }
  if (['IN_PROGRESS', 'RESOLVED'].includes(complaint.currentStatus)) {
    logs.push({
      id: uid('log'), status: 'IN_PROGRESS', remarks: 'Field officer started on-site work',
      changedAt: new Date(new Date(complaint.createdAt).getTime() + 11 * MIN).toISOString(),
      updatedBy: { name: seedOfficer.user.name, role: 'OFFICER' }, isDemoRecord: true,
    });
  }
  if (complaint.escalatedAt) {
    logs.push({
      id: uid('log'), status: 'ESCALATED',
      remarks: 'AUTOMATED 30-MIN SLA ESCALATION: unresolved within the 30-minute window.',
      changedAt: new Date(complaint.escalatedAt).toISOString(),
      updatedBy: { name: 'SLA Engine', role: 'SYSTEM' }, isDemoRecord: true,
    });
  }
  if (complaint.currentStatus === 'RESOLVED') {
    logs.push({
      id: uid('log'), status: 'RESOLVED', remarks: 'Work completed and verified with field photos',
      changedAt: new Date(complaint.updatedAt).toISOString(),
      updatedBy: { name: seedOfficer.user.name, role: 'OFFICER' }, isDemoRecord: true,
    });
  }
  if (complaint.currentStatus === 'REJECTED') {
    logs.push({
      id: uid('log'), status: 'REJECTED', remarks: 'Duplicate or outside municipal scope',
      changedAt: new Date(complaint.updatedAt).toISOString(),
      updatedBy: { name: 'Super Admin Officer', role: 'SUPER_ADMIN' }, isDemoRecord: true,
    });
  }
  return logs;
}

function codeForCategory(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('waste') || cat.includes('garbage') || cat.includes('dumping')) return 'WASTE';
  if (cat.includes('water') || cat.includes('sewage')) return 'WATER';
  if (cat.includes('light') || cat.includes('electrical') || cat.includes('signal')) return 'ELEC';
  if (cat.includes('drain') || cat.includes('flood')) return 'DRAIN';
  return 'ROAD';
}

export function createDemoSeed() {
  idCounter = 1000;

  const departments = DEPARTMENTS_SEED.map((d) => ({
    ...d,
    isActive: true,
    createdAt: new Date(NOW - 120 * DAY).toISOString(),
    isDemoRecord: true,
    _count: { officers: 0, complaints: 0 },
  }));

  const officers = OFFICERS_SEED.map((o) => {
    const dept = departments.find((d) => d.id === `demo-dept-${o.dept}`);
    return {
      id: uid('officer'),
      badgeNumber: o.badge,
      status: o.status,
      departmentId: dept.id,
      department: { id: dept.id, name: dept.name, code: dept.code },
      user: {
        id: uid('user'),
        name: o.name,
        email: `${o.badge.toLowerCase().replace(/-/g, '.')}@demo.avenqra`,
        phone: o.phone,
        avatarUrl: null,
      },
      _count: { assignments: 0 },
      lastKnownLocation: null,
      isDemoRecord: true,
    };
  });

  const complaints = COMPLAINT_SEED.map((seed, index) => {
    const createdAt = new Date(NOW - seed.d * DAY - (index % 5) * 17 * MIN).toISOString();
    const escalatedAt = seed.esc ? new Date(new Date(createdAt).getTime() + 30 * MIN).toISOString() : null;
    const updatedAt = seed.resolved
      ? new Date(new Date(createdAt).getTime() + (14 + (index % 20)) * MIN).toISOString()
      : escalatedAt || new Date(new Date(createdAt).getTime() + 6 * MIN).toISOString();

    const officer = seed.off !== null ? officers[seed.off] : null;
    const dept =
      departments.find((d) => d.code === (officer?.department?.code || codeForCategory(seed.c))) ||
      departments[0];

    const severity =
      seed.p === 'CRITICAL' ? 9 + (index % 10) / 10
      : seed.p === 'HIGH' ? 7 + (index % 10) / 10
      : seed.p === 'MEDIUM' ? 4.5 + (index % 10) / 10
      : 2 + (index % 10) / 10;

    const complaint = {
      id: uid('cmp'),
      ticketNumber: `AVN-2026-${String(890000 + index * 1373).slice(0, 6)}`,
      title: seed.t,
      description: `${seed.t}. Reported by a citizen through the AVENQRA portal. Awaiting field verification and closure with photographic evidence.`,
      category: seed.c,
      currentStatus: seed.s,
      priority: seed.p,
      isEscalated: !!seed.esc,
      escalatedAt,
      departmentId: dept.id,
      department: { id: dept.id, name: dept.name, code: dept.code },
      citizen: {
        id: uid('citizen'),
        user: {
          name: ['Asha Patel', 'Rohan Gupta', 'Meera Joshi', 'Imran Khan', 'Divya Rao'][index % 5],
          email: 'citizen@demo.avenqra',
        },
      },
      images: [
        { id: uid('img'), imageUrl: demoImage('original complaint photo'), imageType: 'INITIAL', uploadedAt: createdAt, isDemoRecord: true },
        ...(seed.resolved && seed.s === 'RESOLVED'
          ? [{ id: uid('img'), imageUrl: demoImage('resolution evidence', '#052E16', '#34D399'), imageType: 'RESOLUTION', uploadedAt: updatedAt, isDemoRecord: true }]
          : []),
      ],
      location: { id: uid('loc'), latitude: seed.lat, longitude: seed.lng, addressFormatted: seed.addr, isDemoRecord: true },
      aiAnalysis: {
        id: uid('ai'),
        predictedCategory: seed.c,
        confidenceScore: index % 4 === 3 ? null : 0.82 + ((index % 15) / 100),
        severityScore: severity,
        isDuplicate: seed.s === 'REJECTED',
        isDemoRecord: true,
      },
      assignments: officer
        ? [{
            id: uid('asg'),
            officerId: officer.id,
            assignedAt: new Date(new Date(createdAt).getTime() + 4 * MIN).toISOString(),
            completedAt: seed.resolved ? updatedAt : null,
            officer: { id: officer.id, badgeNumber: officer.badgeNumber, user: { name: officer.user.name } },
            isDemoRecord: true,
          }]
        : [],
      feedback: null,
      createdAt,
      updatedAt,
      resolvedAt: seed.resolved ? updatedAt : null,
      statusLogs: [],
      isDemoRecord: true,
    };

    complaint.statusLogs = buildStatusLogs(complaint, officer || officers[0]);
    if (officer) officer._count.assignments += 1;
    return complaint;
  });

  departments.forEach((d) => {
    d._count.complaints = complaints.filter((c) => c.departmentId === d.id).length;
    d._count.officers = officers.filter((o) => o.departmentId === d.id).length;
  });

  const notifications = [
    {
      id: uid('ntf'), title: 'SLA breach escalated',
      message: 'Ticket AVN-2026-890002 exceeded the 30-minute SLA and was escalated to Super Admin.',
      isRead: false, createdAt: new Date(NOW - 35 * MIN).toISOString(), isDemoRecord: true,
    },
    {
      id: uid('ntf'), title: 'New complaint assigned',
      message: 'You have been assigned Ticket AVN-2026-890000: Deep pothole on 5th Avenue.',
      isRead: false, createdAt: new Date(NOW - 2 * HOUR).toISOString(), isDemoRecord: true,
    },
    {
      id: uid('ntf'), title: 'Complaint resolved',
      message: 'Ticket AVN-2026-890012 was marked resolved with evidence.',
      isRead: true, createdAt: new Date(NOW - 1 * DAY).toISOString(), isDemoRecord: true,
    },
  ];

  return { version: 1, seededAt: new Date(NOW).toISOString(), departments, officers, complaints, notifications };
}