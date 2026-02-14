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

type Tab = 'users' | 'staff' | 'roles'

const tabs = [
  { id: 'users' as Tab, label: 'Users', icon: 'user', permission: 'view_users' },
  { id: 'staff' as Tab, label: 'Staff', icon: 'people', permission: 'view_staff' },
  { id: 'roles' as Tab, label: 'Roles', icon: 'shield', permission: 'manage_roles' },
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
          <div className="border-b border-[#1f1f1f]">
            <div className="flex gap-6">
              {tabs.map((tab) => (
                <PermissionGate key={tab.id} permission={tab.permission}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon name={tab.icon} size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                </PermissionGate>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'roles' && <RolesTab />}
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
  const [selectedRole, setSelectedRole] = useState('all')
  const limit = 20

  const { data, isLoading } = useQuery<UsersListResponse>({
    queryKey: ['admin-users', currentPage, searchQuery, selectedRole],
    queryFn: async () => {
      const filters: any = { page: currentPage, limit, search: searchQuery || undefined }
      if (selectedRole !== 'all') filters.role = selectedRole
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

  const users = data?.users || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: 'user', color: 'blue' },
            { label: 'New Today', value: stats.newUsersToday, icon: 'trending-up', color: 'green' },
            { label: 'Staff', value: stats.staffCount, icon: 'people', color: 'purple' },
            { label: 'Customers', value: stats.customerCount, icon: 'shopping-cart', color: 'primary' },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1) }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Roles</option>
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
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
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isStaff ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400'
                        }`}>{user.isStaff ? 'Staff' : 'Customer'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete">
                          <Icon name="delete" size={16} />
                        </button>
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
    </div>
  )
}

// Staff Tab Component
function StaffTab() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  const staff = data?.staff || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
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
                    <td className="px-4 py-3">{member.staffRole ? <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400">{member.staffRole.name}</span> : <span className="text-slate-500 text-sm">No role</span>}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(member.id, member.name)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete">
                        <Icon name="delete" size={16} />
                      </button>
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
