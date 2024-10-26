import { User, ChevronDown, LogOut, UserCog, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConfirmation from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import useAlert from '../hooks/useAlert';
import Alert from './Alert'; // Tambahkan import Alert

const Header = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const { alert, showAlert, hideAlert } = useAlert();

  // State untuk form edit profile
  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    oldPassword: '',
    password: ''
  });

  // Update editForm ketika user berubah
  useEffect(() => {
    if (user) {
      setEditForm(prev => ({
        ...prev,
        fullName: user.fullName,
        username: user.username
      }));
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Tambahkan useEffect untuk handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest('[data-dropdown]')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Update handleEditProfile
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validasi password jika diisi
      if (editForm.password) {
        if (editForm.password.length < 6) {
          showAlert({
            type: 'error',
            message: 'Password baru minimal 6 karakter'
          });
          return;
        }

        if (!editForm.oldPassword) {
          showAlert({
            type: 'error',
            message: 'Password lama harus diisi untuk mengubah password'
          });
          return;
        }

        if (editForm.oldPassword === editForm.password) {
          showAlert({
            type: 'error',
            message: 'Password baru tidak boleh sama dengan password lama'
          });
          return;
        }
      }

      // Update user data
      await updateUser(
        user.id,
        editForm.username,
        editForm.password ? {
          oldPassword: editForm.oldPassword,
          newPassword: editForm.password,
          requireOldPassword: true
        } : null,
        editForm.fullName,
        user.role,
        user.barakId
      );

      // Reset form password fields
      setEditForm(prev => ({
        ...prev,
        oldPassword: '',
        password: ''
      }));

      // Tutup modal
      setIsEditProfileOpen(false);

      // Simpan password baru ke localStorage jika password diubah
      if (editForm.password) {
        localStorage.setItem('tempPassword', editForm.password);
      }

      showAlert({
        type: 'success',
        message: 'Profil berhasil diperbarui'
      });

    } catch (error) {
      console.error('Gagal memperbarui profil:', error);
      if (error instanceof Error) {
        showAlert({
          type: 'error',
          message: error.message
        });
      } else {
        showAlert({
          type: 'error',
          message: 'Gagal memperbarui profil. Silakan coba lagi.'
        });
      }
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  
  // Update fungsi logout untuk membersihkan tempPassword
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal'
    });

    if (confirmed) {
      localStorage.removeItem('tempPassword'); // Hapus tempPassword saat logout
      await logout();
      navigate('/login');
    }
  };

  // Tambahkan state untuk show/hide password
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="w-full mx-auto px-2 sm:px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Date and Time Section - Responsive untuk semua ukuran */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-1 xs:space-y-0 xs:space-x-2 text-gray-600 text-xs sm:text-sm">
            <span className="font-medium">{formatDate(currentDateTime)}</span>
            <span className="hidden xs:block text-gray-400">|</span>
            <span className="font-medium text-blue-600">{formatTime(currentDateTime)}</span>
          </div>

          {/* User Profile Section - Responsive untuk semua ukuran */}
          <div className="relative">
            <button
              data-dropdown
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 sm:space-x-3 py-2 px-2 sm:px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="hidden xs:block text-right">
                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
                  {user?.fullName}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </button>

            {isDropdownOpen && (
              <div 
                data-dropdown
                className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-200"
              >
                <div className="px-3 sm:px-4 py-2 border-b xs:hidden">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditProfileOpen(true);
                    setIsDropdownOpen(false);
                    setEditForm({
                      fullName: user?.fullName || '',
                      username: user?.username || '',
                      oldPassword: '',
                      password: ''
                    });
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <UserCog size={16} />
                  <span>Edit Profil</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal - Responsive */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-2">
          <div className="min-h-screen px-2 sm:px-4 text-center">
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-[95%] sm:max-w-md p-4 sm:p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Edit Profil</h3>
                <button
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    disabled
                    className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Password Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Lama
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={editForm.oldPassword}
                      onChange={(e) => setEditForm({ ...editForm, oldPassword: e.target.value })}
                      className="w-full p-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Baru (kosongkan jika tidak diubah)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full p-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
    </header>
  );
};

export default Header;
