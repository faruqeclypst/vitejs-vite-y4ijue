import React from 'react';
import { Class } from '../types';
import { BookOpen } from 'lucide-react';

interface ClassListProps {
  classes: Class[];
}

const ClassList: React.FC<ClassListProps> = ({ classes }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <BookOpen className="mr-2" />
        Classes
      </h2>
      <ul className="space-y-2">
        {classes.map((cls) => (
          <li
            key={cls.id}
            className="p-2 rounded bg-gray-100"
          >
            {cls.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClassList;