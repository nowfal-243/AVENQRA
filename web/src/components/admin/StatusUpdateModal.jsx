import React, { useState } from 'react';
import api from '../../api/client';
import { X, RefreshCw, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function StatusUpdateModal({ complaint, onClose, onSuccess }) {
  const [status, setStatus] = useState(complaint?.currentStatus || 'IN_PROGRESS');
  const [remarks, setRemarks] = useState('');
  const [resolutionFile, setResolutionFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('status', status);
      if (remarks) formData.append('remarks', remarks);
      if (resolutionFile) {
        formData.append('resolutionImage', resolutionFile);
      }

      await api.patch(`/complaints/${complaint.id}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to update complaint status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">Update Workflow Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
            <div className="font-bold text-sm text-slate-900 mb-1">Ticket #{complaint.ticketNumber}</div>
            <div className="font-medium text-slate-800">{complaint.title}</div>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-slate-500">Current:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">
                {complaint.currentStatus}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="SUBMITTED">SUBMITTED (Pending Review)</option>
              <option value="ASSIGNED">ASSIGNED (Dispatched)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Work On-site)</option>
              <option value="RESOLVED">RESOLVED (Completed)</option>
              <option value="REJECTED">REJECTED (Invalid / Out of Scope)</option>
            </select>
          </div>

          {/* Resolution Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Resolution Notes / Log Remarks</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add status notes or field resolution details..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Proof Upload (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Resolution Proof (Optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setResolutionFile(e.target.files[0])}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {resolutionFile && (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                Selected: {resolutionFile.name}
              </p>
            )}
          </div>

          {/* Actions */}
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
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Confirm Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
