import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ComplaintMapView from '../../components/map/ComplaintMapView';
import AssignOfficerModal from '../../components/admin/AssignOfficerModal';
import StatusUpdateModal from '../../components/admin/StatusUpdateModal';
import {
  Search,
  Filter,
  MapPin,
  List,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Building,
  Sparkles,
  Eye,
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'map'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [assignModalComplaint, setAssignModalComplaint] = useState(null);
  const [statusModalComplaint, setStatusModalComplaint] = useState(null);
  const [detailModalComplaint, setDetailModalComplaint] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await api.get('/complaints', { params });
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  // Metrics calculation
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.currentStatus === 'SUBMITTED').length;
  const assignedCount = complaints.filter((c) => c.currentStatus === 'ASSIGNED').length;
  const inProgressCount = complaints.filter((c) => c.currentStatus === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter((c) => c.currentStatus === 'RESOLVED').length;

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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-600 text-white animate-pulse">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500 text-white">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500 text-white">LOW</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Complaints</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCount}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</h3>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-400 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Officers</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{assignedCount}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl text-blue-500">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{inProgressCount}</h3>
          </div>
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</h3>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, title, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all"
            >
              Search
            </button>
          </form>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Geospatial Map</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">Status: All</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">Category: All</option>
            <option value="POTHOLE">POTHOLE</option>
            <option value="WATER_LEAK">WATER_LEAK</option>
            <option value="WASTE">WASTE / GARBAGE</option>
            <option value="STREETLIGHT">STREETLIGHT</option>
            <option value="OTHER">OTHER</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">Priority: All</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {(statusFilter || categoryFilter || priorityFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setPriorityFilter('');
                setSearch('');
              }}
              className="text-red-600 hover:text-red-800 font-semibold underline text-xs ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Table vs Map */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">
          Loading complaint queue...
        </div>
      ) : activeTab === 'map' ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Geo-Spatial Heatmap & Incident Locations</span>
            </h3>
            <span className="text-xs text-slate-500">
              Showing {complaints.filter((c) => c.location).length} geotagged items
            </span>
          </div>
          <ComplaintMapView
            complaints={complaints}
            onSelectComplaint={(c) => setDetailModalComplaint(c)}
            height="560px"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold">
                  <th className="p-4">Ticket #</th>
                  <th className="p-4">Incident Info</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">AI Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Department & Officer</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No complaints found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  complaints.map((item) => {
                    const assignedOfficer = item.assignments?.[0]?.officer;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {item.ticketNumber}
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                          <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                            {item.location?.addressFormatted || 'Location pinned'}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          <span className="px-2 py-1 rounded bg-slate-100 font-semibold text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4">{getPriorityBadge(item.priority)}</td>
                        <td className="p-4">
                          {item.aiAnalysis ? (
                            <div className="flex items-center space-x-1 text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100 w-max">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              <span>{item.aiAnalysis.severityScore?.toFixed(1) || '5.0'} / 10</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(item.currentStatus)}</td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">
                            {item.department?.name || 'Unassigned Dept'}
                          </div>
                          {assignedOfficer ? (
                            <div className="text-[11px] text-blue-600 font-medium">
                              👮 Badge #{assignedOfficer.badgeNumber} ({assignedOfficer.user?.name})
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-600 font-medium">⚠️ No Officer</div>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button
                            onClick={() => setDetailModalComplaint(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssignModalComplaint(item)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                            title="Dispatch Officer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setStatusModalComplaint(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                            title="Update Status"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {assignModalComplaint && (
        <AssignOfficerModal
          complaint={assignModalComplaint}
          onClose={() => setAssignModalComplaint(null)}
          onSuccess={fetchComplaints}
        />
      )}

      {statusModalComplaint && (
        <StatusUpdateModal
          complaint={statusModalComplaint}
          onClose={() => setStatusModalComplaint(null)}
          onSuccess={fetchComplaints}
        />
      )}

      {/* Detail Modal */}
      {detailModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-lg">Ticket #{detailModalComplaint.ticketNumber}</h3>
                <p className="text-xs text-slate-400">{detailModalComplaint.title}</p>
              </div>
              <button
                onClick={() => setDetailModalComplaint(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-slate-800">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{detailModalComplaint.category}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(detailModalComplaint.currentStatus)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Priority:</span>
                  <div className="mt-0.5">{getPriorityBadge(detailModalComplaint.priority)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Citizen Name:</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {detailModalComplaint.citizen?.user?.name || 'Citizen'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Full Description</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {detailModalComplaint.description}
                </p>
              </div>

              {detailModalComplaint.images && detailModalComplaint.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2">Complaint Images & Proofs</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detailModalComplaint.images.map((img) => (
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setDetailModalComplaint(null)}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
