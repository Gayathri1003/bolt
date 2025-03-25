import React, { useState } from 'react';
import { Icons } from '../../../components/icons';
import { generateQuestionsFromDocument } from '../../../lib/api/gemini';
import { createQuestion } from '../../../lib/api/questions';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';

interface DocumentUploaderProps {
  subjectId: string;
  onQuestionsGenerated: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ subjectId, onQuestionsGenerated }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const generatedQuestions = await generateQuestionsFromDocument(text);

      // Save each generated question to the database
      await Promise.all(
        generatedQuestions.map(question =>
          createQuestion({
            ...question,
            subject_id: subjectId,
            teacher_id: user!.id
          })
        )
      );

      toast.success('Questions generated and saved successfully');
      onQuestionsGenerated();
    } catch (error) {
      toast.error('Failed to generate questions from document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium mb-4">Upload Document</h2>
      <label className="block">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <Icons.Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {loading ? 'Generating questions...' : 'Drag and drop your document here, or click to select a file'}
          </p>
          <input
            type="file"
            className="hidden"
            accept=".txt,.doc,.docx,.pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
      </label>
    </div>
  );
};

export default DocumentUploader;