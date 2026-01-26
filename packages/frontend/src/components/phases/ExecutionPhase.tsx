import { useState, useEffect } from 'react';
import { Project } from '../../api/projects';
import { generationApi } from '../../api/generation';
import './PhaseCommon.css';

interface ExecutionPhaseProps {
  project: Project;
  onUpdate: () => void;
}

export function ExecutionPhase({ project, onUpdate }: ExecutionPhaseProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project.phaseStatus === 'pending') {
      startExecution();
    }
  }, [project.id, project.phaseStatus]);

  const startExecution = async () => {
    setLoading(true);
    setError('');

    try {
      await generationApi.startExecution(project.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
    } finally {
      setLoading(false);
    }
  };

  if (loading || project.phaseStatus === 'in_progress') {
    return (
      <div className="phase-loading">
        <div className="spinner"></div>
        <p>Generating code...</p>
        <p className="help-text">
          The AI is implementing your project according to the plan. This may take several minutes.
        </p>
      </div>
    );
  }

  if (project.phaseStatus === 'completed') {
    return (
      <div className="phase-container">
        <h2>✓ Execution Phase Completed</h2>
        <p className="phase-description">All code files have been generated successfully.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="info-box">
          <h3>Generated Files</h3>
          <p>Your project files have been created at:</p>
          <code className="file-path">{project.filesPath}</code>
          <p className="help-text">
            The generated code includes all necessary files, configurations, and documentation.
          </p>
        </div>

        <div className="phase-actions">
          <button onClick={onUpdate} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phase-container">
      <h2>Execution Phase</h2>
      <p className="phase-description">
        The AI will now generate all the code and configuration files for your project.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="phase-actions">
        <button onClick={startExecution} className="btn-primary" disabled={loading}>
          {loading ? 'Starting...' : 'Start Execution'}
        </button>
      </div>
    </div>
  );
}
