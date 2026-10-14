const prisma = require('../config/db');

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

  static async processEscalations() {
    const slaAgo = new Date(Date.now() - SLA_LIMIT_MS);

    // Find overdue unresolved complaints older than the SLA window
    const overdueComplaints = await prisma.complaint.findMany({
      where: {
        isEscalated: false,
        currentStatus: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { lte: slaAgo },
      },
      include: {
        department: true,
      },
    });

    if (overdueComplaints.length === 0) return;

    console.warn(`⚡ [SLA ESCALATION] Found ${overdueComplaints.length} complaints breaching ${SLA_MINUTES}-min SLA threshold. Escalating to Highest Authority...`);

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
            remarks: `🚨 AUTOMATED ${SLA_MINUTES}-MIN SLA ESCALATION: Unresolved work after ${SLA_MINUTES} minutes. Escalated directly to Highest Municipal Authority.`,
          },
        });

        // 3. Notify Super Admins (Highest Authority)
        for (const admin of superAdmins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: `🚨 CRITICAL SLA BREACH: Ticket #${complaint.ticketNumber}`,
              message: `Ticket #${complaint.ticketNumber} (${complaint.category}) at ${complaint.title} exceeded the ${SLA_MINUTES}-minute resolution SLA and has been escalated to your desk.`,
            },
          });
        }
      });

      console.warn(`   🚨 Ticket #${complaint.ticketNumber} successfully escalated to Highest Authority.`);
    }
  }
}

module.exports = EscalationJob;
