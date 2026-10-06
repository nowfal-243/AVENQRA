import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, LayoutDashboard, Building2, Users, LogOut, CheckSquare, BarChart2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user && ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role);
  const isOfficer = user && user.role === 'OFFICER';

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & App Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">AVENQRA</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {isAdmin ? 'ADMIN PORTAL' : 'OFFICER PORTAL'}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Complaints</span>
                </Link>
                <Link
                  to="/admin/departments"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/departments'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Departments</span>
                </Link>
                <Link
                  to="/admin/officers"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/officers'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Officers</span>
                </Link>
                <Link
                  to="/admin/analytics"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/analytics'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Analytics</span>
                </Link>
              </>
            )}

            {isOfficer && (
              <Link
                to="/officer"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/officer'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Assigned Complaints</span>
              </Link>
            )}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
              <span className="text-xs text-slate-400">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
