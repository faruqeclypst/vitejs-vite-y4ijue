import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, get, push } from 'firebase/database';
import { db } from '../firebase';

type UserRole = 'admin' | 'piket' | 'wakil_kepala';

interface User {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  addUser: (username: string, password: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
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
      const [id, userData] = matchedUser as [string, { username: string; password: string; role: UserRole }];
      const loggedInUser: User = {
        id,
        username: userData.username,
        role: userData.role,
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

  const addUser = async (username: string, password: string, role: UserRole) => {
    const usersRef = ref(db, 'users');
    await push(usersRef, { username, password, role });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, addUser }}>
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