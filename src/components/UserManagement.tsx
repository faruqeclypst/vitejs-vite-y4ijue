import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBarak } from '../contexts/BarakContext';
import { X, Plus, Search, Edit, Trash2, Key, Users, Eye, EyeOff } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { UserRole, Barak } from '../types';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';
import { User } from '../contexts/AuthContext';

interface UserManagementProps {
  onUserAdded?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserAdded }) => {
  const { baraks } = useBarak();
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
  const [searchTerm, setSearchTerm] = useState('');
  const [openBarakDropdown, setOpenBarakDropdown] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(''); // Tambah state untuk username

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Set default role berdasarkan currentUser.role
    if (currentUser?.role === 'admin_master') {
      setRole('admin');
    } else if (currentUser?.role === 'admin_asrama') {
      setRole('pengasuh');
    } else if (currentUser?.role === 'admin') {
      setRole('admin');
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const fetchedUsers = await getUsers();
    if (currentUser?.role === 'admin_master') {
      setUsers(
        fetchedUsers.filter((user) => 
          user.id !== currentUser?.id && user.role !== 'admin_master'
        )
      );
    } else if (currentUser?.role === 'admin_asrama') {
      setUsers(
        fetchedUsers.filter((user) => 
          ['pengasuh', 'admin_asrama'].includes(user.role) &&
          user.id !== currentUser?.id
        )
      );
    } else if (currentUser?.role === 'admin') {
      setUsers(
        fetchedUsers.filter((user) => 
          ['admin', 'piket', 'wakil_kepala'].includes(user.role) &&
          user.id !== currentUser?.id && 
          !user.username.match(/^(admin)$/)
        )
      );
    }
  };

  // Update fungsi getAvailableRoles
  const getAvailableRoles = () => {
    if (currentUser?.role === ('admin_master' as UserRole)) {
      return [
        { value: 'admin' as UserRole, label: 'Admin' },
        { value: 'admin_asrama' as UserRole, label: 'Admin Asrama' },
        { value: 'piket' as UserRole, label: 'Piket' },
        { value: 'wakil_kepala' as UserRole, label: 'Wakil Kepala' },
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
    if (currentUser?.role === 'admin_asrama') {
      return [
        { value: 'admin_asrama' as UserRole, label: 'Admin Asrama' },
        { value: 'pengasuh' as UserRole, label: 'Pengasuh' }
      ];
    }
    return [];
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setFullName('');
    if (currentUser?.role === 'admin_master') {
      setRole('admin');
    } else if (currentUser?.role === 'admin_asrama') {
      setRole('pengasuh');
    } else if (currentUser?.role === 'admin') {
      setRole('admin');
    }
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
      // Validasi form
      if (!email || !email.includes('@')) {
        showAlert({
          type: 'error',
          message: 'Format email tidak valid'
        });
        return;
      }

      if (!username || username.length < 3) {
        showAlert({
          type: 'error',
          message: 'Username minimal 3 karakter'
        });
        return;
      }

      if (username.includes('@')) {
        showAlert({
          type: 'error',
          message: 'Username tidak boleh mengandung karakter @'
        });
        return;
      }

      if (!editingUser && (!password || password.length < 6)) {
        showAlert({
          type: 'error',
          message: 'Password minimal 6 karakter'
        });
        return;
      }

      if (!fullName.trim()) {
        showAlert({
          type: 'error',
          message: 'Nama lengkap harus diisi'
        });
        return;
      }

      // Validasi role
      if (!role) {
        showAlert({
          type: 'error',
          message: 'Hak akses harus dipilih'
        });
        return;
      }

      // Validasi barak untuk pengasuh
      const needsBarak = role === 'pengasuh';
      const barakIdToUse = needsBarak ? selectedBaraks.join(',') : undefined;

      if (needsBarak && selectedBaraks.length === 0) {
        showAlert({
          type: 'error',
          message: 'Pilih minimal satu barak untuk pengasuh'
        });
        return;
      }

      setIsLoading(true);

      if (editingUser) {
        await updateUser(
          editingUser.id,
          email,
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
        await addUser(email, username, password, fullName, role, barakIdToUse);
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
      console.error('Submit error:', error);
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menyimpan data user'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update fungsi handleEdit
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setUsername(user.username);
    setFullName(user.fullName);
    setRole(user.role);
    setPassword('');
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

  // Update fungsi handleChangePassword
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!userForPasswordChange) return;

      if (newPassword.length < 6) {
        showAlert({
          type: 'error',
          message: 'Password minimal 6 karakter'
        });
        return;
      }

      setIsLoading(true);

      await updateUser(
        userForPasswordChange.id,
        userForPasswordChange.username,
        newPassword, // Ubah ini
        userForPasswordChange.fullName,
        userForPasswordChange.role,
        userForPasswordChange.barakId
      );

      setNewPassword('');
      setIsChangePasswordModalOpen(false);
      setUserForPasswordChange(null);

      showAlert({
        type: 'success',
        message: 'Password berhasil diperbarui'
      });

    } catch (error) {
      console.error('Change password error:', error);
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal memperbarui password'
      });
    } finally {
      setIsLoading(false);
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
    // Tampilkan field barak untuk pengasuh dan info untuk admin_asrama
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

  // Update fungsi canManageUser
  const canManageUser = (user: User) => {
    if (!currentUser) return false;
    
    // Admin master dapat mengelola semua user kecuali admin master lain
    if (currentUser.role === ('admin_master' as UserRole)) {
      return user.role !== ('admin_master' as UserRole);
    }
    
    // Admin dapat mengelola admin, piket, dan wakil kepala
    if (currentUser.role === 'admin') {
      return ['admin', 'piket', 'wakil_kepala'].includes(user.role) &&
        !user.username.match(/^(admin)$/);
    }
    
    // Admin asrama dapat mengelola admin asrama dan pengasuh
    if (currentUser.role === 'admin_asrama') {
      return ['admin_asrama', 'pengasuh'].includes(user.role);
    }
    
    return false;
  };

  // Update komponen BarakDropdown
  const BarakDropdown = ({ barakId, userName }: { barakId: string | undefined, userName: string }) => {
    const [showModal, setShowModal] = useState(false);

    if (!barakId && currentUser?.role === 'admin_asrama') {
      return (
        <div className="relative">
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Lihat {baraks.length} Barak
          </button>
          
          {/* Modal untuk admin asrama */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Barak</h3>
                    <p className="text-sm text-gray-600">{userName}</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  {baraks.map((barak) => (
                    <div
                      key={barak.id}
                      className={`p-3 rounded-lg text-white font-medium ${
                        barak.gender === 'Laki-laki' 
                          ? 'bg-blue-500' 
                          : 'bg-pink-500'
                      }`}
                    >
                      {barak.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (!barakId) return <span className="text-gray-400">-</span>;

    const barakList = barakId.split(',').map(id => 
      baraks.find((b: Barak) => b.id === id)
    ).filter(Boolean);

    if (barakList.length === 0) return <span className="text-gray-400">-</span>;

    return (
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Lihat {barakList.length} Barak
        </button>
        
        {/* Modal on Click */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Daftar Barak</h3>
                  <p className="text-sm text-gray-600">{userName}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {barakList.map((barak, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-white font-medium ${
                      barak?.gender === 'Laki-laki' 
                        ? 'bg-blue-500' 
                        : 'bg-pink-500'
                    }`}
                  >
                    {barak?.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tambahkan event listener untuk menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openBarakDropdown && !(event.target as Element).closest('.barak-dropdown')) {
        setOpenBarakDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openBarakDropdown]);

  return (
    <div className="space-y-4"> {/* Kurangi spacing */}
      {/* Alert dan ConfirmationModal */}
      {alert && <Alert type={alert.type} message={alert.message} onClose={hideAlert} />}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title ?? ''} // Gunakan nullish coalescing untuk memastikan selalu ada nilai string
        message={options?.message ?? ''} // Gunakan nullish coalescing untuk memastikan selalu ada nilai string
        confirmText={options?.confirmText ?? 'Konfirmasi'} // Berikan nilai default
        cancelText={options?.cancelText ?? 'Batal'} // Berikan nilai default
      />

      {/* Header dengan Search dan Add */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border rounded-lg"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
        <button
          onClick={openModal}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah User</span>
        </button>
      </div>

      {/* Table/Card View */}
      <div className="overflow-x-auto">
        {/* Desktop View */}
        <div className="hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                {(currentUser?.role === 'admin_barak' || currentUser?.role === 'admin_asrama') && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barak</th>
                )}
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{user.fullName}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{user.username}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  {(currentUser?.role === 'admin_barak' || currentUser?.role === 'admin_asrama') && (
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      <BarakDropdown barakId={user.barakId} userName={user.fullName} />
                    </td>
                  )}
                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-1">
                    {canManageUser(user) ? (
                      <>
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : canChangePassword(user) && (
                      <button
                        onClick={() => openChangePasswordModal(user)}
                        className="text-green-500 hover:text-green-700 p-1"
                      >
                        <Key size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-2">
          {users.map((user) => (
            <div key={user.id} className="bg-white p-3 rounded-lg shadow-sm border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                    {(currentUser?.role === 'admin_barak' || currentUser?.role === 'admin_asrama') && (
                      <BarakDropdown barakId={user.barakId} userName={user.fullName} />
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {canManageUser(user) ? (
                    <>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : canChangePassword(user) && (
                    <button
                      onClick={() => openChangePasswordModal(user)}
                      className="p-1.5 text-green-500 hover:bg-green-50 rounded-full"
                    >
                      <Key size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="text-center py-6">
          <Users className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada pengguna</h3>
          <p className="mt-1 text-sm text-gray-500">
            Mulai dengan menambahkan pengguna baru
          </p>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-[1000px] rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    {editingUser ? 'Edit User' : 'Tambah User Baru'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Kolom Kiri */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          {!editingUser && (
                            <span className="text-xs text-gray-500 italic">
                              * Pastikan email benar-benar ada / tersedia
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Masukkan email"
                          disabled={editingUser !== null}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase())}
                          required
                          minLength={3}
                          className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Minimal 3 karakter"
                          disabled={editingUser !== null}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {editingUser ? 'Password Baru (opsional)' : 'Password'}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!editingUser}
                            className="w-full p-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Kolom Kanan */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hak Akses
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {getAvailableRoles().map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRole(value)}
                              className={`p-2.5 rounded-lg transition-colors ${
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
                    </div>
                  </div>

                  {/* Barak Selection - Full Width */}
                  {showBarakField(role) && (
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {role === 'pengasuh' ? 'Barak yang Diawasi' : 'Hak Akses Barak'}
                      </label>
                      {role === 'admin_asrama' ? (
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Users size={20} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-blue-900">Admin Asrama</p>
                                <p className="text-sm text-blue-700">
                                  Dapat mengelola seluruh barak yang tersedia
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {baraks.map((barak) => (
                                <div
                                  key={barak.id}
                                  className={`p-4 rounded-lg ${
                                    barak.gender === 'Laki-laki'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-pink-500 text-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{barak.name}</p>
                                      <p className="text-sm opacity-90">{barak.gender}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Bagian untuk pengasuh tetap sama
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {baraks.map((barak) => (
                              <div
                                key={barak.id}
                                onClick={() => {
                                  if (selectedBaraks.includes(barak.id)) {
                                    setSelectedBaraks(prev => prev.filter(id => id !== barak.id));
                                  } else {
                                    setSelectedBaraks(prev => [...prev, barak.id]);
                                  }
                                }}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                  selectedBaraks.includes(barak.id)
                                    ? barak.gender === 'Laki-laki'
                                      ? 'bg-blue-500 text-white border-blue-600'
                                      : 'bg-pink-500 text-white border-pink-600'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={`font-medium ${selectedBaraks.includes(barak.id) ? 'text-white' : 'text-gray-900'}`}>
                                      {barak.name}
                                    </p>
                                    <p className={`text-sm ${selectedBaraks.includes(barak.id) ? 'text-white opacity-90' : 'text-gray-500'}`}>
                                      {barak.gender}
                                    </p>
                                  </div>
                                  {role === 'pengasuh' && (
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      selectedBaraks.includes(barak.id)
                                        ? 'border-white bg-white'
                                        : 'border-gray-300'
                                    }`}>
                                      {selectedBaraks.includes(barak.id) && (
                                        <svg className={`w-3 h-3 ${
                                          barak.gender === 'Laki-laki' ? 'text-blue-500' : 'text-pink-500'
                                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      {editingUser ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ganti Password */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => {
            setIsChangePasswordModalOpen(false);
            setUserForPasswordChange(null);
          }}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-[600px] rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Ganti Password - {userForPasswordChange?.username}
                  </h3>
                  <button
                    onClick={() => {
                      setIsChangePasswordModalOpen(false);
                      setUserForPasswordChange(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full p-2.5 pr-10 text-sm border rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangePasswordModalOpen(false);
                        setUserForPasswordChange(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      disabled={isLoading}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2
                        ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Simpan'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
