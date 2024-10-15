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
    const filteredAttendanceData = Object.entries(attendanceData).reduce((acc, [rosterId, data]) => {
      if (data.presentHours.length > 0 || data.status !== 'Present' || data.remarks.trim() !== '') {
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
      // Merge new attendance data with existing data to prevent duplication
      const mergedAttendanceData = existingAttendance.reduce((acc, record) => {
        acc[record.rosterId] = {
          presentHours: record.presentHours,
          status: record.status,
          remarks: record.remarks || '',
        };
        return acc;
      }, {} as typeof filteredAttendanceData);

      // Update or add new attendance data
      Object.entries(filteredAttendanceData).forEach(([rosterId, data]) => {
        mergedAttendanceData[rosterId] = data;
      });

      onSubmit(mergedAttendanceData);
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
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Nama Guru</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i} className="py-2 px-4 border-b">JP {i + 1}</th>
            ))}
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedRoster).map(([teacherId, entries]) => {
            const teacher = teachers.find(t => t.id === teacherId);
            const maxHours = Math.max(...entries.map(e => daySchedule[e.dayOfWeek]));
            return (
              <tr key={teacherId}>
                <td className="py-2 px-4 border-b">{teacher?.name || 'Unknown'}</td>
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
                        <select
                          value={currentData.status}
                          onChange={(e) => handleStatusChange(entry.id, e.target.value as AttendanceStatus)}
                          className="form-select block w-full text-xs"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                          <option value="Excused">Excused</option>
                          <option value="Sick">Sick</option>
                        </select>
                      </div>
                    ) : null;
                  })}
                </td>
                <td className="py-2 px-4 border-b">
                  {entries.map(entry => {
                    const currentData = attendanceData[entry.id];
                    return currentData ? (
                      <div key={entry.id} className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">{entry.classId}:</span>
                        <input
                          type="text"
                          value={currentData.remarks}
                          onChange={(e) => handleRemarksChange(entry.id, e.target.value)}
                          className="form-input block w-full text-xs"
                          placeholder="Add remarks..."
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
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!roster.length || Object.keys(attendanceData).length === 0}
      >
        Submit Attendance
      </button>
    </div>
  );
};

export default AttendanceTable;