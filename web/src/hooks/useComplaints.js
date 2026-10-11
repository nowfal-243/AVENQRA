import { useCallback } from 'react';
import { useData } from '../context/DataContext';
import complaintService from '../services/complaintService';
import { canTransition, isConsequentialTransition } from '../utils/permissions';

/**
 * useComplaints — the single access point for complaint data & workflow
 * actions. All network/demo mutation happens here so presentation
 * components stay declarative.
 *
 * Status changes are optimistic with automatic rollback on failure.
 */
export default function useComplaints() {
  const {
    complaints,
    loading,
    errors,
    lastUpdated,
    isDemo,
    refreshComplaints,
    patchComplaint,
  } = useData();

  /**
   * Validate + apply a status transition.
   * @returns {Promise<{ok:boolean, error?:string, validationFailed?:boolean}>}
   */
  const changeStatus = useCallback(
    async (complaint, nextStatus, remarks = '') => {
      if (!complaint || !nextStatus) return { ok: false, error: 'Missing complaint or status.' };
      if (!canTransition(complaint.currentStatus, nextStatus)) {
        return {
          ok: false,
          validationFailed: true,
          error: `Invalid transition: ${complaint.currentStatus} → ${nextStatus}`,
        };
      }

      const snapshot = { ...complaint };
      patchComplaint({
        ...complaint,
        currentStatus: nextStatus,
        isEscalated: nextStatus === 'ESCALATED' ? true : complaint.isEscalated,
        escalatedAt: nextStatus === 'ESCALATED' ? new Date().toISOString() : complaint.escalatedAt,
        resolvedAt: nextStatus === 'RESOLVED' ? new Date().toISOString() : complaint.resolvedAt,
        updatedAt: new Date().toISOString(),
      });

      try {
        const { row } = await complaintService.updateStatus(complaint.id, nextStatus, remarks);
        if (row && row.id && row.currentStatus) patchComplaint(row);
        await refreshComplaints();
        return { ok: true, source: row };
      } catch (error) {
        patchComplaint(snapshot); // rollback
        return { ok: false, error: error.message || 'Status update failed.' };
      }
    },
    [patchComplaint, refreshComplaints]
  );

  const assignOfficer = useCallback(
    async (complaintId, officerId) => {
      try {
        const { row } = await complaintService.assign(complaintId, officerId);
        if (row && row.id) patchComplaint(row);
        await refreshComplaints();
        return { ok: true, source: row };
      } catch (error) {
        return { ok: false, error: error.message || 'Assignment failed.' };
      }
    },
    [patchComplaint, refreshComplaints]
  );

  /** Fetch a single complaint with full history (status logs, assignments). */
  const getDetail = useCallback(async (id) => {
    const { row, source } = await complaintService.get(id);
    return { row, source };
  }, []);

  const refresh = useCallback(() => refreshComplaints(), [refreshComplaints]);

  return {
    complaints,
    loading: loading.complaints,
    error: errors.complaints,
    lastUpdated,
    isDemo,
    refresh,
    changeStatus,
    assignOfficer,
    getDetail,
    isConsequentialTransition,
  };
}
