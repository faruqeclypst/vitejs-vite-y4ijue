import React, { useEffect, useState } from 'react';
import { Users, ClipboardList, UserCheck, Clock } from 'lucide-react';
import { useTeachers } from '../contexts/TeachersContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/StudentContext';
import { useAsrama } from '../contexts/AsramaContext';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { DayOfWeek, StudentLeave } from '../types';

interface StatsItem {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers } = useTeachers();
  const { attendanceRecords } = useAttendance();
  const { roster } = useRoster();
  const { students } = useStudents();
  const { asramas } = useAsrama();
  const { leaves } = useStudentLeave();
  const [stats, setStats] = useState<StatsItem[]>([]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'piket' || user?.role === 'wakil_kepala') {
      // Stats untuk admin dan piket
      const dayOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay() - 1] as DayOfWeek;
    
      const todayRoster = roster.filter(entry => entry.dayOfWeek === dayOfWeek);
      const teachersWithRosterToday = new Set(todayRoster.map(entry => entry.teacherId));
    
      const todayAttendance = attendanceRecords.filter(record => 
        record.date === new Date().toISOString().split('T')[0]
      );
    
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
      let relevantStudents = students;
      let relevantAsramas = asramas;
      let userBaraks: string[] = [];
      
      if (user.role === 'pengasuh' && user.barakId) {
        // Dapatkan nama-nama barak yang dikelola pengasuh
        const barakIds = user.barakId.split(',');
        userBaraks = asramas
          .filter(a => barakIds.includes(a.id))
          .map(a => a.name);
        
        // Filter siswa berdasarkan barak yang dikelola
        relevantStudents = students.filter(s => userBaraks.includes(s.barak));
        relevantAsramas = asramas.filter(a => barakIds.includes(a.id));
      }

      const activeLeavesToday = leaves.filter((leave: StudentLeave) => {
        const today = new Date().toISOString().split('T')[0];
        const student = students.find(s => s.id === leave.studentId);
        // Hanya hitung perizinan dari siswa yang aktif (tidak dihapus)
        if (user.role === 'pengasuh') {
          return leave.startDate === today && 
                 student && 
                 !student.isDeleted && 
                 userBaraks.includes(student.barak);
        }
        return leave.startDate === today && student && !student.isDeleted;
      });

      // Hitung jumlah siswa berdasarkan jenis kelamin
      const maleStudents = relevantStudents.filter(s => s.gender === 'Laki-laki').length;
      const femaleStudents = relevantStudents.filter(s => s.gender === 'Perempuan').length;

      // Hitung perizinan yang sudah selesai
      const completedLeaves = leaves.filter((leave: StudentLeave) => {
        const student = students.find(s => s.id === leave.studentId);
        // Hanya hitung perizinan dari siswa yang aktif (tidak dihapus)
        if (user.role === 'pengasuh') {
          return leave.returnStatus === 'Sudah Kembali' && 
                 student && 
                 !student.isDeleted && 
                 userBaraks.includes(student.barak);
        }
        return leave.returnStatus === 'Sudah Kembali' && student && !student.isDeleted;
      });

      setStats([
        { title: 'Total Siswa', value: relevantStudents.length, icon: Users, color: "bg-blue-500 text-white" },
        { title: 'Total Barak', value: relevantAsramas.length, icon: ClipboardList, color: "bg-green-500 text-white" },
        { title: 'Perizinan Aktif', value: activeLeavesToday.length, icon: UserCheck, color: "bg-yellow-500 text-white" },
        { title: 'Siswa Laki-laki', value: maleStudents, icon: Users, color: "bg-indigo-500 text-white" },
        { title: 'Siswa Perempuan', value: femaleStudents, icon: Users, color: "bg-pink-500 text-white" },
        { title: 'Perizinan Selesai', value: completedLeaves.length, icon: UserCheck, color: "bg-purple-500 text-white" }
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
    ? "Kelola data siswa dan barak dalam satu platform."
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

const StatsGrid: React.FC<{ stats: StatsItem[] }> = ({ stats }) => (
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
