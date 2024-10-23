import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAsrama } from '../contexts/AsramaContext';
import { X, Plus } from 'lucide-react';

interface UserManagementProps {
  onUserAdded?: () => void;
}

// Gunakan tipe User yang sama dengan AuthContext
type UserRole = 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama';

interface User {
  id: string;
  username: string;
  role: UserRole;
  asramaId?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserAdded }) => {
  const { asramas } = useAsrama();
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [selectedAsrama, setSelectedAsrama] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { addUser, getUsers, updateUser, deleteUser } = useAuth();
  const [userForPasswordChange, setUserForPasswordChange] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Set default role berdasarkan currentUser.role
    if (currentUser?.role === 'admin_asrama') {
      setRole('pengasuh');
    } else {
      setRole('admin');
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const fetchedUsers = await getUsers();
    if (currentUser?.role === 'admin_asrama') {
      // Admin asrama hanya melihat pengasuh
      setUsers(fetchedUsers.filter(user => user.role === 'pengasuh'));
    } else {
      // Admin biasa tidak melihat admin_asrama dan pengasuh
      setUsers(fetchedUsers.filter(user => 
        user.role !== 'admin_asrama' && user.role !== 'pengasuh'
      ));
    }
  };

  // Fungsi untuk mendapatkan available roles berdasarkan current user role
  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin_asrama') {
      return [
        { value: 'pengasuh', label: 'Pengasuh' }
      ];
    }
    return [
      { value: 'admin', label: 'Admin' },
      { value: 'piket', label: 'Piket' },
      { value: 'wakil_kepala', label: 'Wakil Kepala' }
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(
          editingUser.id, 
          username, 
          password, 
          role,
          role === 'pengasuh' ? selectedAsrama : undefined
        );
      } else {
        await addUser(
          username, 
          password, 
          role,
          role === 'pengasuh' ? selectedAsrama : undefined
        );
      }
      alert('User berhasil ditambahkan/diperbarui');
      resetForm();
      fetchUsers();
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      alert('Gagal menambahkan/memperbarui user');
    }
    setIsModalOpen(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setRole(user.role);
    setSelectedAsrama(user.asramaId || '');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      try {
        await deleteUser(userId);
        alert('User berhasil dihapus');
        fetchUsers();
      } catch (error) {
        alert('Gagal menghapus user');
      }
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole('admin');
    setSelectedAsrama('');
    setEditingUser(null);
  };

  // Fungsi untuk mengganti password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userForPasswordChange) {
        await updateUser(
          userForPasswordChange.id,
          userForPasswordChange.username,
          newPassword,
          userForPasswordChange.role,
          userForPasswordChange.asramaId
        );
        alert('Password berhasil diperbarui');
        setNewPassword('');
        setIsChangePasswordModalOpen(false);
        setUserForPasswordChange(null);
      }
    } catch (error) {
      alert('Gagal memperbarui password');
    }
  };

  // Fungsi untuk membuka modal ganti password
  const openChangePasswordModal = (user: User) => {
    setUserForPasswordChange(user);
    setNewPassword('');
    setIsChangePasswordModalOpen(true);
  };

  // Fungsi untuk menentukan apakah user bisa mengganti password
  const canChangePassword = (targetUser: User) => {
    if (!currentUser) return false;
    // Admin tidak perlu tombol ganti password karena sudah ada di edit
    if (currentUser.role === 'admin') return false;
    // Admin asrama hanya bisa ganti password sendiri dan pengasuh
    if (currentUser.role === 'admin_asrama') {
      return targetUser.role === 'pengasuh' || targetUser.id === currentUser.id;
    }
    // User lain hanya bisa ganti password sendiri
    return targetUser.id === currentUser.id;
  };

  return (
    <div className="w-full">
      {/* Tombol tambah */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center text-base"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah User Baru
        </button>
      </div>

      {/* Modal Ganti Password */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                Ganti Password - {userForPasswordChange?.username}
              </h3>
              <button
                onClick={() => {
                  setIsChangePasswordModalOpen(false);
                  setUserForPasswordChange(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangePasswordModalOpen(false);
                      setUserForPasswordChange(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Hak Akses
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRole(newRole);
                      if (newRole !== 'pengasuh') {
                        setSelectedAsrama('');
                      }
                    }}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {getAvailableRoles().map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {role === 'pengasuh' && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Asrama
                    </label>
                    <select
                      value={selectedAsrama}
                      onChange={(e) => setSelectedAsrama(e.target.value)}
                      required={role === 'pengasuh'}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih Asrama</option>
                      {asramas.map((asrama) => (
                        <option key={asrama.id} value={asrama.id}>
                          {asrama.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  >
                    {editingUser ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              {currentUser?.role === 'admin_asrama' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asrama</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const userAsrama = asramas.find(a => a.id === user.asramaId);
              const canManageUser = currentUser?.role === 'admin' || 
                (currentUser?.role === 'admin_asrama' && user.role === 'pengasuh');

              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                  {currentUser?.role === 'admin_asrama' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userAsrama?.name || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    {canManageUser ? (
                      <>
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Delete
                        </button>
                      </>
                    ) : canChangePassword(user) && (
                      <button
                        onClick={() => openChangePasswordModal(user)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                      >
                        Ganti Password
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
