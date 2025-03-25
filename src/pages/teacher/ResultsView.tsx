import React, { useState } from 'react';
import { useTeacherStore } from '../../store/teacherStore';
import { useExamStore } from '../../store/examStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import { useBatchStore } from '../../store/batchStore';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ResultsView = () => {
  const { user } = useAuthStore();
  const { getTeacherAssignments } = useTeacherStore();
  const { exams, getExamResults } = useExamStore();
  const { students } = useStudentStore();
  const { getBatchAssignments, getStudentBatch } = useBatchStore();
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [expandedBatches, setExpandedBatches] = useState<number[]>([]);

  // Get all exams for this teacher's subjects
  const teacherAssignments = getTeacherAssignments(user!.id);
  const teacherExams = exams.filter(exam => 
    teacherAssignments.some(assignment => assignment.id === exam.subject_id)
  );

  // Filter out exams that haven't ended yet
  const completedExams = teacherExams.filter(exam => new Date(exam.end_time) < new Date());

  const results = selectedExam ? getExamResults(selectedExam) : [];
  const selectedExamData = completedExams.find(exam => exam.id === selectedExam);

  // Get all students who should have taken the exam
  const eligibleStudents = selectedExamData ? students.filter(student => 
    student.class === selectedExamData.class &&
    student.semester.toString() === selectedExamData.semester.toString()
  ) : [];

  // Find students who didn't attend
  const absentStudents = eligibleStudents.filter(student => 
    !results.some(result => result.studentId === student.id)
  );

  const toggleBatch = (batchNumber: number) => {
    if (expandedBatches.includes(batchNumber)) {
      setExpandedBatches(expandedBatches.filter(b => b !== batchNumber));
    } else {
      setExpandedBatches([...expandedBatches, batchNumber]);
    }
  };

  // Group students by batch
  const getStudentsByBatch = (batchNumber: number) => {
    if (!selectedExamData) return [];
    
    return eligibleStudents.filter(student => {
      const studentBatch = getStudentBatch(student.id, selectedExamData.subject_id);
      return studentBatch === batchNumber;
    });
  };

  // Get results for a specific batch
  const getBatchResults = (batchNumber: number) => {
    const batchStudents = getStudentsByBatch(batchNumber);
    
    return batchStudents.map(student => {
      const result = results.find(r => r.studentId === student.id);
      
      if (result) {
        return {
          ...result,
          studentName: student.name,
          status: result.status
        };
      } else {
        return {
          id: `absent-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          examId: selectedExam,
          totalQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          score: 0,
          percentage: 0,
          status: 'absent' as 'pass' | 'fail',
          submittedAt: '',
          answers: []
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">View Results</h1>

      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700">Select Exam</label>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Select an exam</option>
          {completedExams.map((exam) => {
            const subject = teacherAssignments.find(a => a.id === exam.subject_id);
            return (
              <option key={exam.id} value={exam.id}>
                {exam.title} - {subject?.subjectName} - Class {exam.class} - Semester {exam.semester}
              </option>
            );
          })}
        </select>
      </div>

      {selectedExam && (
        <div className="space-y-6">
          {[1, 2, 3, 4].map((batchNumber) => {
            const batchResults = getBatchResults(batchNumber);
            const isBatchExpanded = expandedBatches.includes(batchNumber);
            
            if (batchResults.length === 0) return null;
            
            return (
              <div key={batchNumber} className="bg-white shadow rounded-lg overflow-hidden">
                <div 
                  className="p-4 border-b flex justify-between items-center cursor-pointer"
                  onClick={() => toggleBatch(batchNumber)}
                >
                  <h2 className="text-lg font-medium text-gray-900">Batch {batchNumber}</h2>
                  <div className="flex items-center">
                    <span className="mr-4 text-sm text-gray-500">
                      {batchResults.length} students
                    </span>
                    {isBatchExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {isBatchExpanded && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchResults.map((result) => {
                        return (
                          <tr key={result.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {result.studentName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.status === 'absent' ? (
                                <div className="text-sm text-gray-500">-</div>
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {result.correctAnswers}/{result.totalQuestions}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.status === 'absent' ? (
                                <div className="text-sm text-gray-500">-</div>
                              ) : (
                                <div className="text-sm font-medium">
                                  {result.percentage}%
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.status === 'pass'
                                  ? 'bg-green-100 text-green-800'
                                  : result.status === 'fail'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {result.status === 'pass' ? 'Passed' : 
                                 result.status === 'fail' ? 'Failed' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.status === 'absent' ? 
                                '-' : 
                                new Date(result.submittedAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Summary Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Exam Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Passed</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {results.filter(r => r.status === 'pass').length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-800">Failed</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {results.filter(r => r.status === 'fail').length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Absent</h3>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {absentStudents.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;