import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Building2, Plus, Edit2, Trash2, Clock, Users, FileText, AlertCircle, X, Check } from 'lucide-react';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slaHours, setSlaHours] = useState('48');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setSlaHours('48');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setSlaHours(dept.slaHours ? String(dept.slaHours) : '48');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, {
          name,
          code,
          slaHours: parseInt(slaHours),
        });
      } else {
        await api.post('/departments', {
          name,
          code,
          slaHours: parseInt(slaHours),
        });
      }

      setSubmitLoading(false);
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      setSubmitLoading(false);
      setError(err.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <span>Civic Departments Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure municipal departments, code identifiers, and target SLA resolution hours.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
          Loading departments...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-black tracking-wide border border-blue-100">
                    {dept.code}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-black text-lg text-slate-900 mt-3">{dept.name}</h3>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Resolution SLA: <b>{dept.slaHours || 48} Hours</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Field Officers: <b>{dept._count?.officers || 0} Assigned</b></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span>Complaints Handled: <b>{dept._count?.complaints || 0} Total</b></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Roads & Transport Infrastructure"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Code (Unique Uppercase)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ROAD"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Resolution SLA (Hours)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="168"
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  <span>{submitLoading ? 'Saving...' : 'Save Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
