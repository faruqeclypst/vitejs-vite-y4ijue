import React from 'react';
import ClassForm from '../components/ClassForm';
import ClassList from '../components/ClassList';
import { useClasses } from '../contexts/ClassesContext';

const ClassesPage: React.FC = () => {
  const { classes, addClass } = useClasses();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manage Classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ClassForm onSubmit={addClass} />
        </div>
        <div>
          <ClassList classes={classes} />
        </div>
      </div>
    </div>
  );
};

export default ClassesPage;