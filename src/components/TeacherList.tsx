import React from 'react';
import { Teacher } from '../types';
import { Users } from 'lucide-react';

interface TeacherListProps {
  teachers: Teacher[];
}

const TeacherList: React.FC<TeacherListProps> = ({ teachers }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Users className="mr-2" />
        Teachers
      </h2>
      <ul className="space-y-2">
        {teachers.map((teacher) => (
          <li
            key={teacher.id}
            className="p-2 rounded bg-gray-100"
          >
            {teacher.name} ({teacher.code})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TeacherList;