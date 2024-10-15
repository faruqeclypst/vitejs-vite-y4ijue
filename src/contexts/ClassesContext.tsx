import React, { createContext, useState, useContext, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Class } from '../types';

interface ClassesContextType {
  classes: Class[];
  addClass: (cls: Omit<Class, 'id'>) => void;
  updateClass: (id: string, cls: Omit<Class, 'id'>) => void;
  deleteClass: (id: string) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

export const ClassesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    const classesRef = ref(db, 'classes');
    onValue(classesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const classesList = Object.entries(data).map(([id, cls]) => ({
          id,
          ...(cls as Omit<Class, 'id'>)
        }));
        setClasses(classesList);
      } else {
        setClasses([]);
      }
    });
  }, []);

  const addClass = (cls: Omit<Class, 'id'>) => {
    const classesRef = ref(db, 'classes');
    push(classesRef, cls);
  };

  const updateClass = (id: string, updatedClass: Omit<Class, 'id'>) => {
    const classRef = ref(db, `classes/${id}`);
    update(classRef, updatedClass);
  };

  const deleteClass = (id: string) => {
    const classRef = ref(db, `classes/${id}`);
    remove(classRef);
  };

  return (
    <ClassesContext.Provider value={{ classes, addClass, updateClass, deleteClass }}>
      {children}
    </ClassesContext.Provider>
  );
};

export const useClasses = () => {
  const context = useContext(ClassesContext);
  if (context === undefined) {
    throw new Error('useClasses must be used within a ClassesProvider');
  }
  return context;
};