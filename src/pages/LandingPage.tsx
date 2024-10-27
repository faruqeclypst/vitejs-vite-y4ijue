import React, { useEffect, useState, useRef } from 'react';
import { Users, ClipboardList, Calendar, UserCheck } from 'lucide-react';
import { useTeachers } from '../contexts/TeachersContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { DayOfWeek, StudentLeave, Barak } from '../types';

// Tambahkan interface StatsItem
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
  const { baraks } = useBarak();
  const { leaves } = useStudentLeave();
  const [stats, setStats] = useState<StatsItem[]>([]);

  useEffect(() => {
    // Admin master dapat melihat semua statistik
    if (user?.role === 'admin_master') {
      const dayOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay() - 1] as DayOfWeek;
      
      // Stats akademik
      const todayRoster = roster.filter(entry => entry.dayOfWeek === dayOfWeek);
      const teachersWithRosterToday = new Set(todayRoster.map(entry => entry.teacherId));
      const todayAttendance = attendanceRecords.filter(record => 
        record.date === new Date().toISOString().split('T')[0]
      );
      const totalAvailableHours = todayRoster.reduce((sum, entry) => sum + entry.hours.length, 0);
      const totalPresentHours = todayAttendance.reduce((sum, record) => sum + (record.presentHours?.length || 0), 0);
      const totalAbsentHours = totalAvailableHours - totalPresentHours;

      // Stats asrama
      const activeStudents = students.filter(s => !s.isDeleted);
      const maleStudents = activeStudents.filter(s => s.gender === 'Laki-laki').length;
      const femaleStudents = activeStudents.filter(s => s.gender === 'Perempuan').length;
      const activeLeavesToday = leaves.filter(leave => {
        const today = new Date().toISOString().split('T')[0];
        const student = students.find(s => s.id === leave.studentId);
        return leave.startDate === today && student && !student.isDeleted;
      });
      const completedLeaves = leaves.filter(leave => {
        const student = students.find(s => s.id === leave.studentId);
        return leave.returnStatus === 'Sudah Kembali' && student && !student.isDeleted;
      });

      setStats([
        // Stats Akademik
        { title: `Semua Guru`, value: teachers.length, icon: Users, color: "bg-blue-500 text-white" },
        { title: `Guru Mengajar (${dayOfWeek})`, value: teachersWithRosterToday.size, icon: UserCheck, color: "bg-green-500 text-white" },
        { title: "Jumlah Kelas", value: 18, icon: ClipboardList, color: "bg-yellow-500 text-white" },
        { title: `Jam Tersedia (${dayOfWeek})`, value: totalAvailableHours, icon: Calendar, color: "bg-indigo-500 text-white" },
        { title: `Jam Hadir (${dayOfWeek})`, value: totalPresentHours, icon: Calendar, color: "bg-purple-500 text-white" },
        { title: `Jam Tidak Hadir (${dayOfWeek})`, value: totalAbsentHours, icon: Calendar, color: "bg-pink-500 text-white" },
        
        // Stats Asrama
        { title: 'Total Siswa', value: activeStudents.length, icon: Users, color: "bg-blue-500 text-white" },
        { title: 'Total Barak', value: baraks.length, icon: ClipboardList, color: "bg-green-500 text-white" },
        { title: 'Perizinan Aktif', value: activeLeavesToday.length, icon: UserCheck, color: "bg-yellow-500 text-white" },
        { title: 'Siswa Laki-laki', value: maleStudents, icon: Users, color: "bg-indigo-500 text-white" },
        { title: 'Siswi Perempuan', value: femaleStudents, icon: Users, color: "bg-pink-500 text-white" },
        { title: 'Perizinan Selesai', value: completedLeaves.length, icon: UserCheck, color: "bg-purple-500 text-white" }
      ]);
    }
    // Stats untuk admin dan piket
    else if (user?.role === 'admin' || user?.role === 'piket' || user?.role === 'wakil_kepala') {
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
        { title: `Jam Tersedia (${dayOfWeek})`, value: totalAvailableHours, icon: Calendar, color: "bg-indigo-500 text-white" },
        { title: `Jam Hadir (${dayOfWeek})`, value: totalPresentHours, icon: Calendar, color: "bg-purple-500 text-white" },
        { title: `Jam Tidak Hadir (${dayOfWeek})`, value: totalAbsentHours, icon: Calendar, color: "bg-pink-500 text-white" },
      ]);
    }
    // Stats untuk admin_asrama dan pengasuh
    else if (user?.role === 'admin_asrama' || user?.role === 'pengasuh') {
      // Stats untuk admin_asrama dan pengasuh
      let relevantStudents = students;
      let relevantBaraks = baraks;
      let userBaraks: string[] = [];
      
      if (user.role === 'pengasuh' && user.barakId) {
        // Dapatkan nama-nama barak yang dikelola pengasuh
        const barakIds = user.barakId.split(',');
        userBaraks = baraks
          .filter((barak: Barak) => barakIds.includes(barak.id))
          .map((barak: Barak) => barak.name);
        
        // Filter siswa berdasarkan barak yang dikelola
        relevantStudents = students.filter(s => userBaraks.includes(s.barak));
        relevantBaraks = baraks.filter((barak: Barak) => barakIds.includes(barak.id));
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
        { title: 'Total Barak', value: relevantBaraks.length, icon: ClipboardList, color: "bg-green-500 text-white" },
        { title: 'Perizinan Aktif', value: activeLeavesToday.length, icon: UserCheck, color: "bg-yellow-500 text-white" },
        { title: 'Siswa Laki-laki', value: maleStudents, icon: Users, color: "bg-indigo-500 text-white" },
        { title: 'Siswi Perempuan', value: femaleStudents, icon: Users, color: "bg-pink-500 text-white" },
        { title: 'Perizinan Selesai', value: completedLeaves.length, icon: UserCheck, color: "bg-purple-500 text-white" }
      ]);
    }
  }, [user, teachers, attendanceRecords, roster, students, baraks, leaves]);

  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-6">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4">
          <Header userRole={user?.role} />
          <StatsGrid stats={stats} />
        </div>
      </div>
    </>
  );
};

