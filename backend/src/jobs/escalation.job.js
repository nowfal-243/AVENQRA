const prisma = require('../config/db');
const notificationService = require('../services/notification.service');
const realtime = require('../services/realtime.service');
const { getDemoComplaints, updateDemoComplaint } = require('../data/demo-store');

const SLA_MINUTES = parseInt(process.env.SLA_MINUTES || '30', 10);
const SLA_LIMIT_MS = SLA_MINUTES * 60 * 1000;

class EscalationJob {
  static init() {
    console.log(`⚡ AVENQRA ${SLA_MINUTES}-Minute SLA Escalation Monitor initialized`);
    // Run SLA audit check every 30 seconds
    setInterval(async () => {
      try {
        await EscalationJob.processEscalations();
      } catch (err) {
        console.error('Error executing SLA escalation job:', err.message);
      }
    }, 30 * 1000);
  }

  static async checkNow() {
    return EscalationJob.processEscalations();
  }

  static async processEscalations() {
    const slaAgo = new Date(Date.now() - SLA_LIMIT_MS);
    let overdueComplaints = [];
    let superAdmins = [];

    try {
      // Find overdue unresolved complaints older than the SLA window
      overdueComplaints = await prisma.complaint.findMany({
        where: {
          isEscalated: false,
          currentStatus: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
          createdAt: { lte: slaAgo },
        },
        include: {
          department: true,
          location: true,
        },
      });

      // Fetch Super Admin users (Highest Authority)
      superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
      });
    } catch (dbErr) {
      // Demo store fallback
      const demoRows = getDemoComplaints();
      overdueComplaints = demoRows.filter((c) => {
        const createdMs = new Date(c.createdAt).getTime();
        return !c.isEscalated &&
          ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(c.currentStatus) &&
          createdMs <= Date.now() - SLA_LIMIT_MS;
      });
      superAdmins = [{ id: 'admin-demo-uuid-101', name: 'Super Admin Officer', email: 'admin@avenqra.com' }];
    }

    if (overdueComplaints.length === 0) return 0;

    console.warn(`⚡ [SLA ESCALATION] Found ${overdueComplaints.length} complaints breaching ${SLA_MINUTES}-min SLA threshold. Escalating to Highest Authority...`);

    const escalatedItems = [];

    for (const complaint of overdueComplaints) {
      const now = new Date();
      let updatedComplaint = null;

      try {
        await prisma.$transaction(async (tx) => {
          // 1. Escalate complaint status & raise priority to CRITICAL
          const row = await tx.complaint.update({
            where: { id: complaint.id },
            data: {
              currentStatus: 'ESCALATED',
              priority: 'CRITICAL',
              isEscalated: true,
              escalatedAt: now,
            },
            include: { department: true, location: true },
          });

          // 2. Add Status Audit Log
          await tx.complaintStatusLog.create({
            data: {
              complaintId: complaint.id,
              status: 'ESCALATED',
              remarks: `🚨 AUTOMATED ${SLA_MINUTES}-MIN SLA ESCALATION: Unresolved work after ${SLA_MINUTES} minutes. Escalated directly to Highest Municipal Authority.`,
            },
          });

          updatedComplaint = row;
        });
      } catch (dbErr) {
        // Demo store fallback
        updatedComplaint = updateDemoComplaint(complaint.id, {
          currentStatus: 'ESCALATED',
          priority: 'CRITICAL',
          isEscalated: true,
          escalatedAt: now.toISOString(),
        });
      }

      if (!updatedComplaint) {
        updatedComplaint = {
          ...complaint,
          currentStatus: 'ESCALATED',
          priority: 'CRITICAL',
          isEscalated: true,
          escalatedAt: now.toISOString(),
        };
      }

      escalatedItems.push(updatedComplaint);

      // 3. Notify Super Admins & Corporation Channels via NotificationService
      const msg = notificationService.buildComplaintMessage({
        ticketNumber: complaint.ticketNumber,
        title: complaint.title,
        category: complaint.category,
        severity: 'CRITICAL',
        address: complaint.location?.addressFormatted,
        departmentName: complaint.department?.name,
        officerName: null,
        createdAt: complaint.createdAt,
        slaDeadline: new Date(new Date(complaint.createdAt).getTime() + SLA_LIMIT_MS).toISOString(),
        linkPath: `#/complaints?focus=${complaint.id}`,
      });

      for (const admin of superAdmins) {
        await notificationService.notify({
          userId: admin.id,
          title: `🚨 CRITICAL SLA BREACH: Ticket #${complaint.ticketNumber}`,
          message: msg,
          kind: 'complaint:escalated',
          complaintId: complaint.id,
          payload: {
            ticketNumber: complaint.ticketNumber,
            category: complaint.category,
            department: complaint.department?.name,
            breachDurationMinutes: SLA_MINUTES,
          },
          channels: [notificationService.CHANNEL.INAPP, notificationService.CHANNEL.EMAIL, notificationService.CHANNEL.WEBHOOK],
        });
      }

      // 4. Emit realtime event
      try {
        const adminIds = superAdmins.map((a) => a.id).concat(['admin-demo-uuid-101']);
        realtime.emitToUsers(adminIds, 'complaint:escalated', updatedComplaint);
      } catch (e) {
        console.warn('[EscalationJob] realtime emit skipped:', e.message);
      }

      console.warn(`   🚨 Ticket #${complaint.ticketNumber} successfully escalated to Highest Authority.`);
    }

    return escalatedItems.length;
  }
}

module.exports = EscalationJob;

