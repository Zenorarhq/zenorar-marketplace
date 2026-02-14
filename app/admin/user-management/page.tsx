'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminRoute from '@/components/admin/AdminRoute'
import PermissionGate from '@/components/admin/PermissionGate'
import Icon from '@/components/ui/Icon'
import { usersApi, UsersListResponse } from '@/lib/api/users'
import { staffApi, StaffListResponse } from '@/lib/api/staff'
import { rolesApi, Role } from '@/lib/api/roles'

type Tab = 'users' | 'staff' | 'roles' | 'guest-purchases'

const tabs = [
  { id: 'users' as Tab, label: 'Users', icon: 'user', permission: 'view_users' },
  { id: 'staff' as Tab, label: 'Staff', icon: 'people', permission: 'view_staff' },
  { id: 'roles' as Tab, label: 'Roles', icon: 'shield', permission: 'manage_roles' },
  { id: 'guest-purchases' as Tab, label: 'Guest Purchases', icon: 'shopping-cart', permission: 'view_orders' },
]

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <AdminRoute requiredPermissions={['view_users', 'view_staff', 'manage_roles']}>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">User Management</h1>
            <p className="text-slate-400">Manage users, staff members, and roles</p>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-2 overflow-x-auto max-w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' as const }}>
              {tabs.map((tab) => (
                <PermissionGate key={tab.id} permission={tab.permission}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-primary text-black'
                        : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
                    }`}
                  >
                    <Icon name={tab.icon} size={18} />
                    {tab.label}
                  </button>
                </PermissionGate>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'guest-purchases' && <GuestPurchasesTab />}
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}

// Users Tab Component
function UsersTab() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' })
  const limit = 20

  const { data, isLoading } = useQuery<UsersListResponse>({
    queryKey: ['admin-users', currentPage, searchQuery],
    queryFn: async () => {
      const filters: any = {
        page: currentPage,
        limit,
        search: searchQuery || undefined,
        isStaff: false, // Only show customers, not staff
        role: 'VIEWER', // Only show VIEWER role (true customers)
      }
      const result = await usersApi.list(filters)
      if (result.success && result.data) return result.data
      throw new Error(result.error || 'Failed to load users')
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const result = await usersApi.getStats()
      return result.success && result.data ? result.data : null
    },
  })

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Delete user "${userName}"?`)) return
    const result = await usersApi.delete(userId)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] })
    } else {
      alert(result.error || 'Failed to delete user')
    }
  }

  async function handleBlock(user: any) {
    const reason = prompt('Reason for blocking (optional):')
    const result = await usersApi.block(user.id, reason || undefined)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert(`User ${user.name} has been blocked`)
    } else {
      alert(result.error || 'Failed to block user')
    }
  }

  async function handleUnblock(user: any) {
    const result = await usersApi.unblock(user.id)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      alert(`User ${user.name} has been unblocked`)
    } else {
      alert(result.error || 'Failed to unblock user')
    }
  }

  async function handlePasswordReset(user: any) {
    if (!confirm(`Send password reset email to ${user.email}?`)) return
    const result = await usersApi.sendPasswordReset(user.id)
    if (result.success) {
      alert(`Password reset email sent to ${user.email}`)
    } else {
      alert(result.error || 'Failed to send password reset email')
    }
  }

  function handleViewOrders(user: any) {
    setSelectedUser(user)
    setShowOrdersModal(true)
  }

  function handleEmailUser(user: any) {
    setSelectedUser(user)
    setShowEmailModal(true)
    setEmailForm({ subject: '', message: '' })
  }

  async function handleSendEmail() {
    if (!selectedUser || !emailForm.subject || !emailForm.message) {
      alert('Please fill in both subject and message')
      return
    }
    const result = await usersApi.sendEmail(selectedUser.id, emailForm.subject, emailForm.message)
    if (result.success) {
      alert(`Email sent to ${selectedUser.email}`)
      setShowEmailModal(false)
      setEmailForm({ subject: '', message: '' })
    } else {
      alert(result.error || 'Failed to send email')
    }
  }

  const users = data?.users || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: stats.totalCustomers, icon: 'user', color: 'blue' },
            { label: 'New Today', value: stats.newCustomersToday, icon: 'trending-up', color: 'green' },
            { label: 'Total Orders', value: stats.totalOrders, icon: 'shopping-cart', color: 'purple' },
            { label: 'Active Customers', value: stats.activeCustomers, icon: 'check', color: 'primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <Icon name={stat.icon} size={20} className={`text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-white text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="loading" size={24} className="text-primary animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#1a1a1a]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary text-sm font-medium">{user.name?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400' :
                          user.role === 'EDITOR' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                        }`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleViewOrders(user)} className="p-1.5 rounded hover:bg-blue-500/10 text-slate-400 hover:text-blue-400" title="View Orders">
                            <Icon name="shopping-cart" size={16} />
                          </button>
                          <button onClick={() => handleEmailUser(user)} className="p-1.5 rounded hover:bg-purple-500/10 text-slate-400 hover:text-purple-400" title="Email User">
                            <Icon name="mail" size={16} />
                          </button>
                          <button onClick={() => handlePasswordReset(user)} className="p-1.5 rounded hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-400" title="Send Password Reset">
                            <Icon name="lock" size={16} />
                          </button>
                          {(user as any).isBlocked ? (
                            <button onClick={() => handleUnblock(user)} className="p-1.5 rounded hover:bg-green-500/10 text-slate-400 hover:text-green-400" title="Unblock User">
                              <Icon name="check" size={16} />
                            </button>
                          ) : (
                            <button onClick={() => handleBlock(user)} className="p-1.5 rounded hover:bg-orange-500/10 text-slate-400 hover:text-orange-400" title="Block User">
                              <Icon name="close" size={16} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete">
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#1f1f1f] flex justify-between">
                <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.page === 1} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Orders Modal */}
      {showOrdersModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOrdersModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#1f1f1f] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Orders for {selectedUser.name}</h2>
              <button onClick={() => setShowOrdersModal(false)} className="text-slate-400 hover:text-white">
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="p-6">
              <UserOrdersList userId={selectedUser.id} />
            </div>
          </div>
        </div>
      )}

      {/* Email User Modal */}
      {showEmailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg max-w-2xl w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#1f1f1f] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Email {selectedUser.name}</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-white">
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">To</label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50 min-h-[200px]"
                  placeholder="Your message"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 rounded-lg bg-primary text-black font-medium hover:bg-primary/90"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// User Orders List Component
function UserOrdersList({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders', userId],
    queryFn: async () => {
      const result = await usersApi.getOrders(userId, 1, 10)
      return result.success && result.data ? result.data : null
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="loading" size={24} className="text-primary animate-spin" />
      </div>
    )
  }

  const orders = data?.orders || []

  if (orders.length === 0) {
    return <div className="text-center py-8 text-slate-400">No orders found</div>
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <div key={order.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-white font-medium">Order #{order.orderNumber}</p>
              <p className="text-slate-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">${Number(order.total).toFixed(2)}</p>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400' :
                order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400' :
                order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                'bg-yellow-500/10 text-yellow-400'
              }`}>{order.status}</span>
            </div>
          </div>
          <div className="space-y-2">
            {order.orderItems?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-300">{item.product?.name || item.name} x{item.quantity}</span>
                <span className="text-slate-400">${Number(item.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Staff Tab Component
function StaffTab() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', roleId: '' })
  const limit = 20

  const { data, isLoading } = useQuery<StaffListResponse>({
    queryKey: ['admin-staff', currentPage, searchQuery],
    queryFn: async () => {
      const result = await staffApi.list({ page: currentPage, limit, search: searchQuery || undefined })
      if (result.success && result.data) return result.data
      throw new Error(result.error || 'Failed to load staff')
    },
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const result = await rolesApi.list()
      return result.success && result.data ? result.data : []
    },
  })

  const { data: staffStats } = useQuery({
    queryKey: ['admin-staff-stats'],
    queryFn: async () => {
      const result = await staffApi.getStats()
      return result.success && result.data ? result.data : null
    },
  })

  async function handleCreate() {
    if (!newStaff.name || !newStaff.email || !newStaff.password) return alert('Fill required fields')
    const result = await staffApi.create(newStaff)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setShowCreateModal(false)
      setNewStaff({ name: '', email: '', password: '', roleId: '' })
    } else {
      alert(result.error || 'Failed to create staff')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete staff "${name}"?`)) return
    const result = await staffApi.delete(id)
    if (result.success) queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
    else alert(result.error || 'Failed to delete')
  }

  function handleEdit(member: any) {
    setSelectedStaff(member)
    setShowEditModal(true)
  }

  async function handleAssignRole(roleId: string | null) {
    if (!selectedStaff) return
    const result = await staffApi.assignRole(selectedStaff.id, roleId)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      queryClient.invalidateQueries({ queryKey: ['admin-staff-stats'] })
      setShowEditModal(false)
      alert('Staff role updated successfully')
    } else {
      alert(result.error || 'Failed to assign role')
    }
  }

  async function handleBlockStaff() {
    if (!selectedStaff) return
    const reason = prompt('Reason for blocking (optional):')
    const result = await usersApi.block(selectedStaff.id, reason || undefined)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setShowEditModal(false)
      alert(`${selectedStaff.name} has been blocked from login`)
    } else {
      alert(result.error || 'Failed to block user')
    }
  }

  async function handleUnblockStaff() {
    if (!selectedStaff) return
    const result = await usersApi.unblock(selectedStaff.id)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
      setShowEditModal(false)
      alert(`${selectedStaff.name} has been unblocked`)
    } else {
      alert(result.error || 'Failed to unblock user')
    }
  }

  async function handlePasswordReset() {
    if (!selectedStaff) return
    if (!confirm(`Send password reset email to ${selectedStaff.email}?`)) return
    const result = await usersApi.sendPasswordReset(selectedStaff.id)
    if (result.success) {
      alert(`Password reset email sent to ${selectedStaff.email}`)
    } else {
      alert(result.error || 'Failed to send password reset email')
    }
  }

  const staff = data?.staff || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      {staffStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: staffStats.totalStaff, icon: 'people', color: 'blue' },
            { label: 'Admins', value: staffStats.adminCount, icon: 'shield', color: 'red' },
            { label: 'Editors', value: staffStats.editorCount, icon: 'edit', color: 'green' },
            { label: 'With Custom Roles', value: staffStats.staffWithRolesCount, icon: 'key', color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <Icon name={stat.icon} size={20} className={`text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-white text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <div></div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
          <Icon name="add" size={20} />Add Staff
        </button>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search staff..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50" />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-12"><Icon name="loading" size={24} className="text-primary animate-spin" /></div> :
        staff.length === 0 ? <div className="text-center py-12 text-slate-400">No staff found</div> : (
          <>
            <table className="w-full">
              <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Staff Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary text-sm font-medium">{member.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-white font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        member.role === 'ADMIN' ? 'bg-red-500/10 text-red-400' :
                        member.role === 'EDITOR' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>{member.role}</span>
                    </td>
                    <td className="px-4 py-3">{member.staffRole ? <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400">{member.staffRole.name}</span> : <span className="text-slate-500 text-sm">No role</span>}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(member)} className="p-1.5 rounded hover:bg-primary/10 text-slate-400 hover:text-primary" title="Edit">
                          <Icon name="edit" size={16} />
                        </button>
                        <button onClick={() => handleDelete(member.id, member.name)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete">
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#1f1f1f] flex justify-between">
                <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.page === 1} className="px-3 py-1.5 rounded bg-[#1a1a1a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages} className="px-3 py-1.5 rounded bg-[#1a1a1a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Add Staff</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-2">Name *</label><input type="text" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm text-slate-400 mb-2">Email *</label><input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm text-slate-400 mb-2">Password *</label><input type="password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm text-slate-400 mb-2">Role</label><select value={newStaff.roleId} onChange={(e) => setNewStaff({ ...newStaff, roleId: e.target.value })} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50"><option value="">No role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90">Create</button>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#2a2a2a]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Edit Staff: {selectedStaff.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Staff Role</label>
                <select
                  defaultValue={selectedStaff.staffRole?.id || ''}
                  onChange={(e) => handleAssignRole(e.target.value || null)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="">No custom role</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">Assign a custom staff role with specific permissions</p>
              </div>

              <div className="border-t border-[#2a2a2a] pt-4">
                <label className="block text-sm text-slate-400 mb-3">Password Reset</label>
                <button onClick={handlePasswordReset} className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg font-medium hover:bg-[#2a2a2a] flex items-center justify-center gap-2">
                  <Icon name="mail" size={16} />
                  Send Password Reset Email
                </button>
                <p className="text-xs text-slate-500 mt-1">User will receive an email to set a new password</p>
              </div>

              <div className="border-t border-[#2a2a2a] pt-4">
                <label className="block text-sm text-slate-400 mb-3">Access Control</label>
                {selectedStaff.isBlocked ? (
                  <button onClick={handleUnblockStaff} className="w-full px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg font-medium hover:bg-green-500/20 flex items-center justify-center gap-2">
                    <Icon name="check" size={16} />
                    Unblock User
                  </button>
                ) : (
                  <button onClick={handleBlockStaff} className="w-full px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/20 flex items-center justify-center gap-2">
                    <Icon name="ban" size={16} />
                    Block from Login
                  </button>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {selectedStaff.isBlocked ? 'This user is currently blocked from logging in' : 'Prevent this user from accessing the system'}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2a2a2a]">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#2a2a2a]">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Roles Tab Component
function RolesTab() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', description: '', permissionIds: [] as string[] })

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const result = await rolesApi.list()
      return result.success && result.data ? result.data : []
    },
  })

  const { data: permissionsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const result = await rolesApi.getPermissions()
      return result.success && result.data ? result.data : null
    },
  })

  async function handleCreate() {
    if (!newRole.name) return alert('Enter role name')
    const result = await rolesApi.create(newRole)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      setShowCreateModal(false)
      setNewRole({ name: '', description: '', permissionIds: [] })
    } else {
      alert(result.error || 'Failed to create role')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"?`)) return
    const result = await rolesApi.delete(id)
    if (result.success) queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    else alert(result.error || 'Failed to delete')
  }

  const permissionsByCategory = permissionsData?.byCategory || {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div></div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
          <Icon name="add" size={20} />Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-full flex items-center justify-center py-12"><Icon name="loading" size={24} className="text-primary animate-spin" /></div> :
        roles.length === 0 ? <div className="col-span-full text-center py-12 text-slate-400">No roles found</div> :
        roles.map((role) => (
          <div key={role.id} className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4 hover:border-primary/30">
            <div className="flex justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="shield" size={20} className="text-primary" /></div>
                <div><h3 className="text-white font-semibold">{role.name}</h3><p className="text-xs text-slate-400">{role._count?.users || 0} users</p></div>
              </div>
              <button onClick={() => handleDelete(role.id, role.name)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete"><Icon name="delete" size={16} /></button>
            </div>
            {role.description && <p className="text-sm text-slate-400 mb-3">{role.description}</p>}
            <div className="flex items-center gap-2 text-xs text-slate-500"><Icon name="key" size={14} /><span>{role.permissions?.length || 0} permissions</span></div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Create Role</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-2">Name *</label><input type="text" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g., Content Manager" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm text-slate-400 mb-2">Description</label><textarea value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder="Describe this role..." rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-white focus:outline-none focus:border-primary/50" /></div>
              <div><label className="block text-sm text-slate-400 mb-3">Permissions</label>
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                      <h4 className="text-white font-medium mb-2 capitalize">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((permission: any) => (
                          <label key={permission.id} className="flex items-start gap-2 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded">
                            <input type="checkbox" checked={newRole.permissionIds.includes(permission.id)} onChange={() => setNewRole(prev => ({ ...prev, permissionIds: prev.permissionIds.includes(permission.id) ? prev.permissionIds.filter(id => id !== permission.id) : [...prev.permissionIds, permission.id] }))} className="mt-0.5" />
                            <div><p className="text-white text-sm">{permission.name}</p>{permission.description && <p className="text-xs text-slate-500">{permission.description}</p>}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90">Create</button>
                <button onClick={() => { setShowCreateModal(false); setNewRole({ name: '', description: '', permissionIds: [] }) }} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#2a2a2a]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Guest Purchases Tab Component
function GuestPurchasesTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['guest-orders', currentPage, searchQuery],
    queryFn: async () => {
      const filters: any = { page: currentPage, limit, search: searchQuery || undefined }
      const result = await usersApi.getGuestOrders(filters)
      return result.success && result.data ? result.data : null
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['guest-order-stats'],
    queryFn: async () => {
      const result = await usersApi.getGuestOrderStats()
      return result.success && result.data ? result.data : null
    },
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Guest Orders', value: stats.totalGuestOrders, icon: 'shopping-cart', color: 'blue' },
            { label: 'Today', value: stats.guestOrdersToday, icon: 'trending-up', color: 'green' },
            { label: 'Total Revenue', value: `$${Number(stats.totalGuestRevenue).toFixed(2)}`, icon: 'wallet', color: 'primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                  <Icon name={stat.icon} size={20} className={`text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-white text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by email or order number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="loading" size={24} className="text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No guest orders found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Order Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Guest Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-[#1a1a1a]">
                      <td className="px-4 py-3 text-white font-medium">#{order.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-400">{order.email}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400' :
                          order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400' :
                          order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{order.orderItems?.length || 0} items</td>
                      <td className="px-4 py-3 text-right text-white font-medium">${Number(order.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#1f1f1f] flex justify-between">
                <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.page === 1} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
