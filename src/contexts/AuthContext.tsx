import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, get, set, update, remove } from 'firebase/database';
import { auth, db, storage } from '../firebase';
import { UserRole } from '../types';
import { 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import useAlert from '../hooks/useAlert';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompression';

// Interface User
export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  barakId?: string;
  email: string;
  photoUrl?: string; // Tambah field untuk foto profil
  isDefaultAccount: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addUser: (
    email: string,
    username: string,
    password: string,
    fullName: string,
    role: UserRole,
    barakId?: string
  ) => Promise<void>;
  getUsers: () => Promise<User[]>;
  updateUser: (
    userId: string,
    username: string,
    password: string | null,
    fullName: string,
    role: UserRole,
    barakId?: string,
    photoFile?: File
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tambahkan interface InitialSetupProps
interface InitialSetupProps {
  onSetupComplete: (email: string, username: string, password: string) => Promise<void>;
}

// Tambahkan komponen InitialSetup
const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupComplete }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (username.length < 3) {
        throw new Error('Username minimal 3 karakter');
      }
      if (username.includes('@')) {
        throw new Error('Username tidak boleh mengandung karakter @');
      }
      await onSetupComplete(email, username, password);
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Initial Setup</h2>
        <p className="text-gray-600 mb-6 text-center">
          Buat akun Admin Master untuk memulai
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Admin Master
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded-lg"
              placeholder="Masukkan email"
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
              className="w-full p-2 border rounded-lg"
              placeholder="Minimal 3 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-2 border rounded-lg"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium
              ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  // Login function dengan Firebase Auth
  const login = async (emailOrUsername: string, password: string) => {
    try {
      // Cek apakah input adalah email atau username
      const isEmail = emailOrUsername.includes('@');
      let email = emailOrUsername;

      // Jika login menggunakan username, cari email yang sesuai
      if (!isEmail) {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) throw new Error('Data pengguna tidak ditemukan');

        // Cari user berdasarkan username
        const userFound = Object.values(users).find(
          (user) => (user as { username: string; email: string }).username === emailOrUsername
        ) as { username: string; email: string } | undefined;

        if (!userFound) {
          throw new Error('Username atau password salah');
        }

        if (!userFound.email) {
          throw new Error('Email pengguna tidak ditemukan');
        }

        email = userFound.email;
      }

      // Login ke Firebase Auth menggunakan email
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Ambil data user dari Realtime Database
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (!userData) throw new Error('Data pengguna tidak ditemukan');

      const loggedInUser: User = {
        id: firebaseUser.uid,
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        role: userData.role,
        barakId: userData.barakId,
        photoUrl: userData.photoUrl, // Tambahkan ini
        isDefaultAccount: userData.isDefaultAccount
      };

      setUser(loggedInUser);
      localStorage.setItem('currentUser', JSON.stringify(loggedInUser));

    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        switch (error.message) {
          case 'Firebase: Error (auth/invalid-email)':
            throw new Error('Format email tidak valid');
          case 'Firebase: Error (auth/user-not-found)':
          case 'Firebase: Error (auth/wrong-password)':
            throw new Error('Email/Username atau password salah');
          default:
            throw error;
        }
      }
      throw error;
    }
  };

  // Logout function dengan Firebase Auth
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Add user function dengan Firebase Auth
  const addUser = async (
    email: string,
    username: string,
    password: string,
    fullName: string,
    role: UserRole,
    barakId?: string
  ) => {
    try {
      // Validasi email
      if (!email || !email.includes('@')) {
        throw new Error('Email tidak valid');
      }

      // Validasi username
      if (username.length < 3) {
        throw new Error('Username minimal 3 karakter');
      }
      if (username.includes('@')) {
        throw new Error('Username tidak boleh mengandung karakter @');
      }

      // Validasi password
      if (password.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      // Validasi fullName
      if (!fullName.trim()) {
        throw new Error('Nama lengkap harus diisi');
      }

      // Cek apakah username sudah digunakan
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (users) {
        const isUsernameTaken = Object.values(users).some(
          (user: any) => user.username === username
        );
        if (isUsernameTaken) {
          throw new Error('Username sudah digunakan');
        }
      }

      // Buat user di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, {
        displayName: fullName
      });

      // Simpan data tambahan di Realtime Database
      const userData = {
        email,
        username,
        fullName,
        role,
        barakId: barakId || null,
        isDefaultAccount: false
      };

      await set(ref(db, `users/${firebaseUser.uid}`), userData);

    } catch (error) {
      console.error('Add user error:', error);
      if (error instanceof Error) {
        switch (error.message) {
          case 'Firebase: Error (auth/email-already-in-use)':
            throw new Error('Email sudah digunakan');
          case 'Firebase: Error (auth/invalid-email)':
            throw new Error('Format email tidak valid');
          case 'Firebase: Password should be at least 6 characters (auth/weak-password)':
            throw new Error('Password minimal 6 karakter');
          default:
            throw new Error(error.message);
        }
      }
      throw error;
    }
  };

  // Update user function
  const updateUser = async (
    userId: string,
    username: string,
    password: string | null,
    fullName: string,
    role: UserRole,
    barakId?: string,
    photoFile?: File
  ) => {
    try {
      const userRef = ref(db, `users/${userId}`);
      let updateData: any = { username, fullName, role };

      if (password) {
        updateData.password = password;
      }
      if (barakId) {
        updateData.barakId = barakId;
      }

      // Handle photo upload with compression
      if (photoFile) {
        try {
          // Compress image before upload
          const compressedFile = await compressImage(photoFile);
          
          // Create filename
          const extension = compressedFile.name.split('.').pop()?.toLowerCase() || '';
          const fileName = `profile_${userId}_${Date.now()}.${extension}`;
          
          // Create storage reference
          const storageReference = storageRef(storage, `user-photos/${fileName}`);
          
          // Upload file
          console.log('Uploading file...'); // Debug log
          const uploadResult = await uploadBytes(storageReference, compressedFile);
          console.log('File uploaded, getting URL...'); // Debug log
          
          // Get download URL
          const photoUrl = await getDownloadURL(uploadResult.ref);
          console.log('Got download URL:', photoUrl); // Debug log
          
          updateData.photoUrl = photoUrl;
        } catch (error) {
          console.error('Error uploading photo:', error);
          throw new Error('Gagal mengupload foto: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      }

      // Update database
      console.log('Updating database with:', updateData); // Debug log
      await update(userRef, updateData);
      
      // Update local user state
      setUser(prev => prev ? { ...prev, ...updateData } : null);
      
      console.log('Update completed successfully'); // Debug log
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  // Delete user function
  const deleteUser = async (id: string) => {
    try {
      await remove(ref(db, `users/${id}`));
      // Note: Untuk menghapus user dari Firebase Auth, diperlukan re-authentication
      // Implementasi lebih lanjut dapat ditambahkan sesuai kebutuhan
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  };

  // Get users function
  const getUsers = async (): Promise<User[]> => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    
    if (!users) return [];

    return Object.entries(users).map(([id, data]: [string, any]) => ({
      id,
      email: data.email,
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      barakId: data.barakId,
      photoUrl: data.photoUrl, // Tambahkan ini
      isDefaultAccount: data.isDefaultAccount
    }));
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, get additional data from Realtime Database
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        if (userData) {
          const fullUser: User = {
            id: firebaseUser.uid,
            email: userData.email,
            username: userData.username,
            fullName: userData.fullName,
            role: userData.role,
            barakId: userData.barakId,
            photoUrl: userData.photoUrl, // Tambahkan ini
            isDefaultAccount: userData.isDefaultAccount
          };
          setUser(fullUser);
          localStorage.setItem('currentUser', JSON.stringify(fullUser));
        }
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('currentUser');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Tambahkan fungsi untuk initial setup
  const handleInitialSetup = async (email: string, username: string, password: string) => {
    try {
      // Buat user admin master di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Simpan data admin master di Realtime Database
      const userData = {
        email,
        username,
        fullName: 'Administrator Master',
        role: 'admin_master' as UserRole,
        isDefaultAccount: true
      };

      await set(ref(db, `users/${firebaseUser.uid}`), userData);
      setIsInitialSetup(false);

    } catch (error) {
      console.error('Initial setup error:', error);
      if (error instanceof Error) {
        switch (error.message) {
          case 'Firebase: Error (auth/email-already-in-use)':
            throw new Error('Email sudah digunakan');
          case 'Firebase: Error (auth/invalid-email)':
            throw new Error('Format email tidak valid');
          default:
            throw error;
        }
      }
      throw error;
    }
  };

  // Check initial setup
  useEffect(() => {
    const checkInitialSetup = async () => {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) {
        setIsInitialSetup(true);
      }
      setIsLoading(false);
    };
    checkInitialSetup();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isInitialSetup) {
    return <InitialSetup onSetupComplete={handleInitialSetup} />;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      addUser, 
      getUsers, 
      updateUser, 
      deleteUser, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
