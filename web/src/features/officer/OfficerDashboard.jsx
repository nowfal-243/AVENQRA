import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ComplaintMapView from '../../components/map/ComplaintMapView';
import StatusUpdateModal from '../../components/admin/StatusUpdateModal';
import {
  CheckSquare,
  MapPin,
  List,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Phone,
  User,
  Sparkles,
  Eye,
  X
} from 'lucide-react';

export default function OfficerDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'map'
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusModalComplaint, setStatusModalComplaint] = useState(null);

  useEffect(() => {
    fetchMyAssignments();
  }, []);

  const fetchMyAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assignments/my');
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch officer assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const complaints = assignments.map((a) => a.complaint).filter(Boolean);

  const activeTasksCount = complaints.filter(
    (c) => ['ASSIGNED', 'IN_PROGRESS'].includes(c.currentStatus)
  ).length;

  const resolvedTasksCount = complaints.filter(
    (c) => c.currentStatus === 'RESOLVED'
  ).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">SUBMITTED</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">ASSIGNED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">RESOLVED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-blue-400" />
            <span>Field Officer Work Console</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your assigned civic complaints, update task progress, and submit resolution proof images.
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <span className="text-slate-400 uppercase text-[10px]">Active Tasks:</span>
            <span className="ml-2 text-amber-400 text-sm font-black">{activeTasksCount}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <span className="text-slate-400 uppercase text-[10px]">Resolved:</span>
            <span className="ml-2 text-emerald-400 text-sm font-black">{resolvedTasksCount}</span>
          </div>
        </div>
      </div>

      {/* Control Switcher */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm">My Dispatched Incidents ({complaints.length})</h3>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Assigned List</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Task Map</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">
          Loading assigned complaints...
        </div>
      ) : activeTab === 'map' ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <ComplaintMapView
            complaints={complaints}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            height="560px"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
              You currently have no complaints assigned to you.
            </div>
          ) : (
            complaints.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-blue-600">
                      {item.ticketNumber}
                    </span>
                    {getStatusBadge(item.currentStatus)}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base line-clamp-1 mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {item.description}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 border border-slate-100 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="font-bold text-slate-800">{item.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {item.location?.addressFormatted || 'Map Location'}
                      </span>
                    </div>
                    {item.citizen?.user && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-400">Citizen:</span>
                        <span className="font-medium text-slate-700">
                          {item.citizen.user.name} ({item.citizen.user.phone || 'No phone'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedComplaint(item)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => setStatusModalComplaint(item)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update Task</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Update Status Modal */}
      {statusModalComplaint && (
        <StatusUpdateModal
          complaint={statusModalComplaint}
          onClose={() => setStatusModalComplaint(null)}
          onSuccess={fetchMyAssignments}
        />
      )}

      {/* Complaint Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-lg">Ticket #{selectedComplaint.ticketNumber}</h3>
                <p className="text-xs text-slate-400">{selectedComplaint.title}</p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-slate-800">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedComplaint.category}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedComplaint.currentStatus)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Citizen Name:</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedComplaint.citizen?.user?.name || 'Citizen'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Contact Phone:</span>
                  <div className="font-bold text-blue-600 mt-0.5">
                    {selectedComplaint.citizen?.user?.phone || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Issue Description</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2">Attached Images & Proofs</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedComplaint.images.map((img) => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={img.imageUrl} alt="Complaint media" className="w-full h-32 object-cover" />
                        <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {img.imageType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Audit Log */}
              {selectedComplaint.statusLogs && selectedComplaint.statusLogs.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2">Workflow Status Log</h4>
                  <div className="space-y-2 text-xs">
                    {selectedComplaint.statusLogs.map((log) => (
                      <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{log.status}</div>
                          <div className="text-slate-600 mt-0.5">{log.remarks}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {new Date(log.changedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    const c = selectedComplaint;
                    setSelectedComplaint(null);
                    setStatusModalComplaint(c);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Update Task Status & Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
