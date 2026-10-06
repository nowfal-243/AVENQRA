import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Users, UserPlus, Shield, Building2, Phone, Mail, AlertCircle, X, Check, Activity } from 'lucide-react';

export default function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Register Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offRes, deptRes] = await Promise.all([
        api.get('/officers'),
        api.get('/departments'),
      ]);
      setOfficers(offRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      console.error('Failed to load officers/departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOfficer = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    try {
      await api.post('/officers', {
        name,
        email,
        password,
        phone,
        badgeNumber,
        departmentId: departmentId || null,
      });

      setSubmitLoading(false);
      setShowRegisterModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setBadgeNumber('');
      setDepartmentId('');
      fetchData();
    } catch (err) {
      setSubmitLoading(false);
      setError(err.response?.data?.message || 'Failed to register field officer.');
    }
  };

  const handleStatusChange = async (officerId, newStatus) => {
    try {
      await api.patch(`/officers/${officerId}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">ACTIVE</span>;
      case 'BUSY':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">BUSY</span>;
      case 'ON_LEAVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">ON LEAVE</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Field Officers Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register on-ground field officers, manage department assignments, and monitor active status.
          </p>
        </div>
        <button
          onClick={() => {
            setError('');
            setShowRegisterModal(true);
          }}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Field Officer</span>
        </button>
      </div>

      {/* Officers Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
          Loading officers directory...
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold">
                  <th className="p-4">Badge #</th>
                  <th className="p-4">Officer Name & Contact</th>
                  <th className="p-4">Assigned Department</th>
                  <th className="p-4">Duty Status</th>
                  <th className="p-4">Active Assignments</th>
                  <th className="p-4 text-right">Quick Status Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {officers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No field officers registered yet.
                    </td>
                  </tr>
                ) : (
                  officers.map((officer) => (
                    <tr key={officer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-700">
                        #{officer.badgeNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{officer.user?.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{officer.user?.email}</span>
                          </span>
                          {officer.user?.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{officer.user?.phone}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {officer.department ? (
                          <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-100">
                            {officer.department.name} ({officer.department.code})
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(officer.status)}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {officer._count?.assignments || 0} Tasks
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={officer.status}
                          onChange={(e) => handleStatusChange(officer.id, e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="BUSY">BUSY</option>
                          <option value="ON_LEAVE">ON LEAVE</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Officer Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">Register Field Officer Account</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterOfficer} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Officer Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="officer.rajesh@avenqra.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge #</label>
                  <input
                    type="text"
                    required
                    placeholder="OFF-904"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Assignment</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitLoading ? 'Registering...' : 'Create Officer Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
