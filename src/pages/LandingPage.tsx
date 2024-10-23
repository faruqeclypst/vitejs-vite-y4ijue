import React, { useEffect, useState } from 'react';
import { Users, ClipboardList, UserCheck, Clock, Home, UserCircle } from 'lucide-react';
import { useTeachers } from '../contexts/TeachersContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/StudentContext';
import { useAsrama } from '../contexts/AsramaContext';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { DayOfWeek, Student, StudentLeave } from '../types';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers } = useTeachers();
  const { attendanceRecords } = useAttendance();
  const { roster } = useRoster();
  const { students } = useStudents();
  const { asramas } = useAsrama();
  const { leaves } = useStudentLeave();
  const [stats, setStats] = useState<Array<{ 
    title: string; 
    value: number; 
    icon: React.ElementType; 
    color: string 
  }>>([]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'piket' || user?.role === 'wakil_kepala') {
      // Stats untuk admin dan piket
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
    } else if (user?.role === 'admin_asrama' || user?.role === 'pengasuh') {
      // Stats untuk admin asrama dan pengasuh
      const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).split(',')[0];
      
      let relevantStudents = students;
      let relevantAsramas = asramas;
      
      // Jika pengasuh, filter berdasarkan asrama yang ditangani
      if (user.role === 'pengasuh' && user.asramaId) {
        relevantStudents = students.filter((s: Student) => s.asrama === user.asramaId);
        relevantAsramas = asramas.filter(a => a.id === user.asramaId);
      }

      const activeLeavesToday = leaves.filter((leave: StudentLeave) => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const todayDate = new Date(today);
        return startDate <= todayDate && endDate >= todayDate;
      });

      setStats([
        { 
          title: "Total Asrama", 
          value: relevantAsramas.length, 
          icon: Home, 
          color: "bg-blue-500 text-white" 
        },
        { 
          title: "Total Siswa", 
          value: relevantStudents.length, 
          icon: Users, 
          color: "bg-green-500 text-white" 
        },
        { 
          title: "Siswa Laki-laki", 
          value: relevantStudents.filter((s: Student) => s.gender === 'Laki-laki').length, 
          icon: UserCircle, 
          color: "bg-yellow-500 text-white" 
        },
        { 
          title: "Siswi Perempuan", 
          value: relevantStudents.filter((s: Student) => s.gender === 'Perempuan').length, 
          icon: UserCircle, 
          color: "bg-indigo-500 text-white" 
        },
        { 
          title: "Izin Aktif", 
          value: activeLeavesToday.length, 
          icon: Clock, 
          color: "bg-purple-500 text-white" 
        },
        { 
          title: "Total Izin Bulan Ini", 
          value: leaves.filter((leave: StudentLeave) => 
            new Date(leave.startDate).getMonth() === new Date().getMonth()
          ).length, 
          icon: Clock, 
          color: "bg-pink-500 text-white" 
        },
      ]);
    }
  }, [user, teachers, attendanceRecords, roster, students, asramas, leaves]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Header userRole={user?.role} />
        <StatsGrid stats={stats} />
      </div>
    </div>
  );
};

const Header: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const title = userRole === 'admin_asrama' || userRole === 'pengasuh' 
    ? "Manajemen Asrama" 
    : "Piket MOSA";
  
  const subtitle = userRole === 'admin_asrama' || userRole === 'pengasuh'
    ? "Kelola data siswa dan asrama dalam satu platform."
    : "Kelola Jam dan kehadiran Guru dengan mudah dalam satu platform.";

  return (
    <div className="text-center mb-12">
      <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
        {title}
      </h1>
      <p className="mt-6 text-xl text-gray-600 sm:text-2xl max-w-3xl mx-auto">
        {subtitle}
      </p>
    </div>
  );
};

// StatsGrid component tetap sama
const StatsGrid: React.FC<{ stats: Array<{ title: string; value: number; icon: React.ElementType; color: string }> }> = ({ stats }) => (
  <div className="mt-12">
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((item, index) => (
        <div
          key={item.title}
          className={`relative overflow-hidden rounded-xl ${item.color} shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
            item.title.startsWith('Jam') ? 'block' : 'hidden sm:block'
          }`}
          style={{animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`}}
        >
          <div className="px-6 py-8">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-opacity-20 bg-white p-4">
                <item.icon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6 w-0 flex-1">
                <dt className="truncate text-lg font-bold text-gray-100">
                  {item.title}
                </dt>
                <dd className="mt-2 text-4xl font-semibold text-white">
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
