import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  School, 
  Home, 
  Clock as ClockIcon,
  UserCircle2,
  AlertTriangle
} from 'lucide-react';
import { useTeachers } from '../contexts/TeachersContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useRoster } from '../contexts/RosterContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/StudentContext';
import { useBarak } from '../contexts/BarakContext';
import { useStudentLeave } from '../contexts/StudentLeaveContext';
import { DayOfWeek } from '../types';
import { availableClasses } from '../types';
import { useViolation } from '../contexts/ViolationContext';

interface StatsItem {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  percentage?: number;
  trend?: 'up' | 'down';
}

interface StatsSectionProps {
  title: string;
  stats: StatsItem[];
}

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers } = useTeachers();
  const { attendanceRecords } = useAttendance();
  const { roster } = useRoster();
  const { students } = useStudents();
  const { baraks } = useBarak();
  const { leaves } = useStudentLeave();
  const { violations } = useViolation();
  const [academicStats, setAcademicStats] = useState<StatsItem[]>([]);
  const [dormitoryStats, setDormitoryStats] = useState<StatsItem[]>([]);

  useEffect(() => {
    const dayOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay() - 1] as DayOfWeek;
    
    const todayRoster = roster.filter(entry => entry.dayOfWeek === dayOfWeek);
    const todayAttendance = attendanceRecords.filter(record => 
      record.date === new Date().toISOString().split('T')[0]
    );
    
    const totalAvailableHours = todayRoster.reduce((sum, entry) => sum + entry.hours.length, 0);
    const totalPresentHours = todayAttendance.reduce((sum, record) => sum + (record.presentHours?.length || 0), 0);
    
    const activeStudents = students.filter(s => !s.isDeleted);
    const activeLeavesToday = leaves.filter(leave => {
      const today = new Date().toISOString().split('T')[0];
      return leave.startDate === today;
    });

    const academicStatsData = [
      {
        title: 'Total Guru',
        value: teachers.filter(t => !t.isDeleted).length,
        icon: Users,
        color: 'bg-blue-600'
      },
      {
        title: 'Kehadiran Guru',
        value: Math.round((totalPresentHours / totalAvailableHours) * 100) || 0,
        icon: UserCheck,
        color: 'bg-green-600'
      },
      {
        title: 'Total Kelas',
        value: availableClasses.length,
        icon: School,
        color: 'bg-emerald-600'
      },
      {
        title: 'Jam Tersedia',
        value: totalAvailableHours,
        icon: ClockIcon,
        color: 'bg-amber-600'
      },
      {
        title: 'Jam Hadir',
        value: totalPresentHours,
        icon: ClockIcon,
        color: 'bg-green-600'
      },
      {
        title: 'Jam Tidak Hadir',
        value: totalAvailableHours - totalPresentHours,
        icon: ClockIcon,
        color: 'bg-red-600'
      },
      {
        title: 'Guru Aktif',
        value: todayAttendance.length,
        icon: UserCheck,
        color: 'bg-violet-600'
      },
      {
        title: 'Siswa Izin',
        value: activeLeavesToday.length,
        icon: Calendar,
        color: 'bg-yellow-600'
      }
    ];

    const dormitoryStatsData = [
      {
        title: 'Total Siswa',
        value: activeStudents.length,
        icon: Users,
        color: 'bg-indigo-600'
      },
      {
        title: 'Siswa Laki-laki',
        value: activeStudents.filter(s => s.gender === 'Laki-laki').length,
        icon: UserCircle2,
        color: 'bg-blue-600'
      },
      {
        title: 'Siswa Perempuan',
        value: activeStudents.filter(s => s.gender === 'Perempuan').length,
        icon: UserCircle2,
        color: 'bg-pink-600'
      },
      {
        title: 'Total Barak',
        value: baraks.length,
        icon: Home,
        color: 'bg-rose-600'
      },
      {
        title: 'Barak Laki-laki', 
        value: baraks.filter(b => b.gender === 'Laki-laki').length,
        icon: Home,
        color: 'bg-blue-600'
      },
      {
        title: 'Barak Perempuan',
        value: baraks.filter(b => b.gender === 'Perempuan').length,
        icon: Home,
        color: 'bg-pink-600'
      },
      {
        title: 'Perizinan Aktif',
        value: activeLeavesToday.length,
        icon: Calendar,
        color: 'bg-cyan-600'
      },
      {
        title: 'Pelanggaran Aktif',
        value: violations.filter(v => !v.isResolved).length,
        icon: AlertTriangle,
        color: 'bg-red-600'
      }
    ];

    if (user?.role === 'admin_master') {
      setAcademicStats(academicStatsData);
      setDormitoryStats(dormitoryStatsData);
    } else if (user?.role === 'admin' || user?.role === 'piket') {
      setAcademicStats(academicStatsData);
      setDormitoryStats([]);
    } else if (user?.role === 'admin_asrama' || user?.role === 'pengasuh') {
      setAcademicStats([]);
      setDormitoryStats(dormitoryStatsData);
    }
  }, [user, teachers, attendanceRecords, roster, students, baraks, leaves, violations]);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        <Header userRole={user?.role} />
        <div className="grid gap-4">
          {academicStats.length > 0 && (
            <StatsSection title="Statistik Akademik" stats={academicStats} />
          )}
          {dormitoryStats.length > 0 && (
            <StatsSection title="Statistik Asrama" stats={dormitoryStats} />
          )}
        </div>
      </div>
    </div>
  );
};

interface HeaderProps {
  userRole?: string;
}

const Header: React.FC<HeaderProps> = ({ userRole }) => {
  let description = 'Ringkasan statistik dan aktivitas terkini';
  
  // Customize description based on userRole
  if (userRole === 'admin' || userRole === 'piket') {
    description = 'Ringkasan statistik akademik dan aktivitas terkini';
  } else if (userRole === 'admin_asrama' || userRole === 'pengasuh') {
    description = 'Ringkasan statistik asrama dan aktivitas terkini';
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 cursor-pointer" onClick={(e) => {
        const target = e.currentTarget.nextElementSibling as HTMLElement;
        if (target) {
          target.classList.toggle('hidden');
          target.classList.toggle('sm:block');
        }
      }}>Dashboard</h2>
      <p className="mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">{description}</p>
    </div>
  );
};

const StatsSection: React.FC<StatsSectionProps> = ({ title, stats }) => (
  <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
    <h2 className="text-lg font-semibold text-gray-800 tracking-tight mb-4">{title}</h2>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  </div>
);

const StatCard: React.FC<StatsItem> = ({ title, value, icon: Icon, color }) => {
  const textColorMap: { [key: string]: string } = {
    'bg-blue-600': 'text-blue-600',
    'bg-green-600': 'text-green-600', 
    'bg-emerald-600': 'text-emerald-600',
    'bg-yellow-600': 'text-yellow-600',
    'bg-indigo-600': 'text-indigo-600',
    'bg-rose-600': 'text-rose-600',
    'bg-cyan-600': 'text-cyan-600',
    'bg-red-600': 'text-red-600',
    'bg-violet-600': 'text-violet-600',
    'bg-amber-600': 'text-amber-600',
    'bg-pink-600': 'text-pink-600'
  };

  const textColorClass = textColorMap[color] || 'text-gray-600';
  const borderClass = color.replace('bg-', 'border-');
  
  return (
    <div className={`
      stat-card group
      p-3 sm:p-6 
      bg-white/90 hover:bg-white 
      rounded-xl shadow-sm 
      hover:shadow-md 
      transition-all duration-300
      border-b-[3px] 
      border-transparent
      ${borderClass} 
      backdrop-blur-sm
    `}>
      <div className="flex flex-col sm:flex-row items-center sm:space-x-4">
        <div className={`
          p-2 sm:p-3 rounded-lg 
          ${color} bg-opacity-10 
          mb-2 sm:mb-0
          transition-transform duration-300
          group-hover:scale-110
        `}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${textColorClass}`} />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs sm:text-sm text-gray-500/90 font-medium tracking-tight">{title}</p>
          <h3 className={`text-lg sm:text-2xl font-bold ${textColorClass} mt-0.5 sm:mt-1 tracking-tight`}>
            {value}
            {title.includes('Kehadiran') && '%'}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
