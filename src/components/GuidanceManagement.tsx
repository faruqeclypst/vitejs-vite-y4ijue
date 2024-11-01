import React, { useState, useMemo } from 'react';
import { useGuidance } from '../contexts/GuidanceContext';
import { useViolation } from '../contexts/ViolationContext';
import { useStudents } from '../contexts/StudentContext';
import { AlertCircle, User as UserIcon, CheckCircle, Search, Settings } from 'lucide-react';
import GuidanceForm from './GuidanceForm';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

const GuidanceManagement: React.FC = () => {
  const { addGuidance, getViolationGuidances } = useGuidance();
  const { violations, markViolationAsResolved } = useViolation();
  const { students } = useStudents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { alert, showAlert, hideAlert } = useAlert();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Group violations by student
  const groupedViolations = useMemo(() => {
    const unhandledViolations = violations.filter(v => !v.isResolved);
    return unhandledViolations.reduce((acc, violation) => {
      const student = students.find(s => s.id === violation.studentId);
      if (!student || student.isDeleted) return acc;

      // Filter berdasarkan pencarian
      const matchesSearch = 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.barak.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return acc;

      if (!acc[student.id]) {
        acc[student.id] = {
          student,
          violations: []
        };
      }
      acc[student.id].violations.push(violation);
      return acc;
    }, {} as Record<string, { student: typeof students[0]; violations: typeof violations }>) ;
  }, [violations, students, searchTerm]);

  const handleSubmit = async (guidanceData: any) => {
    try {
      await addGuidance(guidanceData);
      showAlert({
        type: 'success',
        message: 'Pembinaan berhasil disimpan'
      });
      setIsModalOpen(false);
      setSelectedViolation(null);
      setSelectedStudent(null);
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan pembinaan'
      });
    }
  };

  const handleResolveViolation = async (violationId: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Selesai',
      message: 'Apakah Anda yakin ingin menyelesaikan pelanggaran ini? Pelanggaran yang sudah diselesaikan tidak akan muncul di daftar pembinaan.',
      confirmText: 'Selesaikan',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await markViolationAsResolved(violationId);
        showAlert({
          type: 'success',
          message: 'Pelanggaran berhasil diselesaikan'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menyelesaikan pelanggaran'
        });
      }
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 z-[100]">
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={hideAlert}
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-8 border rounded-lg"
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(groupedViolations).map(([studentId, { student, violations }]) => {
            const unresolved = violations.filter(v => !v.isResolved).length;

            return (
              <div key={studentId} className="flex bg-white rounded-xl overflow-hidden">
                <div className="w-2 flex-shrink-0" style={{
                  background: violations.length > 1 
                    ? `linear-gradient(to bottom, ${
                        violations.map(v => 
                          v.violationType === 'Ringan' ? '#FACC15' :  // yellow-400
                          v.violationType === 'Sedang' ? '#F97316' :  // orange-500
                          '#EF4444'                                   // red-500
                        ).join(', ')
                    })`
                    : violations[0].violationType === 'Ringan' ? '#FACC15' :
                      violations[0].violationType === 'Sedang' ? '#F97316' :
                      '#EF4444'
                }} />
                
                <div className="flex-1 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{student.fullName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {student.class}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {student.barak}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {violations.length} Pelanggaran
                      </span>
                      {unresolved > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          {unresolved} Belum Selesai
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {violations.map((violation) => {
                      const hasGuidance = getViolationGuidances(violation.id).length > 0;
                      
                      return (
                        <div key={violation.id} className="space-y-2">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="mb-2">
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    violation.violationType === 'Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                    violation.violationType === 'Sedang' ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {violation.violationType}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">{violation.violationDetail}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{violation.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                              <div className="flex items-center text-xs text-gray-500">
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(violation.recordedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>

                              {/* Desktop buttons */}
                              <div className="hidden sm:flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedViolation(violation.id);
                                    setSelectedStudent(student.id);
                                    setIsModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                  {hasGuidance ? 'Lanjut Pembinaan' : 'Beri Pembinaan'}
                                </button>
                                <button
                                  onClick={() => handleResolveViolation(violation.id)}
                                  disabled={!hasGuidance}
                                  className={`px-3 py-1.5 text-sm flex items-center gap-1 rounded-lg ${
                                    hasGuidance 
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!hasGuidance ? 'Berikan pembinaan terlebih dahulu' : ''}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Selesaikan
                                </button>
                              </div>

                              {/* Mobile dropdown */}
                              <div className="sm:hidden relative">
                                <button
                                  onClick={() => setOpenActionId(openActionId === violation.id ? null : violation.id)}
                                  className="p-2 hover:bg-blue-50 rounded-lg"
                                >
                                  <Settings className="w-5 h-5 text-blue-500" />
                                </button>
                                
                                {openActionId === violation.id && (
                                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                                    <button
                                      onClick={() => {
                                        setSelectedViolation(violation.id);
                                        setSelectedStudent(student.id);
                                        setIsModalOpen(true);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                    >
                                      {hasGuidance ? 'Lanjut Pembinaan' : 'Beri Pembinaan'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleResolveViolation(violation.id);
                                        setOpenActionId(null);
                                      }}
                                      disabled={!hasGuidance}
                                      className={`w-full px-4 py-2 text-left text-sm ${
                                        hasGuidance 
                                          ? 'hover:bg-gray-100'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      Selesaikan
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(groupedViolations).length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm 
                ? 'Tidak ada hasil pencarian'
                : 'Tidak ada siswa yang perlu dibina'
              }
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Coba kata kunci lain'
                : 'Semua pelanggaran sudah ditangani'
              }
            </p>
          </div>
        )}

        {isModalOpen && selectedViolation && selectedStudent && (
          <GuidanceForm
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedViolation(null);
              setSelectedStudent(null);
            }}
            onSubmit={handleSubmit}
            students={students}
            unhandledViolations={violations.filter(v => !v.isResolved)}
            selectedViolationId={selectedViolation}
            selectedStudentId={selectedStudent}
          />
        )}
      </div>
    </div>
  );
};

export default GuidanceManagement;
