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

type UserRole = 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  asramaId?: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addUser: (email: string, password: string, fullName: string, role: UserRole, asramaId?: string) => Promise<void>;
  getUsers: () => Promise<User[]>;
  updateUser: (id: string, email: string, password: string | null, fullName: string, role: UserRole, asramaId?: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tambahkan fungsi untuk cek dan buat admin pertama
  const initializeAdminAccount = async () => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      // Jika belum ada user sama sekali
      if (!snapshot.exists()) {
        try {
          // Buat akun admin default
          const adminEmail = 'admin@piketmosa.com';
          const adminCredential = await createUserWithEmailAndPassword(auth, adminEmail, 'sudahlupa');
          await updateProfile(adminCredential.user, {
            displayName: 'Administrator'
          });
          await set(ref(db, `users/${adminCredential.user.uid}`), {
            username: 'admin',
            email: adminEmail,
            fullName: 'Administrator',
            role: 'admin',
            asramaId: null
          });

          // Buat akun admin_asrama default
          const adminAsramaEmail = 'admin_asrama@piketmosa.com';
          const adminAsramaCredential = await createUserWithEmailAndPassword(auth, adminAsramaEmail, 'sudahlupa');
          await updateProfile(adminAsramaCredential.user, {
            displayName: 'Admin Asrama'
          });
          await set(ref(db, `users/${adminAsramaCredential.user.uid}`), {
            username: 'admin_asrama',
            email: adminAsramaEmail,
            fullName: 'Admin Asrama',
            role: 'admin_asrama',
            asramaId: null
          });

          console.log('Default accounts created successfully');
        } catch (loginError) {
          // Jika error karena akun sudah ada, abaikan
          if ((loginError as any)?.code !== 'auth/email-already-in-use') {
            console.error('Error creating default accounts:', loginError);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing accounts:', error);
    }
  };

  // Panggil fungsi init saat pertama kali load
  useEffect(() => {
    initializeAdminAccount();
  }, []);

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
            asramaId: userData.asramaId
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
    asramaId?: string
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
        asramaId: asramaId || null
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
    asramaId?: string
  ) => {
    try {
      const userRef = ref(db, `users/${id}`);
      const userData = {
        username: email.split('@')[0],
        email,
        fullName,
        role,
        asramaId: asramaId || null
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
      asramaId: userData.asramaId
    }));
  };

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
      {!isLoading ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
