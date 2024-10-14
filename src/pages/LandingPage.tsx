import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-8">Welcome to the School Management System</h1>
      <p className="text-xl mb-8">Manage teachers, classes, attendance, and students all in one place.</p>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Link to="/teachers" className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600">Manage Teachers</Link>
        <Link to="/classes" className="bg-green-500 text-white p-4 rounded hover:bg-green-600">Manage Classes</Link>
        <Link to="/roster" className="bg-yellow-500 text-white p-4 rounded hover:bg-yellow-600">Manage Roster</Link>
        <Link to="/attendance" className="bg-red-500 text-white p-4 rounded hover:bg-red-600">Take Attendance</Link>
        <Link to="/students" className="bg-purple-500 text-white p-4 rounded hover:bg-purple-600">Manage Students</Link>
        <Link to="/leave-request" className="bg-indigo-500 text-white p-4 rounded hover:bg-indigo-600">Student Leave Requests</Link>
      </div>
    </div>
  );
};

export default LandingPage;