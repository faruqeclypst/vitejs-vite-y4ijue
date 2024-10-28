import React, { useState, useEffect } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useTeachers } from '../contexts/TeachersContext';
import { useAuth } from '../contexts/AuthContext';
import { DayOfWeek, RosterEntry, Attendance } from '../types';
import AttendanceTable from '../components/AttendanceTable';
import Alert from '../components/Alert';
import ConfirmationModal from '../components/ConfirmationModal';
import useAlert from '../hooks/useAlert';
import useConfirmation from '../hooks/useConfirmation';
import { exportAttendance } from '../utils/exportAttendance';

const AttendancePage: React.FC = () => {
  const { attendanceRecords, addOrUpdateAttendanceRecord } = useAttendance();
  const { roster, allRoster } = useRoster();
  const { teachers, allTeachers } = useTeachers();
  const { user } = useAuth();
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>('Senin');
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0]
  );
  const [currentRoster, setCurrentRoster] = useState<RosterEntry[]>([]);
  const [filteredAttendanceRecords, setFilteredAttendanceRecords] = useState<Attendance[]>([]);
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [exportStartDate, setExportStartDate] = useState(new Date());
  const [exportEndDate, setExportEndDate] = useState(new Date());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [confirmedTeachers, setConfirmedTeachers] = useState<string[]>([]);

  const isAdmin = user?.role === 'admin' || user?.role === 'admin_master'; // Update isAdmin check

  useEffect(() => {
    updateDayFromDate(new Date(currentDate));
  }, [currentDate]);

  useEffect(() => {
    if (roster) {
      const filteredRoster = roster.filter(entry => entry.dayOfWeek === currentDay);
      setCurrentRoster(filteredRoster);
    }
  }, [roster, currentDay]);

  useEffect(() => {
    const filtered = attendanceRecords.filter(record => record.date === currentDate);
    setFilteredAttendanceRecords(filtered);
  }, [attendanceRecords, currentDate]);

  const updateDayFromDate = (date: Date) => {
    const days: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    let dayIndex = jakartaDate.getDay() - 1;
    if (dayIndex === -1) {
      setCurrentDay(null);
    } else {
      const day = days[dayIndex];
      setCurrentDay(day);
    }
  };

  const handleDateChange = (newDate: string) => {
    if (isAdmin) {
      setCurrentDate(newDate);
    }
  };

  const handleAttendanceSubmit = async (attendanceData: { [rosterId: string]: { presentHours: number[], keterangan: string } }) => {
    const shouldSubmit = await confirm({
      title: 'Konfirmasi Pengiriman',
      message: 'Apakah Anda yakin ingin mengirim data kehadiran ini?',
      confirmText: 'Ya, Kirim',
      cancelText: 'Batal',
    });

    if (shouldSubmit) {
      try {
        const promises = Object.entries(attendanceData).map(([rosterId, data]) => 
          addOrUpdateAttendanceRecord({
            rosterId,
            date: currentDate,
            presentHours: data.presentHours,
            keterangan: data.keterangan
          })
        );

        await Promise.all(promises);

        const newConfirmedTeachers = [...new Set([...confirmedTeachers, ...Object.keys(attendanceData)])];
        setConfirmedTeachers(newConfirmedTeachers);

        showAlert({ type: 'success', message: 'Data kehadiran berhasil disimpan.' });
      } catch (error) {
        showAlert({ type: 'error', message: 'Gagal menyimpan data kehadiran. Silakan coba lagi.' });
        console.error('Error submitting attendance:', error);
      }
    }
  };

  const handleExport = async (type: 'custom' | 'monthly') => {
    const shouldExport = await confirm({
      title: 'Konfirmasi Ekspor',
      message: `Apakah Anda yakin ingin mengekspor data kehadiran ${type === 'custom' ? 'kustom' : 'bulanan'}?`,
      confirmText: 'Ekspor',
      cancelText: 'Batal',
    });
  
    if (shouldExport) {
      let startDate: Date, endDate: Date;
  
      if (type === 'custom') {
        startDate = new Date(exportStartDate);
        endDate = new Date(exportEndDate);
      } else {
        startDate = new Date(exportYear, exportMonth, 1);
        endDate = new Date(exportYear, exportMonth + 1, 0);
      }
  
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  
      const filteredRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
  
      try {
        await exportAttendance({
          startDate,
          endDate,
          attendanceRecords: filteredRecords,
          roster: allRoster,
          teachers: allTeachers
        });
        showAlert({ type: 'success', message: `Data kehadiran ${type === 'custom' ? 'kustom' : 'bulanan'} berhasil diekspor.` });
      } catch (error) {
        console.error('Error exporting attendance:', error);
        showAlert({ type: 'error', message: 'Gagal mengekspor data kehadiran. Silakan coba lagi.' });
      }
    }
  };

  const handleExportStartDateChange = (date: Date | null) => {
    if (date) {
      setExportStartDate(date);
    }
  };

  const handleExportEndDateChange = (date: Date | null) => {
    if (date) {
      setExportEndDate(date);
    }
  };

  if (!roster || !teachers) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 cursor-pointer" onClick={(e) => {
            const target = e.currentTarget.nextElementSibling as HTMLElement;
            if (target) {
              target.classList.toggle('hidden');
              target.classList.toggle('sm:block');
            }
          }}>Absensi Guru</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">Kelola dan pantau kehadiran guru dalam mengajar</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <AttendanceTable
              roster={currentRoster}
              teachers={teachers}
              onSubmit={handleAttendanceSubmit}
              existingAttendance={filteredAttendanceRecords}
              confirmedTeachers={confirmedTeachers}
              currentDate={currentDate}
              onDateChange={handleDateChange}
              isAdmin={isAdmin} // Pass isAdmin yang sudah diupdate
            />
          </div>
        </div>

        {/* Export Section */}
        {isAdmin && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Ekspor Data Kehadiran</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Custom Export */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium mb-2">Ekspor Kustom</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    value={exportStartDate.toISOString().split('T')[0]}
                    onChange={(e) => handleExportStartDateChange(new Date(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={exportEndDate.toISOString().split('T')[0]}
                    onChange={(e) => handleExportEndDateChange(new Date(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleExport('custom')}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Ekspor
                  </button>
                </div>
              </div>

              {/* Monthly Export */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium mb-2">Ekspor Bulanan</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleExport('monthly')}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Ekspor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts and Modals */}
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={hideAlert}
          />
        )}
        <ConfirmationModal
          isOpen={isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          title={options?.title || ''}
          message={options?.message || ''}
          confirmText={options?.confirmText}
          cancelText={options?.cancelText}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
