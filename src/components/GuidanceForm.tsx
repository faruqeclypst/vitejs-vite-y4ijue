import React, { useState, useEffect, useMemo } from 'react';
import { Student, GuidanceStage, guidanceDetails, Guidance, Violation } from '../types';
import Modal from './Modal';
import { useGuidance } from '../contexts/GuidanceContext';
import { useTeachers } from '../contexts/TeachersContext'; // Import useTeachers
import { Search } from 'lucide-react'; // Import icon

interface GuidanceFormProps {
  onSubmit: (guidance: Omit<Guidance, 'id'>) => void;
  initialGuidance?: Guidance | null;
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  unhandledViolations: Violation[];
  selectedViolationId?: string;
  selectedStudentId?: string;
}

const GuidanceForm: React.FC<GuidanceFormProps> = ({ 
  onSubmit, 
  initialGuidance,
  isOpen,
  onClose,
  students,
  unhandledViolations,
  selectedViolationId,
  selectedStudentId
}) => {
  const [studentId, setStudentId] = useState(selectedStudentId || '');
  const [violationId, setViolationId] = useState(selectedViolationId || '');
  const [guidanceStage, setGuidanceStage] = useState<GuidanceStage>('Tahap 1');
  const [guidanceDetail, setGuidanceDetail] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [conductedBy, setConductedBy] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const { teachers } = useTeachers(); // Get active teachers
  const { guidances } = useGuidance();

  // Dapatkan riwayat pembinaan untuk pelanggaran yang dipilih
  const violationGuidances = useMemo(() => {
    if (!selectedViolationId) return [];
    return guidances
      .filter(g => g.violationId === selectedViolationId)
      .sort((a, b) => new Date(b.conductedAt).getTime() - new Date(a.conductedAt).getTime()); // Sort descending
  }, [selectedViolationId, guidances]);

  // Filter teachers berdasarkan pencarian
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter(teacher => 
        teacher.name.toLowerCase().includes(searchTeacher.toLowerCase()) ||
        teacher.code.toLowerCase().includes(searchTeacher.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, searchTeacher]);

  // Set initial values when editing or when violation is selected
  useEffect(() => {
    if (initialGuidance) {
      // Jika mode edit, set semua nilai
      setStudentId(initialGuidance.studentId);
      setViolationId(initialGuidance.violationId);
      setGuidanceStage(initialGuidance.guidanceStage);
      setGuidanceDetail(initialGuidance.guidanceDetail);
      setDescription(initialGuidance.description);
      setNotes(initialGuidance.notes);
      setConductedBy(initialGuidance.conductedBy);
    } else if (selectedViolationId && selectedStudentId) {
      // Jika mode tambah baru
      setStudentId(selectedStudentId);
      setViolationId(selectedViolationId);

      // Jika ada pembinaan sebelumnya
      const lastGuidance = violationGuidances[0];
      if (lastGuidance) {
        // Set nilai default dari pembinaan terakhir
        setGuidanceStage(lastGuidance.guidanceStage);
        setGuidanceDetail(lastGuidance.guidanceDetail);
        setConductedBy(lastGuidance.conductedBy); // Pertahankan guru pembina
        
        // Reset deskripsi dan catatan
        setDescription('');
        setNotes('');
      } else {
        // Jika belum ada pembinaan sebelumnya
        setGuidanceStage('Tahap 1');
        setGuidanceDetail('');
        setDescription('');
        setNotes('');
        setConductedBy('');
      }
    }
  }, [initialGuidance, selectedViolationId, selectedStudentId, violationGuidances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conductedBy) {
      alert('Pilih guru pembina terlebih dahulu');
      return;
    }

    onSubmit({
      violationId,
      studentId,
      guidanceStage,
      guidanceDetail,
      description,
      notes,
      conductedBy, // Include selected teacher
      conductedAt: new Date().toISOString(),
      resolveViolation: false
    });

    // Reset form
    setStudentId('');
    setViolationId('');
    setGuidanceStage('Tahap 1');
    setGuidanceDetail('');
    setDescription('');
    setNotes('');
    setConductedBy('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialGuidance ? 'Edit Pembinaan' : 'Tambah Pembinaan'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Info Siswa */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Siswa yang Dibina</h3>
          {selectedStudentId ? (
            <div className="text-gray-700">
              {students.find(s => s.id === selectedStudentId)?.fullName}
            </div>
          ) : (
            <div className="text-gray-500">
              Pilih siswa terlebih dahulu
            </div>
          )}
        </div>

        {/* Step 2: Info Pelanggaran dan Riwayat Pembinaan */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Pelanggaran yang Dibina</h3>
          {selectedViolationId ? (
            <div className="space-y-4">
              {/* Detail Pelanggaran */}
              {unhandledViolations
                .filter(v => v.id === selectedViolationId)
                .map(violation => (
                  <div key={violation.id} className="p-3 rounded-lg bg-white border">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      violation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-800' :
                      violation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {violation.violationType}
                    </span>
                    <p className="mt-1 font-medium">{violation.violationDetail}</p>
                    <p className="text-sm text-gray-600">{violation.description}</p>
                  </div>
                ))}

              {/* Riwayat Pembinaan */}
              {violationGuidances.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Riwayat Pembinaan:</h4>
                  <div className="space-y-3">
                    {violationGuidances.map((guidance) => (
                      <div key={guidance.id} className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              guidance.guidanceStage === 'Tahap 1' ? 'bg-yellow-50 text-yellow-700' :
                              guidance.guidanceStage === 'Tahap 2' ? 'bg-orange-50 text-orange-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {guidance.guidanceStage}
                            </span>
                            <p className="mt-2 text-sm font-medium">{guidance.guidanceDetail}</p>
                            <p className="mt-1 text-sm text-gray-600">{guidance.description}</p>
                            {guidance.notes && (
                              <p className="mt-1 text-sm text-gray-500">
                                Catatan: {guidance.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(guidance.conductedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              Pilih pelanggaran terlebih dahulu
            </div>
          )}
        </div>

        {/* Step 3: Detail Pembinaan */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Detail Pembinaan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahap Pembinaan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Tahap 1', 'Tahap 2', 'Tahap 3'] as GuidanceStage[]).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => {
                      setGuidanceStage(stage);
                      setGuidanceDetail(''); // Reset detail saat ganti tahap
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      stage === guidanceStage
                        ? stage === 'Tahap 1' ? 'bg-yellow-500 text-white' :
                          stage === 'Tahap 2' ? 'bg-orange-500 text-white' :
                          'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Pembinaan
              </label>
              <div className="grid grid-cols-2 gap-2">
                {guidanceDetails[guidanceStage].map((detail) => (
                  <button
                    key={detail}
                    type="button"
                    onClick={() => setGuidanceDetail(detail)}
                    className={`p-2 rounded-lg transition-colors ${
                      guidanceDetail === detail
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {detail}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi Pembinaan
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-lg min-h-[100px]"
                required
                placeholder="Jelaskan proses pembinaan yang dilakukan..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Tambahan (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Tambahkan catatan jika diperlukan..."
              />
            </div>
          </div>
        </div>

        {/* Teacher Selection */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Guru Pembina</h3>
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari guru..."
                value={searchTeacher}
                onChange={(e) => {
                  setSearchTeacher(e.target.value);
                  setIsTeacherDropdownOpen(true);
                }}
                onFocus={() => setIsTeacherDropdownOpen(true)}
                className="w-full p-2 pl-8 border rounded-lg"
              />
              <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Selected Teacher */}
            {conductedBy && (
              <div className="mt-2">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-700">
                    {teachers.find(t => t.id === conductedBy)?.name}
                  </div>
                  <div className="text-sm text-blue-600">
                    {teachers.find(t => t.id === conductedBy)?.code}
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Dropdown */}
            {isTeacherDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      onClick={() => {
                        setConductedBy(teacher.id);
                        setSearchTeacher('');
                        setIsTeacherDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{teacher.name}</div>
                      <div className="text-sm text-gray-600">{teacher.code}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-gray-500">
                    Tidak ada guru yang ditemukan
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!violationId || !guidanceDetail || !conductedBy}
            className={`px-4 py-2 rounded-lg ${
              !violationId || !guidanceDetail || !conductedBy
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {initialGuidance ? 'Update' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default GuidanceForm;
