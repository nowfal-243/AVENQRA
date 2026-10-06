import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ComplaintMapView from '../../components/map/ComplaintMapView';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart2,
  PieChart as PieIcon,
  MapPin,
  TrendingUp,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building2,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

export default function AnalyticsDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes] = await Promise.all([
        api.get('/complaints?limit=200'),
        api.get('/departments'),
      ]);
      setComplaints(compRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Issue Category Breakdown
  const categoryCounts = complaints.reduce((acc, c) => {
    const cat = c.category || 'OTHER';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryChartData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    count: categoryCounts[cat],
  }));

  // 2. Priority Distribution
  const priorityCounts = complaints.reduce((acc, c) => {
    const prio = c.priority || 'MEDIUM';
    acc[prio] = (acc[prio] || 0) + 1;
    return acc;
  }, {});

  const priorityChartData = [
    { name: 'CRITICAL', value: priorityCounts['CRITICAL'] || 0, color: '#ef4444' },
    { name: 'HIGH', value: priorityCounts['HIGH'] || 0, color: '#f59e0b' },
    { name: 'MEDIUM', value: priorityCounts['MEDIUM'] || 0, color: '#3b82f6' },
    { name: 'LOW', value: priorityCounts['LOW'] || 0, color: '#10b981' },
  ];

  // 3. Department Performance Breakdown
  const departmentChartData = departments.map((d) => {
    const deptComplaints = complaints.filter((c) => c.departmentId === d.id);
    const resolved = deptComplaints.filter((c) => c.currentStatus === 'RESOLVED').length;
    return {
      name: d.code,
      total: deptComplaints.length,
      resolved: resolved,
      slaHours: d.slaHours || 48,
    };
  });

  // Export Analytics to CSV
  const handleExportCSV = () => {
    let csv = 'Ticket Number,Category,Priority,Status,Department,CreatedAt\n';
    complaints.forEach((c) => {
      csv += `"${c.ticketNumber}","${c.category}","${c.priority}","${c.currentStatus}","${c.department?.name || 'N/A'}","${c.createdAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AVENQRA_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span>Civic Analytics & Intelligence Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time geospatial hotspot heatmaps, severity distributions, and department SLA resolution benchmarks.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Summary</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">
          Loading analytics intelligence data...
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart: Most Reported Issues */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  <span>Most Reported Issue Categories</span>
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Priority Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <PieIcon className="w-5 h-5 text-purple-600" />
                  <span>Complaint Severity & Priority Distribution</span>
                </h3>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Department SLA Benchmarks Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Department Complaints & Resolution Performance</span>
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total Filed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Geo-Spatial Heatmap Overview */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <span>City Incident Geo-Spatial Hotspot Map</span>
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {complaints.filter((c) => c.location).length} Geotagged Incidents
              </span>
            </div>
            <ComplaintMapView complaints={complaints} height="520px" />
          </div>
        </>
      )}
    </div>
  );
}
