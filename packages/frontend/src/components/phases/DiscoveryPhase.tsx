import { useState, useEffect } from 'react';
import { Project } from '../../api/projects';
import { generationApi, DiscoveryAnswers } from '../../api/generation';
import './PhaseCommon.css';

interface DiscoveryPhaseProps {
  project: Project;
  onUpdate: () => void;
}

export function DiscoveryPhase({ project, onUpdate }: DiscoveryPhaseProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project.phaseStatus === 'pending') {
      startDiscovery();
    }
  }, [project.id]);

  const startDiscovery = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await generationApi.startDiscovery(project.id);
      setQuestions(response.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start discovery');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const unansweredQuestions = questions.filter((q) => !answers[q] || answers[q].trim() === '');
    if (unansweredQuestions.length > 0) {
      setError('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await generationApi.submitDiscovery(project.id, answers);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers');
    } finally {
      setLoading(false);
    }
  };

  if (project.phaseStatus === 'completed') {
    return (
      <div className="phase-completed">
        <h2>✓ Discovery Phase Completed</h2>
        <p>Architecture document has been generated based on your answers.</p>
        <div className="phase-actions">
          <button onClick={onUpdate} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (loading && questions.length === 0) {
    return (
      <div className="phase-loading">
        <div className="spinner"></div>
        <p>Generating clarifying questions...</p>
      </div>
    );
  }

  return (
    <div className="phase-container">
      <h2>Discovery Phase</h2>
      <p className="phase-description">
        Answer the following questions to help the AI understand your project requirements better.
      </p>

      {error && <div className="error-message">{error}</div>}

      {questions.length > 0 && (
        <div className="questions-list">
          {questions.map((question, index) => (
            <div key={index} className="question-item">
              <label>
                <strong>Question {index + 1}:</strong> {question}
              </label>
              <textarea
                value={answers[question] || ''}
                onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })}
                placeholder="Your answer..."
                rows={3}
                disabled={loading}
              />
            </div>
          ))}
        </div>
      )}

      <div className="phase-actions">
        {questions.length > 0 && (
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Answers'}
          </button>
        )}
      </div>
    </div>
  );
}
