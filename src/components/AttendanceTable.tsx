import React, { useState, useEffect } from 'react';
import { RosterEntry, Teacher, Attendance, AttendanceStatus, daySchedule } from '../types';

interface AttendanceTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onSubmit: (attendanceData: { [rosterId: string]: { presentHours: number[], status: AttendanceStatus, remarks: string } }) => void;
  existingAttendance: Attendance[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ roster, teachers, onSubmit, existingAttendance }) => {
  const [attendanceData, setAttendanceData] = useState<{ [rosterId: string]: { presentHours: number[], status: AttendanceStatus, remarks: string } }>({});

  useEffect(() => {
    const initialData: { [rosterId: string]: { presentHours: number[], status: AttendanceStatus, remarks: string } } = {};
    roster.forEach(entry => {
      const existingRecord = existingAttendance.find(record => record.rosterId === entry.id);
      initialData[entry.id] = existingRecord
        ? { presentHours: existingRecord.presentHours, status: existingRecord.status, remarks: existingRecord.remarks || '' }
        : { presentHours: [], status: 'Present', remarks: '' };
    });
    setAttendanceData(initialData);
  }, [roster, existingAttendance]);

  const handleCheckboxChange = (rosterId: string, hour: number) => {
    setAttendanceData(prev => {
      const current = prev[rosterId];
      const updatedHours = current.presentHours.includes(hour)
        ? current.presentHours.filter(h => h !== hour)
        : [...current.presentHours, hour].sort((a, b) => a - b);
      return {
        ...prev,
        [rosterId]: {
          ...current,
          presentHours: updatedHours,
          status: updatedHours.length > 0 ? 'Present' : 'Absent'
        }
      };
    });
  };

  const handleStatusChange = (rosterId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [rosterId]: { ...prev[rosterId], status }
    }));
  };

  const handleRemarksChange = (rosterId: string, remarks: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [rosterId]: { ...prev[rosterId], remarks }
    }));
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit this attendance data?')) {
      onSubmit(attendanceData);
    }
  };

  if (!roster.length) {
    return <div>No roster data available.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Teacher</th>
            <th className="py-2 px-4 border-b">Class</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i} className="py-2 px-4 border-b">Hour {i + 1}</th>
            ))}
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {roster.map(entry => {
            const teacher = teachers.find(t => t.id === entry.teacherId);
            const currentData = attendanceData[entry.id] || { presentHours: [], status: 'Present' as AttendanceStatus, remarks: '' };
            const maxHours = daySchedule[entry.dayOfWeek];
            return (
              <tr key={entry.id}>
                <td className="py-2 px-4 border-b">{teacher?.name || 'Unknown'}</td>
                <td className="py-2 px-4 border-b">{entry.classId}</td>
                {Array.from({ length: 8 }, (_, i) => (
                  <td key={i} className="py-2 px-4 border-b text-center">
                    {i < maxHours && entry.hours.includes(i + 1) ? (
                      <input
                        type="checkbox"
                        checked={currentData.presentHours.includes(i + 1)}
                        onChange={() => handleCheckboxChange(entry.id, i + 1)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                    ) : null}
                  </td>
                ))}
                <td className="py-2 px-4 border-b">
                  <select
                    value={currentData.status}
                    onChange={(e) => handleStatusChange(entry.id, e.target.value as AttendanceStatus)}
                    className="form-select block w-full mt-1"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Excused">Excused</option>
                    <option value="Sick">Sick</option>
                  </select>
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="text"
                    value={currentData.remarks}
                    onChange={(e) => handleRemarksChange(entry.id, e.target.value)}
                    className="form-input block w-full mt-1"
                    placeholder="Add remarks..."
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={handleSubmit}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Submit Attendance
      </button>
    </div>
  );
};

export default AttendanceTable;