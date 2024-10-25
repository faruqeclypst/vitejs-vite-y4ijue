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

  const isAdmin = user?.role === 'admin'; 

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdmin) {
      const newDate = e.target.value;
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
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Absensi Guru
            </h1>
            <span className="text-lg font-medium text-gray-600">
              {currentDay || 'Minggu'}
            </span>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-md rounded-lg p-4">
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal:
                </label>
                <input
                  type="date"
                  id="date"
                  value={currentDate}
                  onChange={handleDateChange}
                  disabled={!isAdmin}
                  className="w-full rounded-lg border-gray-300 focus:ring-blue-500"
                />
              </div>
            </div>

            {currentDay ? (
              currentRoster.length > 0 ? (
                <AttendanceTable
                  roster={currentRoster}
                  teachers={teachers}
                  onSubmit={handleAttendanceSubmit}
                  existingAttendance={filteredAttendanceRecords}
                  confirmedTeachers={confirmedTeachers}
                />
              ) : (
                <p className="text-gray-500 italic">Tidak ada entri roster untuk hari ini.</p>
              )
            ) : (
              <p className="text-gray-500 italic">Tidak ada jadwal untuk hari Minggu.</p>
            )}
          </div>

          {/* Export Section */}
          {isAdmin && (
            <div className="bg-white shadow-md rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-6">Ekspor Data Kehadiran</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom Export */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Ekspor Kustom</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={exportStartDate.toISOString().split('T')[0]}
                        onChange={(e) => handleExportStartDateChange(new Date(e.target.value))}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Akhir
                      </label>
                      <input
                        type="date"
                        value={exportEndDate.toISOString().split('T')[0]}
                        onChange={(e) => handleExportEndDateChange(new Date(e.target.value))}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                    <button
                      onClick={() => handleExport('custom')}
                      className="w-full btn-primary"
                    >
                      Ekspor Data Kustom
                    </button>
                  </div>
                </div>

                {/* Monthly Export */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Ekspor Bulanan</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bulan
                      </label>
                      <select
                        value={exportMonth}
                        onChange={(e) => setExportMonth(parseInt(e.target.value))}
                        className="w-full rounded-lg border-gray-300"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tahun
                      </label>
                      <select
                        value={exportYear}
                        onChange={(e) => setExportYear(parseInt(e.target.value))}
                        className="w-full rounded-lg border-gray-300"
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={new Date().getFullYear() - i}>
                            {new Date().getFullYear() - i}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleExport('monthly')}
                      className="w-full btn-success"
                    >
                      Ekspor Data Bulanan
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
              duration={alert.duration}
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
    </div>
  );
};

export default AttendancePage;
