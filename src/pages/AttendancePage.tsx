import React, { useState, useEffect } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { useClasses } from '../contexts/ClassesContext';
import { DayOfWeek, AttendanceStatus, RosterEntry } from '../types';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceRecordsTable from '../components/AttendanceRecordsTable';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord, deleteAttendanceRecord } = useAttendance();
  const { roster } = useRoster();
  const { teachers } = useTeachers();
  const { classes } = useClasses();
  const [currentDay, setCurrentDay] = useState<DayOfWeek>('Monday');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [currentRoster, setCurrentRoster] = useState<RosterEntry[]>([]);

  useEffect(() => {
    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[new Date().getDay() - 1] || 'Monday';
    setCurrentDay(day);
  }, []);

  useEffect(() => {
    if (roster) {
      const filteredRoster = roster.filter(entry => entry.dayOfWeek === currentDay);
      setCurrentRoster(filteredRoster);
    }
  }, [roster, currentDay]);

  if (!roster || !teachers || !classes) {
    return <div>Loading...</div>;
  }

  const handleAttendanceSubmit = (attendanceData: { [rosterId: string]: { presentHours: number[], status: AttendanceStatus, remarks: string } }) => {
    try {
      Object.entries(attendanceData).forEach(([rosterId, data]) => {
        addOrUpdateAttendanceRecord({
          rosterId,
          date: currentDate,
          presentHours: data.presentHours,
          status: data.status,
          remarks: data.remarks
        });
      });
      alert('Attendance data submitted successfully.');
    } catch (error) {
      setError('Failed to submit attendance data. Please try again.');
      console.error('Error submitting attendance:', error);
    }
  };

  const handleDeleteAttendance = (id: string) => {
    try {
      deleteAttendanceRecord(id);
    } catch (error) {
      setError('Failed to delete attendance record. Please try again.');
      console.error('Error deleting attendance:', error);
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold mb-4">Attendance Page</h1>
      <div>
        <h2 className="text-xl font-semibold mb-4">Take Attendance ({currentDay})</h2>
        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date:</label>
          <input
            type="date"
            id="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        {currentRoster.length > 0 ? (
          <AttendanceTable
            roster={currentRoster}
            teachers={teachers}
            onSubmit={handleAttendanceSubmit}
            existingAttendance={attendanceRecords.filter(record => record.date === currentDate)}
          />
        ) : (
          <p>No roster entries for this day.</p>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
        <AttendanceRecordsTable
          attendanceRecords={attendanceRecords}
          roster={roster}
          teachers={teachers}
          classes={classes}
          onDelete={handleDeleteAttendance}
        />
      </div>
    </div>
  );
};

export default AttendancePage;