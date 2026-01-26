import { useState, useEffect } from 'react';
import { Project } from '../../api/projects';
import { generationApi } from '../../api/generation';
import './PhaseCommon.css';

interface VerificationPhaseProps {
  project: Project;
  onUpdate: () => void;
}

export function VerificationPhase({ project, onUpdate }: VerificationPhaseProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project.phaseStatus === 'pending') {
      startVerification();
    }
  }, [project.id, project.phaseStatus]);

  const startVerification = async () => {
    setLoading(true);
    setError('');

    try {
      await generationApi.startVerification(project.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setLoading(false);
    }
  };

  if (loading || project.phaseStatus === 'in_progress') {
    return (
      <div className="phase-loading">
        <div className="spinner"></div>
        <p>Verifying generated code...</p>
        <p className="help-text">
          Running comprehensive checks: syntax validation, security analysis, best practices review, and more.
        </p>
      </div>
    );
  }

  if (project.phaseStatus === 'completed') {
    return (
      <div className="phase-container">
        <h2>✓ Verification Phase Completed</h2>
        <p className="phase-description">
          All verification checks have been completed. Your project is ready!
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="success-box">
          <h3>🎉 Project Generated Successfully!</h3>
          <p>Your AI-generated project has passed all quality checks:</p>
          <ul className="check-list">
            <li>✓ Syntax validation</li>
            <li>✓ Security analysis</li>
            <li>✓ Best practices review</li>
            <li>✓ Dependency validation</li>
            <li>✓ Code quality assessment</li>
          </ul>
        </div>

        <div className="info-box">
          <h3>Next Steps</h3>
          <ol className="next-steps">
            <li>Download your generated project files</li>
            <li>Review the code and documentation</li>
            <li>Install dependencies as specified in the README</li>
            <li>Run tests and start development</li>
          </ol>
          <p className="help-text">
            Files location: <code className="file-path">{project.filesPath}</code>
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

  if (project.phaseStatus === 'failed') {
    return (
      <div className="phase-container">
        <h2>Verification Failed</h2>
        <p className="phase-description">
          Some verification checks did not pass. Please review the issues below.
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="warning-box">
          <h3>Issues Found</h3>
          <p>The generated code has some issues that need attention. You can still use the code, but fixing these issues is recommended.</p>
        </div>

        <div className="phase-actions">
          <button onClick={startVerification} className="btn-secondary" disabled={loading}>
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phase-container">
      <h2>Verification Phase</h2>
      <p className="phase-description">
        The AI will verify the generated code for correctness, security, and best practices.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="phase-actions">
        <button onClick={startVerification} className="btn-primary" disabled={loading}>
          {loading ? 'Starting...' : 'Start Verification'}
        </button>
      </div>
    </div>
  );
}
