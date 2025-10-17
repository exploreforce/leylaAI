'use client';

import { useState, useEffect } from 'react';
import { AdminRoute } from '@/components/ProtectedRoute';
import UserManagementTable from '@/components/admin/UserManagementTable';
import { adminApi } from '@/utils/api';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <AdminUsersContent />
    </AdminRoute>
  );
}

function AdminUsersContent() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAllAccounts();
      const accountsData = response.data?.accounts || [];
      setAccounts(accountsData);
      setFilteredAccounts(accountsData);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      setError(error?.response?.data?.error || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredAccounts(accounts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = accounts.filter(account => {
      // Search in account name
      if (account.accountName.toLowerCase().includes(term)) {
        return true;
      }
      
      // Search in user emails
      return account.users.some((user: any) => 
        user.email.toLowerCase().includes(term)
      );
    });
    
    setFilteredAccounts(filtered);
  }, [searchTerm, accounts]);

  const totalUsers = accounts.reduce((sum, acc) => sum + acc.stats.totalUsers, 0);
  const totalAppointments = accounts.reduce((sum, acc) => sum + acc.stats.totalAppointments, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elysPink-600 mx-auto"></div>
          <p className="text-gray-700 mt-4">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4 font-bold">Error</div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-elysPink-600 text-white rounded hover:bg-elysPink-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-gray-700 mt-1">
                Manage all accounts and users across the platform
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-gray-700">Total Accounts</div>
                  <div className="text-2xl font-bold text-elysPink-600">{accounts.length}</div>
                </div>
                <div>
                  <div className="text-gray-700">Total Users</div>
                  <div className="text-2xl font-bold text-elysBlue-600">{totalUsers}</div>
                </div>
                <div>
                  <div className="text-gray-700">Total Appointments</div>
                  <div className="text-2xl font-bold text-elysViolet-600">{totalAppointments}</div>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <ArrowPathIcon className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-elysPink-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-700">
              {searchTerm ? 'No accounts or users match your search' : 'No accounts found'}
            </p>
          </div>
        ) : (
          <UserManagementTable accounts={filteredAccounts} onRefresh={loadData} />
        )}
      </div>
    </div>
  );
}

