'use client';

import { useState } from 'react';
import { 
  TrashIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';
import moment from 'moment';
import { adminApi } from '@/utils/api';
import AccountStats from './AccountStats';

interface User {
  userId: string;
  email: string;
  role: string;
  lastLogin: string | null;
  createdAt: string;
  appointmentsCreated: number;
}

interface Account {
  accountId: string;
  accountName: string;
  createdAt: string;
  updatedAt: string;
  users: User[];
  stats: {
    totalAppointments: number;
    totalUsers: number;
  };
}

interface UserManagementTableProps {
  accounts: Account[];
  onRefresh: () => void;
}

export default function UserManagementTable({ accounts, onRefresh }: UserManagementTableProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ userId: string; email: string } | null>(null);
  const [moveModal, setMoveModal] = useState<{ userId: string; email: string; currentAccountId: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setLoading(true);
      await adminApi.changeUserRole(userId, newRole);
      onRefresh();
    } catch (error) {
      console.error('Failed to change user role:', error);
      alert('Failed to change user role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    
    try {
      setLoading(true);
      await adminApi.deleteUser(deleteModal.userId);
      setDeleteModal(null);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error?.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUser = async (newAccountId: string) => {
    if (!moveModal) return;
    
    try {
      setLoading(true);
      await adminApi.moveUser(moveModal.userId, newAccountId);
      setMoveModal(null);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to move user:', error);
      alert(error?.response?.data?.error || 'Failed to move user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {accounts.map((account) => {
        const isExpanded = expandedAccounts.has(account.accountId);
        
        return (
          <div key={account.accountId} className="bg-dark-900 rounded-lg overflow-hidden border border-dark-700">
            {/* Account Header */}
            <button
              onClick={() => toggleAccount(account.accountId)}
              className="w-full text-left hover:bg-dark-800 transition-colors"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <AccountStats
                      accountName={account.accountName}
                      createdAt={account.createdAt}
                      totalUsers={account.stats.totalUsers}
                      totalAppointments={account.stats.totalAppointments}
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Users Table */}
            {isExpanded && (
              <div className="border-t border-dark-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {account.users.map((user) => (
                        <tr key={user.userId} className="hover:bg-dark-800">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-100">{user.email}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.userId, e.target.value as 'admin' | 'user')}
                              disabled={loading}
                              className="bg-dark-700 text-gray-100 border border-dark-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-elysPink-500"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {user.lastLogin 
                                ? moment(user.lastLogin).fromNow()
                                : <span className="text-gray-500">Never</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {moment(user.createdAt).format('MMM DD, YYYY')}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setMoveModal({ 
                                  userId: user.userId, 
                                  email: user.email,
                                  currentAccountId: account.accountId
                                })}
                                disabled={loading}
                                className="text-elysBlue-400 hover:text-elysBlue-300 disabled:opacity-50"
                                title="Move to another account"
                              >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ userId: user.userId, email: user.email })}
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                title="Delete user"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4 border border-dark-600">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Delete User</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete user <strong>{deleteModal.email}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={loading}
                className="px-4 py-2 bg-dark-700 text-gray-300 rounded hover:bg-dark-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move User Modal */}
      {moveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4 border border-dark-600">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Move User to Another Account</h3>
            <p className="text-gray-300 mb-4">
              Select the account to move <strong>{moveModal.email}</strong> to:
            </p>
            <select
              id="targetAccount"
              className="w-full bg-dark-700 text-gray-100 border border-dark-600 rounded px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-elysPink-500"
              onChange={(e) => {
                if (e.target.value) {
                  handleMoveUser(e.target.value);
                }
              }}
              defaultValue=""
            >
              <option value="">Select account...</option>
              {accounts
                .filter(acc => acc.accountId !== moveModal.currentAccountId)
                .map(acc => (
                  <option key={acc.accountId} value={acc.accountId}>
                    {acc.accountName}
                  </option>
                ))
              }
            </select>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setMoveModal(null)}
                disabled={loading}
                className="px-4 py-2 bg-dark-700 text-gray-300 rounded hover:bg-dark-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

