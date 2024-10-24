import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBarak } from '../contexts/BarakContext';
import { X, Plus } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { UserRole, Barak } from '../types'; // Hapus import User, gunakan dari AuthContext
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

interface UserManagementProps {
  onUserAdded?: () => void;
}

// Gunakan tipe User dari AuthContext
type User = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  barakId?: string;
  email: string;
  isDefaultAccount?: boolean;
};

const UserManagement: React.FC<UserManagementProps> = ({ onUserAdded }) => {
  const { baraks } = useBarak(); // Rename untuk kejelasan
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { addUser, getUsers, updateUser, deleteUser } = useAuth();
  const [userForPasswordChange, setUserForPasswordChange] = useState<User | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [selectedBaraks, setSelectedBaraks] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Set default role berdasarkan currentUser.role
    if (currentUser?.role === 'admin_asrama') {
      setRole('pengasuh');
    } else if (currentUser?.role === 'admin') {
      setRole('admin');
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const fetchedUsers = await getUsers();
    if (currentUser?.role === 'admin_asrama') {
      // Admin asrama melihat pengasuh dan admin_asrama lain
      setUsers(
        fetchedUsers.filter((user) => 
          ['pengasuh', 'admin_asrama'].includes(user.role) &&
          user.id !== currentUser?.id
        ) as User[]
      );
    } else if (currentUser?.role === 'admin') {
      // Admin biasa melihat admin, piket, dan wakil_kepala
      setUsers(
        fetchedUsers.filter((user) => 
          ['admin', 'piket', 'wakil_kepala'].includes(user.role) &&
          user.id !== currentUser?.id && 
          !user.username.match(/^(admin)$/)
        ) as User[]
      );
    }
  };

  // Update fungsi getAvailableRoles
  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin_asrama') {
      return [
        { value: 'admin_asrama' as UserRole, label: 'Admin Asrama' },
        { value: 'pengasuh' as UserRole, label: 'Pengasuh' }
      ];
    }
    if (currentUser?.role === 'admin') {
      return [
        { value: 'admin' as UserRole, label: 'Admin' },
        { value: 'piket' as UserRole, label: 'Piket' },
        { value: 'wakil_kepala' as UserRole, label: 'Wakil Kepala' }
      ];
    }
    return [];
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setRole(currentUser?.role === 'admin_barak' ? 'pengasuh' : 'admin');
    setSelectedBaraks([]);
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
      const needsBarak = role === 'pengasuh' || role === 'admin_barak';
      
      const barakIdToUse = needsBarak ? selectedBaraks.join(',') : undefined;

      if (needsBarak && selectedBaraks.length === 0) {
        showAlert({
          type: 'error',
          message: `Pilih minimal satu barak untuk ${role === 'pengasuh' ? 'pengasuh' : 'admin barak'}`
        });
        return;
      }

      // Validasi untuk admin_barak yang menambah pengasuh
      if (currentUser?.role === 'admin_barak' && role === 'pengasuh') {
        const adminBarakIds = currentUser.barakId?.split(',') || [];
        const hasAccess = selectedBaraks.every(id => adminBarakIds.includes(id));
        if (!hasAccess) {
          showAlert({
            type: 'error',
            message: 'Anda hanya dapat menambahkan pengasuh untuk barak yang Anda kelola'
          });
          return;
        }
      }

      if (editingUser) {
        await updateUser(
          editingUser.id,
          username,
          password || null,
          fullName,
          role,
          barakIdToUse
        );
        showAlert({
          type: 'success',
          message: 'User berhasil diperbarui'
        });
      } else {
        if (!password) {
          showAlert({
            type: 'error',
            message: 'Password harus diisi untuk user baru'
          });
          return;
        }

        await addUser(
          username,
          password,
          fullName,
          role,
          barakIdToUse
        );
        showAlert({
          type: 'success',
          message: 'User baru berhasil ditambahkan'
        });
      }

      resetForm();
      await fetchUsers();
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menyimpan data user'
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
    if (user.barakId) {
      setSelectedBaraks(user.barakId.split(','));
    } else {
      setSelectedBaraks([]);
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
          userForPasswordChange.barakId
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
    if (currentUser.role === 'admin') return false;
    if (currentUser.role === 'admin_asrama') {
      return targetUser.role === 'pengasuh' || targetUser.id === currentUser.id;
    }
    return targetUser.id === currentUser.id;
  };

  // Update fungsi showBarakField
  const showBarakField = (selectedRole: UserRole) => {
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

  // Update fungsi getBarakName
  const getBarakName = (barakId: string | undefined) => {
    if (!barakId) return '-';
    
    if (barakId.includes(',')) {
      const barakIds = barakId.split(',');
      return barakIds
        .map((id: string) => baraks.find((b: Barak) => b.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }
    
    const barak = baraks.find((b: Barak) => b.id === barakId);
    return barak ? barak.name : '-';
  };

  // Update fungsi canManageUser
  const canManageUser = (user: User) => {
    if (!currentUser) return false;
    
    if (currentUser.role === 'admin_asrama') {
      return ['pengasuh', 'admin_asrama'].includes(user.role);
    }
    
    if (currentUser.role === 'admin') {
      return ['admin', 'piket', 'wakil_kepala'].includes(user.role);
    }
    
    return false;
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
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
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

                <div className="bg-white p-4 rounded-lg border border-gray-200">
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

                <div className="bg-white p-4 rounded-lg border border-gray-200">
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

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Hak Akses
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {getAvailableRoles().map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRole(value)}
                        className={`p-3 rounded-lg transition-colors ${
                          role === value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {showBarakField(role) && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      {role === 'pengasuh' ? 'Barak yang Diawasi' : 'Barak yang Dikelola'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {baraks.map((barak) => (
                        <button
                          key={barak.id}
                          type="button"
                          onClick={() => {
                            if (selectedBaraks.includes(barak.id)) {
                              setSelectedBaraks(prev => prev.filter(id => id !== barak.id));
                            } else {
                              setSelectedBaraks(prev => [...prev, barak.id]);
                            }
                          }}
                          className={`p-3 rounded-lg transition-colors ${
                            selectedBaraks.includes(barak.id)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {barak.name}
                        </button>
                      ))}
                    </div>
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
                {(currentUser?.role === 'admin_barak' || currentUser?.role === 'admin_asrama') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barak</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                  {(currentUser?.role === 'admin_barak' || currentUser?.role === 'admin_asrama') && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getBarakName(user.barakId)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    {canManageUser(user) ? (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