const Header: React.FC<{ userRole?: string }> = ({ userRole }) => {
  let title = "Piket MOSA";
  let subtitle = "Kelola Jam dan kehadiran Guru dengan mudah dalam satu platform.";

  if (userRole === 'admin_master') {
    title = "Dashboard Admin Master";
    subtitle = "Kelola seluruh data akademik dan asrama dalam satu platform.";
  } else if (userRole === 'admin_asrama' || userRole === 'pengasuh') {
    title = "Manajemen Asrama";
    subtitle = "Kelola data siswa dan barak dalam satu platform.";
  }

  return (
    <div className="text-center mb-6 sm:mb-12">
      <h1 className="h1">{title}</h1>
      <p className="mt-3 sm:mt-6 text-base sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto px-2">
        {subtitle}
      </p>
    </div>
  );
};

const StatsGrid: React.FC<{ stats: StatsItem[] }> = ({ stats }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTab, setActiveTab] = useState(0); // 0: Akademik, 1: Asrama
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pisahkan stats berdasarkan kategori
  const academicStats = stats.filter(stat => 
    ['Guru', 'Kelas', 'Jam'].some(keyword => stat.title.includes(keyword))
  );
  
  const dormitoryStats = stats.filter(stat => 
    ['Siswa', 'Barak', 'Perizinan'].some(keyword => stat.title.includes(keyword))
  );

  const currentStats = activeTab === 0 ? academicStats : dormitoryStats;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const x = e.touches[0].pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="relative">
      {/* Tab Navigation */}
      {stats.length > 6 && (
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab(0)}
            className={`px-6 py-2 rounded-full transition-all duration-300 
              ${activeTab === 0 
                ? 'bg-blue-500 text-white shadow-lg scale-105' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Akademik
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`px-6 py-2 rounded-full transition-all duration-300
              ${activeTab === 1 
                ? 'bg-blue-500 text-white shadow-lg scale-105' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Asrama
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div 
        ref={scrollRef}
        className="mt-4 sm:mt-12 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="grid grid-cols-2 xs:grid-cols-2 lg:grid-cols-3 auto-rows-max gap-2 sm:gap-6 lg:gap-8 min-w-[300px]">
          {currentStats.map((item, index) => (
            <div
              key={item.title}
              className={`relative overflow-hidden rounded-lg ${item.color} shadow-sm 
                transition-all duration-300 cursor-pointer group
                hover:shadow-xl hover:-translate-y-1`}
              style={{animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`}}
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              <div className="px-3 py-3 sm:px-6 sm:py-8">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-lg bg-opacity-20 bg-white p-1.5 sm:p-4
                    transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                    <item.icon className="h-4 w-4 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="ml-2 sm:ml-6 w-0 flex-1">
                    <dt className="truncate text-xs sm:text-base lg:text-lg font-bold text-gray-100">
                      {item.title}
                    </dt>
                    <dd className="mt-0.5 sm:mt-2 text-lg sm:text-3xl lg:text-4xl font-semibold text-white
                      transition-all duration-300 group-hover:scale-110">
                      {item.value}
                    </dd>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white bg-opacity-20
                transition-transform duration-300 group-hover:scale-x-110"></div>
              
              {/* Shine effect on hover */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform 
                -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
