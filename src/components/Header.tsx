import { User, ChevronDown, LogOut, UserCog, X, Upload, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConfirmation from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';

const Header = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // State untuk form edit profile
  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    password: '',
    currentPassword: '' // Tambah ini
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

  // Load profile image on component mount
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user]);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal'
    });

    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validasi password baru jika diisi
      if (editForm.password) {
        // Validasi password lama harus diisi
        if (!editForm.currentPassword) {
          showAlert({
            type: 'error',
            message: 'Password lama harus diisi untuk mengubah password'
          });
          return;
        }

        // Validasi panjang password minimal
        if (editForm.password.length < 6) {
          showAlert({
            type: 'error',
            message: 'Password baru minimal 6 karakter'
          });
          return;
        }

        // Validasi password baru tidak boleh sama dengan password lama
        if (editForm.password === editForm.currentPassword) {
          showAlert({
            type: 'error',
            message: 'Password baru tidak boleh sama dengan password lama'
          });
          return;
        }
      }

      await updateUser(
        user.id,
        editForm.username,
        editForm.password || null,
        editForm.fullName,
        user.role,
        user.barakId,
        user.profileImage,
        editForm.currentPassword
      );

      showAlert({
        type: 'success',
        message: editForm.password 
          ? 'Profil dan password berhasil diperbarui'
          : 'Profil berhasil diperbarui'
      });

      // Reset password fields
      setEditForm(prev => ({
        ...prev,
        password: '',
        currentPassword: ''
      }));

      setIsEditProfileOpen(false);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('password salah')) {
          showAlert({
            type: 'error',
            message: 'Password lama yang Anda masukkan salah'
          });
        } else {
          showAlert({
            type: 'error',
            message: error.message
          });
        }
      } else {
        showAlert({
          type: 'error',
          message: 'Gagal memperbarui profil'
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);

      // Validasi ukuran file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showAlert({
          type: 'error',
          message: 'Ukuran gambar maksimal 2MB'
        });
        return;
      }

      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        showAlert({
          type: 'error',
          message: 'File harus berupa gambar'
        });
        return;
      }

      // Generate unique filename
      const fileName = `profile-images/${user.id}-${Date.now()}-${file.name}`;
      const imageRef = storageRef(storage, fileName);

      // Upload file
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      // Update user profile
      await updateUser(
        user.id,
        user.username,
        null,
        user.fullName,
        user.role,
        user.barakId,
        downloadURL // Add new parameter for profile image
      );

      setProfileImage(downloadURL);
      showAlert({
        type: 'success',
        message: 'Foto profil berhasil diperbarui'
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert({
        type: 'error',
        message: 'Gagal mengupload foto profil'
      });
    } finally {
      setIsUploading(false);
    }
  };

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
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden flex items-center justify-center">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
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
                className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg py-1 border border-gray-200"
              >
                <div className="px-3 sm:px-4 py-2 border-b xs:hidden">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </div>
                </div>

                {/* Profile Image Upload */}
                <label className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <Upload size={16} className="mr-2" />
                  <span>{isUploading ? 'Mengupload...' : 'Upload Foto Profil'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    setIsEditProfileOpen(true);
                    setIsDropdownOpen(false);
                    setEditForm({
                      fullName: user?.fullName || '',
                      username: user?.username || '',
                      password: '',
                      currentPassword: '' // Tambah ini
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Lama (diperlukan untuk mengubah password)
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={editForm.currentPassword}
                      onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

      {/* Alert Component */}
      {alert && (
        <div className="fixed top-20 right-4 z-[60]">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={hideAlert}
          />
        </div>
      )}
    </header>
  );
};

export default Header;
