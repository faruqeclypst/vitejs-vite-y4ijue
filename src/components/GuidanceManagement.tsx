import React, { useState } from 'react';
import { useGuidance } from '../contexts/GuidanceContext';
import { useViolation } from '../contexts/ViolationContext';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { GuidanceStage, guidanceDetails } from '../types';
import { X, Plus, Search } from 'lucide-react';
import Alert from './Alert';
import useAlert from '../hooks/useAlert';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

const GuidanceManagement: React.FC = () => {
  const { guidances, addGuidance, updateGuidance, deleteGuidance } = useGuidance();
  const { getActiveViolations } = useViolation();
  const { students } = useStudents();
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<GuidanceStage>('Tahap 1');
  const [selectedDetail, setSelectedDetail] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const { alert, showAlert, hideAlert } = useAlert();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirmation();
  const [editingGuidance, setEditingGuidance] = useState<any>(null);

  // Tambahkan state untuk filter kelas
  const [selectedGrade, setSelectedGrade] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Filter siswa berdasarkan kelas, tanpa filter barak untuk pengasuh
  const filteredStudents = students.filter(student => {
    // Filter hanya berdasarkan kelas yang dipilih
    if (!selectedGrade) return true;
    return student.class.startsWith(selectedGrade);
  });

  // Ambil pelanggaran yang belum dibina
  const unhandledViolations = getActiveViolations().filter(violation => {
    const existingGuidance = guidances.find(g => g.violationId === violation.id);
    return !existingGuidance;
  });

  const handleEdit = async (guidance: any) => {
    setEditingGuidance(guidance);
    setSelectedStage(guidance.guidanceStage);
    setSelectedDetail(guidance.guidanceDetail);
    setDescription(guidance.description);
    setNotes(guidance.notes);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus data pembinaan ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        await deleteGuidance(id);
        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil dihapus'
        });
      } catch (error) {
        showAlert({
          type: 'error',
          message: 'Gagal menghapus data pembinaan'
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGuidance) {
        await updateGuidance(editingGuidance.id, {
          ...editingGuidance,
          guidanceStage: selectedStage,
          guidanceDetail: selectedDetail,
          description,
          notes,
          conductedBy: currentUser?.id || '',
          conductedAt: new Date().toISOString()
        });
        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil diperbarui'
        });
      } else {
        // Cek apakah siswa dipilih
        if (!selectedStudent) {
          showAlert({
            type: 'error',
            message: 'Pilih siswa yang akan dibina'
          });
          return;
        }

        // Cari pelanggaran yang belum dibina untuk siswa tersebut
        const violation = unhandledViolations.find(v => v.studentId === selectedStudent);
        if (!violation) {
          showAlert({
            type: 'error',
            message: 'Tidak ada pelanggaran yang perlu dibina untuk siswa ini'
          });
          return;
        }

        // Tambah pembinaan baru
        await addGuidance({
          violationId: violation.id,
          studentId: selectedStudent,
          guidanceStage: selectedStage,
          guidanceDetail: selectedDetail,
          description,
          notes,
          conductedBy: currentUser?.id || '',
          conductedAt: new Date().toISOString()
        });

        showAlert({
          type: 'success',
          message: 'Data pembinaan berhasil ditambahkan'
        });
      }
      resetForm();
    } catch (error) {
      showAlert({
        type: 'error',
        message: 'Gagal menyimpan data pembinaan'
      });
    }
  };

  const resetForm = () => {
    setEditingGuidance(null);
    setSelectedStage('Tahap 1');
    setSelectedDetail('');
    setDescription('');
    setNotes('');
    setSelectedStudent('');
    setSelectedGrade('');
    setIsModalOpen(false);
  };

  // Filter dan tampilkan data
  const filteredGuidances = guidances.filter(guidance => {
    const student = students.find(s => s.id === guidance.studentId);
    if (!student) return false;

    return (
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Tambah Pembinaan</span>
        </button>
      </div>

      {/* Daftar Pembinaan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuidances.map((guidance) => {
          const student = students.find(s => s.id === guidance.studentId);
          if (!student) return null;

          return (
            <div key={guidance.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {guidance.guidanceStage}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(guidance.conductedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium">{student.fullName}</h3>
                  <p className="text-sm text-gray-600">{student.class}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Pembinaan:</p>
                  <p className="text-sm text-gray-600">{guidance.guidanceDetail}</p>
                  <p className="text-sm text-gray-500 mt-1">{guidance.description}</p>
                  {guidance.notes && (
                    <p className="text-sm text-gray-500 mt-1">Catatan: {guidance.notes}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(guidance)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(guidance.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white w-full max-w-2xl rounded-lg shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingGuidance ? 'Edit Pembinaan' : 'Tambah Pembinaan'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)}>
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Tingkatan Kelas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tingkat
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['X', 'XI', 'XII'].map((grade) => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            setSelectedGrade(grade as 'X' | 'XI' | 'XII');
                            setSelectedStudent('');
                          }}
                          className={`py-2 px-3 text-sm rounded-md ${
                            selectedGrade === grade 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Selection */}
                  {selectedGrade && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Siswa yang Memiliki Pelanggaran
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                        {filteredStudents
                          .filter(student => {
                            // Hanya tampilkan siswa yang memiliki pelanggaran belum dibina
                            return unhandledViolations.some(v => v.studentId === student.id);
                          })
                          .sort((a, b) => a.fullName.localeCompare(b.fullName))
                          .map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => setSelectedStudent(student.id)}
                              className={`p-2 text-left rounded-lg transition-colors ${
                                selectedStudent === student.id
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <div className="font-medium">{student.fullName}</div>
                              <div className="text-sm opacity-90">
                                {student.class} - {student.barak}
                              </div>
                              {unhandledViolations
                                .filter(v => v.studentId === student.id)
                                .map(v => (
                                  <div
                                    key={v.id}
                                    className={`mt-1 text-xs px-2 py-0.5 rounded-full inline-block ${
                                      selectedStudent === student.id
                                        ? 'bg-white text-blue-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {v.violationType} - {v.violationDetail}
                                  </div>
                                ))}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Guidance Stage */}
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
                            setSelectedStage(stage);
                            setSelectedDetail('');
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedStage === stage
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Guidance Detail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rincian Pembinaan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {guidanceDetails[selectedStage].map((detail) => (
                        <button
                          key={detail}
                          type="button"
                          onClick={() => setSelectedDetail(detail)}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedDetail === detail
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {detail}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description and Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detail Pembinaan
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 border rounded-lg min-h-[100px]"
                      required
                      placeholder="Tambahkan detail pembinaan..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catatan Tambahan
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2 border rounded-lg min-h-[80px]"
                      placeholder="Tambahkan catatan jika ada..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                    >
                      {editingGuidance ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}

      {/* Confirmation Modal */}
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
  );
};

export default GuidanceManagement;
