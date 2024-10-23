import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, get, push, set, remove } from 'firebase/database';
import { db } from '../firebase';

type UserRole = 'admin' | 'piket' | 'wakil_kepala' | 'pengasuh' | 'admin_asrama';

interface User {
  id: string;
  username: string;
  role: UserRole;
  asramaId?: string; // Tambahkan field untuk pengasuh
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  addUser: (username: string, password: string, role: UserRole, asramaId?: string) => Promise<void>;
  getUsers: () => Promise<User[]>;
  updateUser: (id: string, username: string, password: string, role: UserRole, asramaId?: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (!users) {
      throw new Error('No users found in the database');
    }

    const matchedUser = Object.entries(users).find(
      ([_, userData]: [string, any]) =>
        (userData as { username: string; password: string; role: UserRole }).username === username &&
        (userData as { username: string; password: string; role: UserRole }).password === password
    );

    if (matchedUser) {
      const [id, userData] = matchedUser as [string, { username: string; password: string; role: UserRole; asramaId?: string }];
      const loggedInUser: User = {
        id,
        username: userData.username,
        role: userData.role,
        asramaId: userData.asramaId // Tambahkan ini
      };
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    } else {
      throw new Error('Invalid username or password');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const addUser = async (username: string, password: string, role: UserRole, asramaId?: string) => {
    const usersRef = ref(db, 'users');
    await push(usersRef, { username, password, role, asramaId });
  };

  const getUsers = async (): Promise<User[]> => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    return Object.entries(users).map(([id, userData]: [string, any]) => ({
      id,
      username: userData.username,
      role: userData.role,
      asramaId: userData.asramaId // Tambahkan ini
    }));
  };

  const updateUser = async (id: string, username: string, password: string, role: UserRole, asramaId?: string) => {
    const userRef = ref(db, `users/${id}`);
    await set(userRef, { username, password, role, asramaId });
  };

  const deleteUser = async (id: string) => {
    const userRef = ref(db, `users/${id}`);
    await remove(userRef);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, addUser, getUsers, updateUser, deleteUser, isLoading }}>
      {children}
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
