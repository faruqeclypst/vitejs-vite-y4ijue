import React, { useState, useEffect } from 'react';
import { StudentLeaveRequest } from '../types';
import { useStudents } from '../contexts/StudentContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { X } from 'lucide-react';
import { Calendar } from 'lucide-react';

const StudentLeaveRequestForm: React.FC = () => {
  const { students } = useStudents();
  const { user } = useAuth();
  const [requests, setRequests] = useState<StudentLeaveRequest[]>([]);
  const [request, setRequest] = useState<Omit<StudentLeaveRequest, 'id' | 'status'>>({
    studentId: '',
    date: '',
    reason: ''
  });
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load existing requests from localStorage
    const savedRequests = localStorage.getItem('leaveRequests');
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to submit this leave request?')) {
      const newRequest: StudentLeaveRequest = {
        ...request,
        id: Date.now().toString(),
        status: 'Pending'
      };
      setRequests([...requests, newRequest]);
      localStorage.setItem('leaveRequests', JSON.stringify([...requests, newRequest]));
      setRequest({ studentId: '', date: '', reason: '' });
      alert('Leave request submitted successfully.');
    }
  };

  const handleStatusChange = (id: string, newStatus: 'Approved' | 'Rejected') => {
    const updatedRequests = requests.map(req =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem('leaveRequests', JSON.stringify(updatedRequests));
  };

  const toggleRequest = (requestId: string) => {
    setExpandedRequests(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  const groupedRequests = requests.reduce((acc, request) => {
    if (!acc[request.status]) {
      acc[request.status] = [];
    }
    acc[request.status].push(request);
    return acc;
  }, {} as Record<string, StudentLeaveRequest[]>);

  return (
    <div className="space-y-8 max-w-full">
      <h2 className="text-2xl font-bold mb-4">Permintaan Izin Siswa</h2>
      {(user?.role === 'admin' || user?.role === 'piket') && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={request.studentId}
              onChange={(e) => setRequest({ ...request, studentId: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Pilih siswa</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.fullName}</option>
              ))}
            </select>
            <input
              type="date"
              value={request.date}
              onChange={(e) => setRequest({ ...request, date: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <textarea
            value={request.reason}
            onChange={(e) => setRequest({ ...request, reason: e.target.value })}
            placeholder="Alasan izin"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            required
          />
          <button type="submit" className="w-full md:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Submit Permintaan Izin
          </button>
        </form>
      )}

      {Object.keys(groupedRequests).length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada permintaan izin yang dibuat hari ini</h3>
          <p className="mt-1 text-sm text-gray-500">
            Permintaan izin yang dibuat akan muncul di sini
          </p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(groupedRequests).map(([status, statusRequests]) => (
          <div key={status} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleRequest(status)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200"
            >
              <h3 className="font-bold text-lg">{status} Requests</h3>
              {expandedRequests.includes(status) ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            {expandedRequests.includes(status) && (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Siswa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statusRequests.map((req) => {
                          const student = students.find(s => s.id === req.studentId);
                          return (
                            <tr key={req.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">{student?.fullName}</td>
                              <td className="px-4 py-4 whitespace-nowrap">{req.date}</td>
                              <td className="px-4 py-4">
                                <div className="max-w-xs truncate">{req.reason}</div>
                              </td>
                              <td className="px-4 py-4">
                                {req.status === 'Pending' && (user?.role === 'admin' || user?.role === 'wakil_kepala') && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleStatusChange(req.id, 'Approved')}
                                      className="bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 rounded-lg text-sm"
                                    >
                                      Setuju
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(req.id, 'Rejected')}
                                      className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-lg text-sm"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden">
                    {statusRequests.map((req) => {
                      const student = students.find(s => s.id === req.studentId);
                      return (
                        <div key={req.id} className="bg-white shadow rounded-lg mb-4 p-4">
                          <div className="space-y-3">
                            <div>
                              <div className="font-medium text-gray-900">{student?.fullName}</div>
                              <div className="text-sm text-gray-500">{req.date}</div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Alasan:</span> {req.reason}
                            </div>
                            {req.status === 'Pending' && (user?.role === 'admin' || user?.role === 'wakil_kepala') && (
                              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                <button
                                  onClick={() => handleStatusChange(req.id, 'Approved')}
                                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm w-full sm:w-auto"
                                >
                                  Setuju
                                </button>
                                <button
                                  onClick={() => handleStatusChange(req.id, 'Rejected')}
                                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm w-full sm:w-auto"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] flex flex-col relative">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">
                    Tambah Permintaan Izin
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={request.studentId}
                      onChange={(e) => setRequest({ ...request, studentId: e.target.value })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Pilih siswa</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.fullName}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={request.date}
                      onChange={(e) => setRequest({ ...request, date: e.target.value })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <textarea
                    value={request.reason}
                    onChange={(e) => setRequest({ ...request, reason: e.target.value })}
                    placeholder="Alasan izin"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    required
                  />
                  <button type="submit" className="w-full md:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Submit Permintaan Izin
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLeaveRequestForm;
