import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAsrama } from '../contexts/AsramaContext';
import { X, Plus } from 'lucide-react';
import { ref, get, onValue } from 'firebase/database';
import { db } from '../firebase';
import Alert from './Alert';
import ConfirmationModal from './ConfirmationModal';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';

interface UserManagementProps {
  onUserAdded?: () => void;
}

// Gunakan tipe User yang sama dengan AuthContext
type UserRole = 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  asramaId?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserAdded }) => {
  const { asramas } = useAsrama();
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState(''); // Tambah state
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
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [selectedAsramas, setSelectedAsramas] = useState<string[]>([]);

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

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setRole(currentUser?.role === 'admin_asrama' ? 'pengasuh' : 'admin');
    setSelectedAsrama('');
    setSelectedAsramas([]);
    setEditingUser(null);
    setIsModalOpen(false);
  };

  // Tambahkan fungsi untuk membuka modal tambah
  const openModal = () => {
    resetForm(); // Reset form terlebih dahulu
    setIsModalOpen(true); // Kemudian buka modal
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const needsAsrama = role === 'pengasuh' || role === 'admin_asrama';
      
      const asramaIdToUse = role === 'admin_asrama' ? selectedAsrama : 
                           role === 'pengasuh' ? selectedAsramas.join(',') : undefined;

      if (needsAsrama && (role === 'admin_asrama' ? !selectedAsrama : selectedAsramas.length === 0)) {
        showAlert({
          type: 'error',
          message: 'Asrama harus dipilih'
        });
        return;
      }

      if (editingUser) {
        const usersRef = ref(db, `users/${editingUser.id}`);
        const snapshot = await get(usersRef);
        const currentUserData = snapshot.val();
        
        if (!currentUserData) {
          throw new Error('User tidak ditemukan');
        }

        await updateUser(
          editingUser.id,
          username,
          password || currentUserData.password,
          fullName,
          role as UserRole,
          asramaIdToUse
        );

        // Update localStorage jika user yang diedit adalah user yang sedang login
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          if (currentUser.id === editingUser.id) {
            const updatedUser = {
              ...currentUser,
              username,
              fullName,
              role,
              asramaId: asramaIdToUse
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('storage')); // Trigger storage event untuk update state
          }
        }

        showAlert({
          type: 'success',
          message: 'User berhasil diperbarui',
          duration: 3000
        });
      } else {
        if (!password) {
          showAlert({
            type: 'error',
            message: 'Password harus diisi untuk user baru',
            duration: 3000
          });
          return;
        }

        await addUser(
          username,
          password,
          fullName,
          role as UserRole,
          asramaIdToUse
        );
        showAlert({
          type: 'success',
          message: 'User baru berhasil ditambahkan',
          duration: 3000
        });
      }

      await fetchUsers();
      resetForm();
      setIsModalOpen(false);
      
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      console.error('Error dalam handleSubmit:', error);
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menambahkan/memperbarui user',
        duration: 3000
      });
    }
  };

  // Update fungsi handleEdit
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.fullName);
    setRole(user.role);
    setPassword(''); // Reset password saat edit
    if (user.asramaId) {
      if (user.role === 'pengasuh') {
        setSelectedAsramas(user.asramaId.split(','));
      } else {
        setSelectedAsrama(user.asramaId);
      }
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus user ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteUser(userId);
        showAlert({
          type: 'success',
          message: 'User berhasil dihapus',
          duration: 3000
        });
        fetchUsers();
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus user',
          duration: 3000
        });
      }
    }
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
          userForPasswordChange.fullName,
          userForPasswordChange.role as UserRole,
          userForPasswordChange.asramaId
        );
        showAlert({
          type: 'success',
          message: 'Password berhasil diperbarui',
          duration: 3000
        });
        setNewPassword('');
        setIsChangePasswordModalOpen(false);
        setUserForPasswordChange(null);
      }
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal memperbarui password',
        duration: 3000
      });
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

  // Update fungsi untuk menampilkan field asrama
  const showAsramaField = (selectedRole: UserRole) => {
    return selectedRole === 'pengasuh' || selectedRole === 'admin_asrama';
  };

  // Tambahkan useEffect untuk auto refresh data
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, () => {
      fetchUsers();
    });

    return () => unsubscribe();
  }, []);

  // Tambahkan fungsi untuk format tampilan asrama
  const formatAsramaDisplay = (asramaId: string | undefined) => {
    if (!asramaId) return '-';
    
    // Jika ada multiple asrama (dipisahkan koma)
    if (asramaId.includes(',')) {
      const asramaIds = asramaId.split(',');
      return asramaIds
        .map(id => asramas.find(a => a.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }
    
    // Jika single asrama
    const asrama = asramas.find(a => a.id === asramaId);
    return asrama ? asrama.name : '-';
  };

  return (
    <div className="w-full">
      {/* Tambahkan Alert dan ConfirmationModal */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          duration={alert.duration}
          onClose={hideAlert}
        />
      )}
      
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

      {/* Tombol tambah */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={openModal} // Gunakan fungsi openModal yang baru
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah User
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
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                    {editingUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah password' : ''}
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
                      if (!showAsramaField(newRole)) {
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
                {showAsramaField(role) && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Asrama
                    </label>
                    {role === 'pengasuh' ? (
                      // Multiple select dengan button untuk pengasuh
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {asramas.map((asrama) => (
                          <button
                            key={asrama.id}
                            type="button"
                            onClick={() => {
                              if (selectedAsramas.includes(asrama.id)) {
                                setSelectedAsramas(prev => prev.filter(id => id !== asrama.id));
                              } else {
                                setSelectedAsramas(prev => [...prev, asrama.id]);
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              selectedAsramas.includes(asrama.id)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {asrama.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Single select untuk admin_asrama
                      <select
                        value={selectedAsrama}
                        onChange={(e) => setSelectedAsrama(e.target.value)}
                        required={role === 'admin_asrama'}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Asrama</option>
                        {asramas.map((asrama) => (
                          <option key={asrama.id} value={asrama.id}>
                            {asrama.name}
                          </option>
                        ))}
                      </select>
                    )}
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

      {/* Tabel dengan scroll horizontal */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <div className="min-w-[800px]"> {/* Minimum width untuk tabel */}
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
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
                // Hapus variabel userAsrama yang tidak digunakan
                const canManageUser = currentUser?.role === 'admin' || 
                  (currentUser?.role === 'admin_asrama' && user.role === 'pengasuh');

                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                    {currentUser?.role === 'admin_asrama' && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatAsramaDisplay(user.asramaId)}
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
    </div>
  );
};

export default UserManagement;
