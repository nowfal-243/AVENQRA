const prisma = require('../config/db');

const SLA_LIMIT_MS = 30 * 60 * 1000; // 30 Minutes SLA Limit

class EscalationJob {
  static init() {
    console.log('⚡ AVENQRA 30-Minute SLA Escalation Monitor initialized');
    // Run SLA audit check every 30 seconds
    setInterval(async () => {
      try {
        await EscalationJob.processEscalations();
      } catch (err) {
        console.error('Error executing SLA escalation job:', err.message);
      }
    }, 30 * 1000);
  }

  static async processEscalations() {
    const thirtyMinutesAgo = new Date(Date.now() - SLA_LIMIT_MS);

    // Find overdue unresolved complaints older than 30 minutes
    const overdueComplaints = await prisma.complaint.findMany({
      where: {
        isEscalated: false,
        currentStatus: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { lte: thirtyMinutesAgo },
      },
      include: {
        department: true,
      },
    });

    if (overdueComplaints.length === 0) return;

    console.warn(`⚡ [SLA ESCALATION] Found ${overdueComplaints.length} complaints breaching 30-min SLA threshold. Escalating to Highest Authority...`);

    // Fetch Super Admin users (Highest Authority)
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
    });

    for (const complaint of overdueComplaints) {
      await prisma.$transaction(async (tx) => {
        // 1. Escalate complaint status & raise priority to CRITICAL
        await tx.complaint.update({
          where: { id: complaint.id },
          data: {
            currentStatus: 'ESCALATED',
            priority: 'CRITICAL',
            isEscalated: true,
            escalatedAt: new Date(),
          },
        });

        // 2. Add Status Audit Log
        await tx.complaintStatusLog.create({
          data: {
            complaintId: complaint.id,
            status: 'ESCALATED',
            remarks: `🚨 AUTOMATED 30-MIN SLA ESCALATION: Unresolved work after 30 minutes. Escalated directly to Highest Municipal Authority.`,
          },
        });

        // 3. Notify Super Admins (Highest Authority)
        for (const admin of superAdmins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: `🚨 CRITICAL SLA BREACH: Ticket #${complaint.ticketNumber}`,
              message: `Ticket #${complaint.ticketNumber} (${complaint.category}) at ${complaint.title} exceeded the 30-minute resolution SLA and has been escalated to your desk.`,
            },
          });
        }
      });

      console.warn(`   🚨 Ticket #${complaint.ticketNumber} successfully escalated to Highest Authority.`);
    }
  }
}

module.exports = EscalationJob;
