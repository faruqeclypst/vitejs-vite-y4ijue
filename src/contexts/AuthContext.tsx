import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '../firebase';

// Gunakan type yang sama dengan yang ada di types.ts
type UserRole = 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama' | 'admin_barak';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  barakId?: string; // Ganti asramaId menjadi barakId
  email: string;
  isDefaultAccount: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addUser: (
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
    barakId?: string
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  const checkInitialSetup = async () => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) {
      setIsInitialSetup(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const initialSetup = async (
    adminUsername: string,
    adminPassword: string,
    adminBarakUsername: string,
    adminBarakPassword: string
  ) => {
    try {
      // Buat akun admin
      const adminEmail = `${adminUsername.toLowerCase()}@piketmosa.com`;
      const adminCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      await updateProfile(adminCredential.user, {
        displayName: 'Administrator'
      });
      await set(ref(db, `users/${adminCredential.user.uid}`), {
        username: adminUsername,
        email: adminEmail,
        fullName: 'Administrator',
        role: 'admin',
        barakId: null,
        isDefaultAccount: true // Tambahkan penanda
      });

      // Sign out setelah membuat admin
      await signOut(auth);

      // Buat akun admin_asrama
      const adminBarakEmail = `${adminBarakUsername.toLowerCase()}@piketmosa.com`;
      const adminBarakCredential = await createUserWithEmailAndPassword(auth, adminBarakEmail, adminBarakPassword);
      await updateProfile(adminBarakCredential.user, {
        displayName: 'Admin Asrama'
      });
      await set(ref(db, `users/${adminBarakCredential.user.uid}`), {
        username: adminBarakUsername,
        email: adminBarakEmail,
        fullName: 'Admin Asrama',
        role: 'admin_asrama',
        barakId: null,
        isDefaultAccount: true // Tambahkan penanda
      });

      // Sign out setelah membuat admin_asrama
      await signOut(auth);

      setIsInitialSetup(false);
      return true;
    } catch (error) {
      console.error('Error in initial setup:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Ambil data tambahan user dari Realtime Database
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (userData) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            username: userData.username,
            fullName: userData.fullName,
            role: userData.role,
            barakId: userData.barakId,
            isDefaultAccount: userData.isDefaultAccount
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const email = `${username.toLowerCase()}@piketmosa.com`;
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userRef = ref(db, `users/${userCredential.user.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        if (!userData) {
          throw new Error('Data pengguna tidak ditemukan');
        }

        // Simpan password sementara untuk keperluan re-login setelah add user
        localStorage.setItem('tempPassword', password);

      } catch (error: any) {
        if (error.code === 'auth/invalid-credential') {
          throw new Error('Username atau password salah');
        } else if (error.code === 'auth/invalid-email') {
          throw new Error('Format email tidak valid');
        } else if (error.code === 'auth/user-disabled') {
          throw new Error('Akun telah dinonaktifkan');
        } else if (error.code === 'auth/user-not-found') {
          throw new Error('Pengguna tidak ditemukan');
        } else if (error.code === 'auth/wrong-password') {
          throw new Error('Password salah');
        } else {
          throw new Error('Gagal login: ' + (error.message || 'Terjadi kesalahan'));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const addUser = async (
    username: string,
    password: string,
    fullName: string,
    role: UserRole,
    barakId?: string
  ) => {
    try {
      // Buat email dari username dengan menambahkan domain
      const email = `${username.toLowerCase()}@piketmosa.com`;

      // Cek apakah email sudah ada di database
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (users) {
        const emailExists = Object.values(users).some(
          (user: any) => user.email === email
        );
        if (emailExists) {
          throw new Error('Username sudah digunakan, silakan pilih username lain');
        }
      }

      // Simpan auth state saat ini
      const currentAuth = auth.currentUser;
      const currentEmail = currentAuth?.email;

      // Buat user baru
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: fullName
      });

      // Simpan data tambahan di Realtime Database
      const userRef = ref(db, `users/${uid}`);
      await set(userRef, {
        username,
        email,
        fullName,
        role,
        barakId: barakId || null
      });

      // Sign in kembali dengan akun sebelumnya
      if (currentEmail) {
        const currentPassword = localStorage.getItem('tempPassword');
        if (currentPassword) {
          await signInWithEmailAndPassword(auth, currentEmail, currentPassword);
        }
      }

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Username sudah digunakan, silakan pilih username lain');
      } else {
        console.error('Add user error:', error);
        throw error;
      }
    }
  };

  const updateUser = async (
    id: string,
    email: string,
    password: string | null,
    fullName: string,
    role: UserRole,
    barakId?: string
  ) => {
    try {
      const userRef = ref(db, `users/${id}`);
      const userData = {
        username: email.split('@')[0],
        email,
        fullName,
        role,
        barakId: barakId || null
      };

      await set(userRef, userData);

      // Jika ada password baru, update di Firebase Auth
      if (password) {
        // Note: Updating password requires re-authentication
        // Implement password update logic here
      }
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Delete from Realtime Database
      const userRef = ref(db, `users/${id}`);
      await remove(userRef);

      // Note: Deleting user from Firebase Auth requires admin SDK
      // Implement user deletion from Auth here
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  };

  const getUsers = async (): Promise<User[]> => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    
    if (!users) return [];

    return Object.entries(users).map(([id, userData]: [string, any]) => ({
      id,
      email: userData.email,
      username: userData.username,
      fullName: userData.fullName,
      role: userData.role,
      barakId: userData.barakId,
      isDefaultAccount: userData.isDefaultAccount
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isInitialSetup) {
    return (
      <InitialSetup onSetupComplete={initialSetup} />
    );
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

// Komponen InitialSetup
const InitialSetup: React.FC<{
  onSetupComplete: (
    adminUsername: string,
    adminPassword: string,
    adminBarakUsername: string,
    adminBarakPassword: string
  ) => Promise<boolean>;
}> = ({ onSetupComplete }) => {
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBarakUsername, setAdminBarakUsername] = useState('');
  const [adminBarakPassword, setAdminBarakPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onSetupComplete(
        adminUsername,
        adminPassword,
        adminBarakUsername,
        adminBarakPassword
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Initial Setup
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          Buat akun administrator dan admin asrama untuk memulai
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Administrator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username Admin
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Admin
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Admin Asrama</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username Admin Asrama
                </label>
                <input
                  type="text"
                  value={adminBarakUsername}
                  onChange={(e) => setAdminBarakUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Admin Asrama
                </label>
                <input
                  type="password"
                  value={adminBarakPassword}
                  onChange={(e) => setAdminBarakPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
