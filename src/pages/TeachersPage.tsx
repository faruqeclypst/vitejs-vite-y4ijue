import React from 'react';
import TeacherForm from '../components/TeacherForm';
import TeacherList from '../components/TeacherList';
import { useTeachers } from '../contexts/TeachersContext';

const TeachersPage: React.FC = () => {
  const { teachers, addTeacher } = useTeachers();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manage Teachers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <TeacherForm onSubmit={addTeacher} />
        </div>
        <div>
          <TeacherList teachers={teachers} />
        </div>
      </div>
    </div>
  );
};

export default TeachersPage;