import React from 'react';
import { Attendance, RosterEntry, Teacher, Class } from '../types';

interface AttendanceRecordsTableProps {
  attendanceRecords: Attendance[];
  roster: RosterEntry[];
  teachers: Teacher[];
  classes: Class[];
  onDelete: (id: string) => void;
}

const AttendanceRecordsTable: React.FC<AttendanceRecordsTableProps> = ({ attendanceRecords, roster, teachers, classes, onDelete }) => {
  if (!attendanceRecords.length) {
    return <div>No attendance records available.</div>;
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      onDelete(id);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Teacher</th>
            <th className="py-2 px-4 border-b">Class</th>
            <th className="py-2 px-4 border-b">Hours Present</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Remarks</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {attendanceRecords.map((record) => {
            const rosterEntry = roster.find(r => r.id === record.rosterId);
            const teacher = teachers.find(t => t.id === rosterEntry?.teacherId);
            const cls = classes.find(c => c.id === rosterEntry?.classId);
            return (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{record.date}</td>
                <td className="py-2 px-4 border-b">{teacher?.name || 'Unknown'}</td>
                <td className="py-2 px-4 border-b">{cls?.name || rosterEntry?.classId || 'Unknown'}</td>
                <td className="py-2 px-4 border-b">{record.presentHours.join(', ')}</td>
                <td className="py-2 px-4 border-b">{record.status}</td>
                <td className="py-2 px-4 border-b">{record.remarks || '-'}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceRecordsTable;