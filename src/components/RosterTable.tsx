import React, { useState, Suspense } from 'react';
import { RosterEntry, Teacher, RosterHistory } from '../types';
import { useAttendance } from '../contexts/AttendanceContext';
import RosterForm from './RosterForm';
import { ChevronDown, ChevronUp, Edit, Trash2, Plus, Calendar, Search, Clock } from 'lucide-react';
import Modal from './Modal';
import LoadingSpinner from './common/LoadingSpinner';
import { useRoster } from '../contexts/RosterContext';
import useConfirmation from '../hooks/useConfirmation';

interface AttendanceRecord {
  id: string;
  rosterId: string;
  date: string;
  presentHours: number[];
  keterangan: string;
}

// Komponen AttendanceDetail
interface AttendanceDetailProps {
  teacherId: string;
  teacherName: string;
  onClose: () => void;
  roster: RosterEntry[];
}

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ 
  teacherId, 
  teacherName, 
  onClose, 
  roster 
}) => {
  const { attendanceRecords, deleteAttendanceRecord } = useAttendance();
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Filter attendance records untuk guru ini
  const teacherAttendance = attendanceRecords.filter((record: AttendanceRecord) => {
    const rosterEntry = roster.find(r => r.id === record.rosterId);
    return rosterEntry?.teacherId === teacherId;
  });

  // Group attendance by date
  const groupedAttendance = teacherAttendance.reduce((acc: Record<string, AttendanceRecord[]>, record: AttendanceRecord) => {
    if (!record || !record.date) return acc;
    
    if (!acc[record.date]) {
      acc[record.date] = [];
    }
    
    const safeRecord = {
      ...record,
      presentHours: record.presentHours || [],
      keterangan: record.keterangan || ''
    };
    
    acc[record.date].push(safeRecord);
    return acc;
  }, {});

  const handleDelete = async (attendanceId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data kehadiran ini?')) {
      await deleteAttendanceRecord(attendanceId);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Detail Kehadiran - ${teacherName}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="mb-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="space-y-4">
          {Object.entries(groupedAttendance)
            .filter(([date]) => !selectedDate || date === selectedDate)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, records]) => (
              <div key={date} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-gray-500" size={20} />
                    <span className="font-semibold">
                      {new Date(date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {(records as AttendanceRecord[]).map((record: AttendanceRecord) => {
                    if (!record || !record.id) return null;
                    
                    const rosterEntry = roster.find(r => r.id === record.rosterId);
                    if (!rosterEntry) return null;

                    const missingHours = rosterEntry.hours.filter(
                      hour => !record.presentHours?.includes(hour)
                    );
                    
                    return (
                      <div key={record.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <div className="font-medium">{rosterEntry.classId}</div>
                          <div className="text-sm text-gray-500">
                            Jam Hadir: JP {record.presentHours?.sort((a: number, b: number) => a - b).map((h: number) => ` ${h}`).join(',')}
                          </div>
                          {missingHours.length > 0 && (
                            <div className="text-sm text-red-500">
                              Jam Tidak Hadir: JP {missingHours.sort((a, b) => a - b).map(h => ` ${h}`).join(',')}
                            </div>
                          )}
                          {record.keterangan && (
                            <div className="text-sm text-gray-600 mt-1">
                              Keterangan: {record.keterangan}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
        {Object.keys(groupedAttendance).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Tidak ada data kehadiran
          </div>
        )}
      </div>
    </Modal>
  );
};

interface RosterTableProps {
  roster: RosterEntry[];
  teachers: Teacher[];
  onAdd: (entry: Omit<RosterEntry, 'id'>) => void;
  onUpdate: (id: string, entry: Omit<RosterEntry, 'id'>) => void;
  classes: string[];
}

// Tambahkan interface untuk RosterHistoryModal
interface RosterHistoryModalProps {
  rosterId: string;
  teacherName: string;
  onClose: () => void;
  rosterHistory: RosterHistory[];
}

// Komponen untuk menampilkan history
const RosterHistoryModal: React.FC<RosterHistoryModalProps> = ({
  rosterId,
  teacherName,
  onClose,
  rosterHistory
}) => {
  const sortedHistory = rosterHistory
    .filter(h => h.rosterId === rosterId)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Riwayat Perubahan Jadwal - ${teacherName}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {sortedHistory.length > 0 ? (
          sortedHistory.map((history, index) => (
            <div key={history.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  {index === 0 ? 'Jadwal Terkini' : `Perubahan ${sortedHistory.length - index}`}
                </span>
                <span className="text-xs text-gray-400">
                  Efektif: {new Date(history.effectiveFrom).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="space-y-2">
                <p className="font-medium">{history.dayOfWeek}</p>
                <p className="text-sm text-gray-600">{history.classId}</p>
                <p className="text-sm text-gray-500">Jam: {history.hours.sort((a: number, b: number) => a - b).join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            Belum ada riwayat perubahan
          </div>
        )}
      </div>
    </Modal>
  );
};

const RosterTable: React.FC<RosterTableProps> = ({ 
  roster, 
  teachers, 
  onAdd, 
  onUpdate, 
  classes 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openTeachers, setOpenTeachers] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [addingForTeacher, setAddingForTeacher] = useState<string | null>(null);
  const [showAttendanceDetail, setShowAttendanceDetail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const { confirm } = useConfirmation();
  const { deleteRoster, rosterHistory } = useRoster();

  const groupedRoster = roster.reduce((acc, entry) => {
    if (!acc[entry.teacherId]) {
      acc[entry.teacherId] = [];
    }
    acc[entry.teacherId].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.code.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleTeacher = (teacherId: string) => {
    setOpenTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleEdit = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleAddForTeacher = (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingForTeacher(teacherId);
    setIsModalOpen(true);
  };

  const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const sortEntries = (a: RosterEntry, b: RosterEntry) => {
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.classId.localeCompare(b.classId);
  };

  const handleSubmit = (entry: Omit<RosterEntry, 'id'>) => {
    if (editingEntry) {
      onUpdate(editingEntry.id, entry);
    } else {
      onAdd({ ...entry, teacherId: addingForTeacher! });
    }
    setIsModalOpen(false);
    setEditingEntry(null);
    setAddingForTeacher(null);
  };

  const handleDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Hapus Jadwal',
      message: 'Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (shouldDelete) {
      try {
        await deleteRoster(id);
      } catch (error) {
        console.error('Error deleting roster:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border rounded-lg"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Teacher List */}
      <div className="space-y-4">
        {filteredTeachers.map((teacher) => {
          const entries = groupedRoster[teacher.id] || [];
          const isOpen = openTeachers.includes(teacher.id);
          const sortedEntries = entries.sort(sortEntries);

          return (
            <div key={teacher.id} className="bg-white shadow-sm rounded-lg overflow-hidden border">
              <div
                onClick={() => toggleTeacher(teacher.id)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleAddForTeacher(teacher.id, e)}
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                      title="Tambah Jadwal Baru"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAttendanceDetail(teacher.id);
                      }}
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                      title="Lihat Detail Kehadiran"
                    >
                      <Calendar size={18} />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-gray-500">{teacher.code}</p>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isOpen && (
                <div className="p-4">
                  {sortedEntries.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedEntries.map((entry) => (
                        <div key={entry.id} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{entry.dayOfWeek}</p>
                              <p className="text-sm text-gray-600">{entry.classId}</p>
                              <p className="text-sm text-gray-500">Jam: {entry.hours.join(', ')}</p>
                              <div className="mt-2 text-xs text-gray-400">
                                <p>Dibuat: {new Date(entry.createdAt).toLocaleString('id-ID')}</p>
                                {entry.updatedAt && (
                                  <p>Diubah: {new Date(entry.updatedAt).toLocaleString('id-ID')}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setShowHistory(entry.id)}
                                className="text-blue-500 hover:text-blue-700 p-1"
                                title="Lihat Riwayat"
                              >
                                <Clock size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(entry)}
                                className="text-blue-500 hover:text-blue-700 p-1"
                                title="Edit Jadwal"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Hapus Jadwal"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Belum ada jadwal untuk guru ini</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RosterForm Modal */}
      {isModalOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <RosterForm
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
              setAddingForTeacher(null);
            }}
            teachers={teachers}
            classes={classes}
            onSubmit={handleSubmit}
            initialData={editingEntry}
            preselectedTeacherId={addingForTeacher}
          />
        </Suspense>
      )}

      {/* AttendanceDetail Modal */}
      {showAttendanceDetail && (
        <AttendanceDetail
          teacherId={showAttendanceDetail}
          teacherName={teachers.find(t => t.id === showAttendanceDetail)?.name || ''}
          onClose={() => setShowAttendanceDetail(null)}
          roster={roster}
        />
      )}

      {/* Tambahkan RosterHistoryModal */}
      {showHistory && (
        <RosterHistoryModal
          rosterId={showHistory}
          teacherName={teachers.find(t => t.id === addingForTeacher)?.name || ''}
          onClose={() => setShowHistory(null)}
          rosterHistory={rosterHistory}
        />
      )}
    </div>
  );
};

export default RosterTable;
