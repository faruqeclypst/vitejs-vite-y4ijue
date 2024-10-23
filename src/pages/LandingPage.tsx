import React, { useEffect, useState } from 'react';
import { Users, ClipboardList, UserCheck, Clock } from 'lucide-react';
import { useTeachers } from '../contexts/TeachersContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { DayOfWeek } from '../types';

const LandingPage: React.FC = () => {
  const { teachers } = useTeachers();
  const { attendanceRecords } = useAttendance();
  const { roster } = useRoster();
  const [stats, setStats] = useState([
    { title: "Semua Guru ", value: 0, icon: Users, color: "bg-blue-500 text-white" },
    { title: "Guru Mengajar", value: 0, icon: UserCheck, color: "bg-green-500 text-white" },
    { title: "Jumlah Kelas", value: 18, icon: ClipboardList, color: "bg-yellow-500 text-white" },
    { title: "Jam Tersedia", value: 0, icon: Clock, color: "bg-indigo-500 text-white" },
    { title: "Jam Hadir", value: 0, icon: Clock, color: "bg-purple-500 text-white" },
    { title: "Jam Tidak Hadir", value: 0, icon: Clock, color: "bg-pink-500 text-white" },
  ]);

  useEffect(() => {
    const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0];
    const dayOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay() - 1] as DayOfWeek;
  
    const todayRoster = roster.filter(entry => entry.dayOfWeek === dayOfWeek);
    const teachersWithRosterToday = new Set(todayRoster.map(entry => entry.teacherId));
  
    const todayAttendance = attendanceRecords.filter(record => record.date === today);
  
    const totalAvailableHours = todayRoster.reduce((sum, entry) => sum + entry.hours.length, 0);
    const totalPresentHours = todayAttendance.reduce((sum, record) => sum + (record.presentHours?.length || 0), 0);
    const totalAbsentHours = totalAvailableHours - totalPresentHours;
  
    setStats([
      { title: `Semua Guru`, value: teachers.length, icon: Users, color: "bg-blue-500 text-white" },
      { title: `Guru Mengajar (${dayOfWeek})`, value: teachersWithRosterToday.size, icon: UserCheck, color: "bg-green-500 text-white" },
      { title: "Jumlah Kelas", value: 18, icon: ClipboardList, color: "bg-yellow-500 text-white" },
      { title: `Jam Tersedia (${dayOfWeek})`, value: totalAvailableHours, icon: Clock, color: "bg-indigo-500 text-white" },
      { title: `Jam Hadir (${dayOfWeek})`, value: totalPresentHours, icon: Clock, color: "bg-purple-500 text-white" },
      { title: `Jam Tidak Hadir (${dayOfWeek})`, value: totalAbsentHours, icon: Clock, color: "bg-pink-500 text-white" },
    ]);
  }, [teachers, attendanceRecords, roster]);
    
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <StatsGrid stats={stats} />
      </div>
    </div>
  );
};

const Header: React.FC = () => (
  <div className="text-center mb-12">
    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
      Piket MOSA
    </h1>
    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
      Kelola Jam dan kehadiran Guru dengan mudah dalam satu platform.
    </p>
  </div>
);

const StatsGrid: React.FC<{ stats: Array<{ title: string; value: number; icon: React.ElementType; color: string }> }> = ({ stats }) => (
  <div className="mt-10">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((item, index) => (
        <div
          key={item.title}
          className={`relative overflow-hidden rounded-lg ${item.color} shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
            item.title.startsWith('Jam') ? 'block' : 'hidden sm:block'
          }`}
          style={{animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`}}
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-opacity-20 bg-white p-3">
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="truncate text-sm font-bold text-gray-100">
                  {item.title}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-white">
                  {item.value}
                </dd>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-20"></div>
        </div>
      ))}
    </div>
  </div>
);

export default LandingPage;