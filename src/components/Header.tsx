import { User, ChevronDown, LogOut, UserCog, X, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConfirmation from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import useAlert from '../hooks/useAlert';
import Alert from './Alert';
import { compressImage, formatFileSize } from '../utils/imageCompression';

const Header = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const { alert, showAlert, hideAlert } = useAlert();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // State untuk form edit profile
  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
  });

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

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Jika ada foto yang dipilih, kompres dulu
      let compressedPhoto: File | undefined = undefined;
      if (selectedPhoto) {
        compressedPhoto = await compressImage(selectedPhoto);
      }

      await updateUser(
        user.id, 
        editForm.username, 
        null, 
        editForm.fullName, 
        user.role, 
        user.barakId,
        compressedPhoto
      );
      
      setIsEditProfileOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
      showAlert({ 
        type: 'success', 
        message: 'Profil berhasil diperbarui',
        duration: 3000
      });
    } catch (error) {
      showAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Gagal memperbarui profil',
        duration: 3000
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar?',
      confirmText: 'Ya',
      cancelText: 'Batal'
    });

    if (confirmed) {
      localStorage.removeItem('tempPassword');
      await logout();
      navigate('/login');
    }
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const openEditProfile = () => {
    setIsEditProfileOpen(true);
    setIsDropdownOpen(false);
    setEditForm({
      fullName: user?.fullName || '',
      username: user?.username || '',
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const originalSize = formatFileSize(file.size);
        const compressedFile = await compressImage(file);
        const compressedSize = formatFileSize(compressedFile.size);
        
        setSelectedPhoto(compressedFile);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);

        showAlert({
          type: 'success',
          message: `Foto berhasil dikompres dari ${originalSize} menjadi ${compressedSize}`,
          duration: 3000
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal mengkompress foto',
          duration: 3000
        });
      }
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="w-full mx-auto px-2 sm:px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Date and Time Section */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-1 xs:space-y-0 xs:space-x-2 text-gray-600 text-xs sm:text-sm">
            <span className="font-medium">{formatDate(currentDateTime)}</span>
            <span className="hidden xs:block text-gray-400">|</span>
            <span className="font-medium text-blue-600">{formatTime(currentDateTime)}</span>
          </div>

          {/* User Profile Section */}
          <div className="relative">
            <button
              data-dropdown
              onClick={toggleDropdown}
              className="flex items-center space-x-2 sm:space-x-3 py-2 px-2 sm:px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                {user?.photoUrl ? (
                  <img 
                    src={user.photoUrl} 
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-white" />
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
                  onClick={openEditProfile}
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

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-2">
          <div className="min-h-screen px-2 sm:px-4 text-center">
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-[95%] sm:max-w-md p-4 sm:p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Edit Profil</h3>
                <button
                  onClick={() => {
                    setIsEditProfileOpen(false);
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditProfile} className="space-y-4">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                      {photoPreview || user?.photoUrl ? (
                        <img
                          src={photoPreview || user?.photoUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
                      <Camera className="w-4 h-4 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditProfileOpen(false);
                      setSelectedPhoto(null);
                      setPhotoPreview(null);
                    }}
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
          duration={alert.duration}
          onClose={hideAlert}
        />
      )}
    </header>
  );
};

export default Header;
