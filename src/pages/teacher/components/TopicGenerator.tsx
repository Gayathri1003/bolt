import React, { useState } from 'react';
import { Icons } from '../../../components/icons';
import { generateQuestionsFromText } from '../../../lib/api/gemini';
import { createQuestion } from '../../../lib/api/questions';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';

interface TopicGeneratorProps {
  subjectId: string;
  onQuestionsGenerated: () => void;
}

const TopicGenerator: React.FC<TopicGeneratorProps> = ({ subjectId, onQuestionsGenerated }) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleGenerate = async () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const generatedQuestions = await generateQuestionsFromText(topic, count);

      // Save each generated question to the database
      await Promise.all(
        generatedQuestions.map(question =>
          createQuestion({
            text: question.text,
            options: question.options,
            correct_answer: question.correct_answer,
            difficulty: question.difficulty,
            subject_id: subjectId,
            teacher_id: user!.id
          })
        )
      );

      toast.success('Questions generated and saved successfully');
      onQuestionsGenerated();
      setTopic('');
    } catch (error) {
      toast.error('Failed to generate questions');
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter Topic
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          rows={4}
          placeholder="Enter the topic or concept for which you want to generate questions..."
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Questions
        </label>
        <input
          type="number"
          min="1"
          max="20"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={loading}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Icons.Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
            Generating Questions...
          </>
        ) : (
          'Generate Questions'
        )}
      </button>
    </div>
  );
};

export default TopicGenerator;