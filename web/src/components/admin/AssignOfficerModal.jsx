import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { X, UserCheck, Building2, AlertCircle, CheckCircle } from 'lucide-react';

export default function AssignOfficerModal({ complaint, onClose, onSuccess }) {
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedDept, setSelectedDept] = useState(complaint?.departmentId || '');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchOfficers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/officers');
      setOfficers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load officers:', err);
    }
  };

  const filteredOfficers = selectedDept
    ? officers.filter((o) => o.departmentId === selectedDept)
    : officers;

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedOfficer) {
      setError('Please select a Field Officer to assign.');
      return;
    }

    setLoading(true);
    try {
      // 1. Assign Officer via POST /assignments
      await api.post('/assignments', {
        complaintId: complaint.id,
        officerId: selectedOfficer,
      });

      // 2. Update department if selected
      if (selectedDept && selectedDept !== complaint.departmentId) {
        await api.patch(`/complaints/${complaint.id}/status`, {
          departmentId: selectedDept,
        });
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to dispatch officer.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg">Dispatch Field Officer</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAssign} className="p-6 space-y-5">
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-blue-900">
            <div className="font-bold text-sm text-blue-950 mb-1">Ticket #{complaint.ticketNumber}</div>
            <div className="font-medium">{complaint.title}</div>
            <div className="mt-1 text-blue-700">Category: {complaint.category}</div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Target Department</span>
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedOfficer('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- All Departments --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Field Officer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Select Field Officer</span>
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Choose Officer --</option>
              {filteredOfficers.map((o) => (
                <option key={o.id} value={o.id}>
                  Badge #{o.badgeNumber} - {o.user?.name} ({o.status})
                </option>
              ))}
            </select>
            {filteredOfficers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No officers available for the selected department.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Dispatching...' : 'Dispatch Officer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
