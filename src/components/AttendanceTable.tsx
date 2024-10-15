import React, { useState, useEffect } from 'react';
import { RosterEntry, Teacher, Attendance, daySchedule } from '../types';

interface AttendanceTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onSubmit: (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => void;
  existingAttendance: Attendance[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ roster, teachers, onSubmit, existingAttendance }) => {
  const [attendanceData, setAttendanceData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});

  useEffect(() => {
    const initialData: { [rosterId: string]: { presentHours: number[], keterangan: string } } = {};
    roster.forEach(entry => {
      const existingRecord = existingAttendance.find(record => record.rosterId === entry.id);
      initialData[entry.id] = existingRecord
        ? { presentHours: existingRecord.presentHours, keterangan: existingRecord.keterangan || '' }
        : { presentHours: [], keterangan: '' };
    });
    setAttendanceData(initialData);
  }, [roster, existingAttendance]);

  const handleToggle = (rosterId: string, hour: number) => {
    setAttendanceData(prev => {
      const current = prev[rosterId];
      if (!current) return prev;
      const updatedHours = current.presentHours.includes(hour)
        ? current.presentHours.filter(h => h !== hour)
        : [...current.presentHours, hour].sort((a, b) => a - b);
      return {
        ...prev,
        [rosterId]: {
          ...current,
          presentHours: updatedHours,
        }
      };
    });
  };

  const handleKeteranganChange = (rosterId: string, keterangan: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [rosterId]: { ...prev[rosterId], keterangan }
    }));
  };

  const handleSubmit = () => {
    const filteredAttendanceData = Object.entries(attendanceData).reduce((acc, [rosterId, data]) => {
      if (data.presentHours.length > 0 || data.keterangan.trim() !== '') {
        acc[rosterId] = data;
      }
      return acc;
    }, {} as typeof attendanceData);

    const hasAttendanceData = Object.keys(filteredAttendanceData).length > 0;

    if (!hasAttendanceData) {
      alert('No attendance data to submit. Please enter attendance information before submitting.');
      return;
    }

    if (window.confirm('Are you sure you want to submit this attendance data?')) {
      onSubmit(filteredAttendanceData);
    }
  };

  if (!roster.length) {
    return <div>No roster data available.</div>;
  }

  // Group roster entries by teacher
  const groupedRoster = roster.reduce((acc, entry) => {
    const teacherId = entry.teacherId;
    if (!acc[teacherId]) {
      acc[teacherId] = [];
    }
    acc[teacherId].push(entry);
    return acc;
  }, {} as { [teacherId: string]: RosterEntry[] });

  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Guru</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JP {i + 1}</th>
            ))}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
          </tr>
          </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.entries(groupedRoster).map(([teacherId, entries]) => {
            const teacher = teachers.find(t => t.id === teacherId);
            const maxHours = Math.max(...entries.map(e => daySchedule[e.dayOfWeek]));
            const teacherInitials = teacher?.name.split(' ').map(n => n[0]).join('');
            return (
              <tr key={teacherId}>
                <td className="py-2 px-4 border-b">
                  {teacher?.name || 'Unknown'} {teacherInitials ? `(${teacherInitials})` : ''}
                </td>
                {Array.from({ length: 8 }, (_, i) => (
                  <td key={i} className="py-2 px-4 border-b text-center">
                    {i < maxHours ? (
                      <div className="flex flex-col space-y-1">
                        {entries.map(entry => {
                          if (entry.hours.includes(i + 1)) {
                            const currentData = attendanceData[entry.id];
                            return currentData ? (
                              <button
                                key={entry.id}
                                onClick={() => handleToggle(entry.id, i + 1)}
                                className={`px-2 py-1 text-xs rounded ${
                                  currentData.presentHours.includes(i + 1)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {entry.classId}
                              </button>
                            ) : null;
                          }
                          return null;
                        })}
                      </div>
                    ) : null}
                  </td>
                ))}
                <td className="py-2 px-4 border-b">
                  {entries.map(entry => {
                    const currentData = attendanceData[entry.id];
                    return currentData ? (
                      <div key={entry.id} className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">{entry.classId}:</span>
                        <input
                          type="text"
                          value={currentData.keterangan}
                          onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                          className="form-input block w-full text-xs"
                          placeholder="Add keterangan..."
                        />
                      </div>
                    ) : null;
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={handleSubmit}
        className="mt-4 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!roster.length || Object.keys(attendanceData).length === 0}
      >
        Submit Attendance
      </button>
    </div>
  );
};

export default AttendanceTable;