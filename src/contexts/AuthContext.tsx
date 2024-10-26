import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '../firebase';
import { UserRole } from '../types';

// Interface User
export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  barakId?: string;
  password: string; // Tambah field password
  isDefaultAccount: boolean;
}

// Tambahkan interface untuk userData
interface UserData {
  username: string;
  fullName: string;
  role: UserRole;
  barakId?: string;
  password: string;
  isDefaultAccount: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

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

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      if (!users) throw new Error('Tidak ada data pengguna');

      const userFound = Object.entries(users).find(([_, data]) => {
        const userData = data as UserData;
        return userData.username === username && userData.password === password;
      });

      if (!userFound) {
        throw new Error('Username atau password salah');
      }

      const [userId, data] = userFound;
      const userData = data as UserData;
      
      const loggedInUser: User = {
        id: userId,
        username: userData.username,
        fullName: userData.fullName,
        role: userData.role,
        barakId: userData.barakId,
        password: userData.password,
        isDefaultAccount: userData.isDefaultAccount
      };

      setUser(loggedInUser);
      localStorage.setItem('currentUser', JSON.stringify(loggedInUser));

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // Add user function
  const addUser = async (
    username: string,
    password: string,
    fullName: string,
    role: UserRole,
    barakId?: string
  ) => {
    try {
      // Check if username exists
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (users) {
        const usernameExists = Object.values(users).some(
          (user: any) => user.username === username
        );
        if (usernameExists) {
          throw new Error('Username sudah digunakan');
        }
      }

      // Generate new user ID
      const newUserId = Date.now().toString();
      
      // Create new user data
      const userData = {
        username,
        password,
        fullName,
        role,
        barakId: barakId || null,
        isDefaultAccount: false
      };

      // Save to database
      await set(ref(db, `users/${newUserId}`), userData);

    } catch (error) {
      console.error('Add user error:', error);
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
    barakId?: string
  ) => {
    try {
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      const existingData = snapshot.val();

      if (!existingData) {
        throw new Error('User tidak ditemukan');
      }

      // Update user data
      const updatedData = {
        ...existingData,
        username,
        fullName,
        role,
        barakId: barakId || null,
        ...(password && { password }) // Update password hanya jika ada
      };

      await set(userRef, updatedData);

      // Update current user if it's the same user
      if (user && user.id === userId) {
        setUser({
          ...user,
          username,
          fullName,
          role,
          barakId,
          ...(password && { password })
        });
        localStorage.setItem('currentUser', JSON.stringify(user));
      }

    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  // Delete user function
  const deleteUser = async (id: string) => {
    try {
      await remove(ref(db, `users/${id}`));
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

    return Object.entries(users).map(([id, data]) => {
      const userData = data as UserData;
      return {
        id,
        username: userData.username,
        fullName: userData.fullName,
        role: userData.role,
        barakId: userData.barakId,
        password: userData.password,
        isDefaultAccount: userData.isDefaultAccount
      };
    });
  };

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Tambahkan fungsi initialSetup di dalam AuthProvider
  const handleInitialSetup = async (
    adminMasterUsername: string,
    adminMasterPassword: string
  ) => {
    try {
      // Create admin master only
      const adminMasterId = Date.now().toString();
      await set(ref(db, `users/${adminMasterId}`), {
        username: adminMasterUsername,
        password: adminMasterPassword,
        fullName: 'Administrator Master',
        role: 'admin_master',
        isDefaultAccount: true
      });

      // Set isInitialSetup ke false setelah setup berhasil
      setIsInitialSetup(false);
      return true;
    } catch (error) {
      console.error('Error in initial setup:', error);
      throw error;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Initial setup state - Update bagian ini
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

// Tambahkan interface untuk InitialSetupProps
interface InitialSetupProps {
  onSetupComplete: (
    adminMasterUsername: string,
    adminMasterPassword: string
  ) => Promise<boolean>;
}

// Tambahkan komponen InitialSetup
const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupComplete }) => {
  const [adminMasterUsername, setAdminMasterUsername] = useState('');
  const [adminMasterPassword, setAdminMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onSetupComplete(
        adminMasterUsername,
        adminMasterPassword
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Initial Setup
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Master Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-600">Administrator Master</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username Admin Master
              </label>
              <input
                type="text"
                value={adminMasterUsername}
                onChange={(e) => setAdminMasterUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Admin Master
              </label>
              <input
                type="password"
                value={adminMasterPassword}
                onChange={(e) => setAdminMasterPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
              />
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
