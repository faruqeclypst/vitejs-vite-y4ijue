import React, { createContext, useState, useContext } from 'react';
import { Class } from '../types';

interface ClassesContextType {
  classes: Class[];
  addClass: (cls: Omit<Class, 'id'>) => void;
  updateClass: (id: string, cls: Omit<Class, 'id'>) => void;
  deleteClass: (id: string) => void;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

let nextClassId = 1;

export const ClassesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);

  const addClass = (cls: Omit<Class, 'id'>) => {
    setClasses([...classes, { ...cls, id: `class_${nextClassId++}` }]);
  };

  const updateClass = (id: string, updatedClass: Omit<Class, 'id'>) => {
    setClasses(classes.map(cls => cls.id === id ? { ...updatedClass, id } : cls));
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(cls => cls.id !== id));
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