import React, { useState, useEffect, useCallback } from 'react';
import { RosterEntry, Teacher, Attendance, daySchedule } from '../types';
import { Check } from 'lucide-react';

interface AttendanceTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onSubmit: (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => void;
  existingAttendance: Attendance[];
  confirmedTeachers: string[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ roster, teachers, onSubmit, existingAttendance, confirmedTeachers }) => {
  const [attendanceData, setAttendanceData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [initialData, setInitialData] = useState<{ [rosterId: string]: { presentHours: number[], keterangan: string } }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const initialData: { [rosterId: string]: { presentHours: number[], keterangan: string } } = {};
    roster.forEach(entry => {
      const existingRecord = existingAttendance.find(record => record.rosterId === entry.id);
      initialData[entry.id] = existingRecord
        ? { presentHours: existingRecord.presentHours || [], keterangan: existingRecord.keterangan || '' }
        : { presentHours: [], keterangan: '' };
    });
    setAttendanceData(initialData);
    setInitialData(initialData);
    setHasUnsavedChanges(false);
  }, [roster, existingAttendance]);

  const checkForChanges = useCallback(() => {
    const hasChanges = Object.keys(attendanceData).some(rosterId => {
      const current = attendanceData[rosterId];
      const initial = initialData[rosterId];
      return !initial ||
        current.presentHours.length !== initial.presentHours.length ||
        current.presentHours.some(hour => !initial.presentHours.includes(hour)) ||
        current.keterangan !== initial.keterangan;
    });
    setHasUnsavedChanges(hasChanges);
  }, [attendanceData, initialData]);

  const handleToggle = (rosterId: string, hour: number) => {
    setAttendanceData(prev => {
      const current = prev[rosterId] || { presentHours: [], keterangan: '' };
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

  useEffect(() => {
    checkForChanges();
  }, [attendanceData, checkForChanges]);

  const handleSubmit = () => {
    onSubmit(attendanceData);
    setInitialData(attendanceData);
    setHasUnsavedChanges(false);
  };

  if (!roster.length) {
    return <div>No roster data available.</div>;
  }

  const groupedRoster = roster.reduce((acc, entry) => {
    const teacherId = entry.teacherId;
    if (!acc[teacherId]) {
      acc[teacherId] = [];
    }
    acc[teacherId].push(entry);
    return acc;
  }, {} as { [teacherId: string]: RosterEntry[] });

  // Sort teachers alphabetically by name
  const sortedTeacherIds = Object.keys(groupedRoster).sort((a, b) => {
    const teacherA = teachers.find(t => t.id === a);
    const teacherB = teachers.find(t => t.id === b);
    return (teacherA?.name || '').localeCompare(teacherB?.name || '');
  });

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full table-auto divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama Guru</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">JP{i + 1}</th>
            ))}
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTeacherIds.map((teacherId) => {
            const entries = groupedRoster[teacherId];
            const teacher = teachers.find(t => t.id === teacherId);
            const maxHours = Math.max(...entries.map(e => daySchedule[e.dayOfWeek]));
            const isConfirmed = confirmedTeachers.includes(teacherId);
            return (
              <tr key={teacherId}>
                <td className="py-2 px-3 border-b whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {isConfirmed && <Check className="text-green-500" size={16} />}
                    <span>{teacher?.name || 'Unknown'} ({teacher?.code || 'N/A'})</span>
                  </div>
                </td>
                {Array.from({ length: 8 }, (_, i) => (
                  <td key={i} className="py-2 px-3 border-b text-center">
                    {i < maxHours ? (
                      <div className="flex flex-col space-y-1">
                        {entries.map(entry => {
                          if (entry.hours.includes(i + 1)) {
                            const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                            const isUpacara = entry.dayOfWeek === 'Senin' && i === 0;
                            return (
                              <button
                                key={entry.id}
                                onClick={() => !isUpacara && handleToggle(entry.id, i + 1)}
                                className={`px-1 py-1 text-xs rounded truncate ${
                                  isUpacara
                                    ? 'bg-yellow-500 text-white cursor-not-allowed'
                                    : currentData.presentHours.includes(i + 1)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                                style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                title={isUpacara ? 'UPACARA' : undefined}
                              >
                                {isUpacara ? 'UPACARA' : entry.classId}
                              </button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ) : null}
                  </td>
                ))}
                <td className="py-2 px-3 border-b">
                  {entries.map(entry => {
                    const currentData = attendanceData[entry.id] || { presentHours: [], keterangan: '' };
                    return (
                      <div key={entry.id} className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium whitespace-nowrap">{entry.classId}:</span>
                        <input
                          type="text"
                          value={currentData.keterangan}
                          onChange={(e) => handleKeteranganChange(entry.id, e.target.value)}
                          className="form-input block w-full text-xs"
                          placeholder="Tambahkan keterangan..."
                        />
                      </div>
                    );
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={handleSubmit}
        className={`mt-4 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
          hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        disabled={!hasUnsavedChanges}
      >
        {hasUnsavedChanges ? 'Kirim Absensi' : 'Absensi'} {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </button>
    </div>
  );
};

export default AttendanceTable;
