import { useState, useEffect } from 'react';
import { Project, projectsApi } from '../../api/projects';
import { generationApi } from '../../api/generation';
import './PhaseCommon.css';

interface PlanningPhaseProps {
  project: Project;
  onUpdate: () => void;
}

export function PlanningPhase({ project, onUpdate }: PlanningPhaseProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planContent, setPlanContent] = useState('');

  useEffect(() => {
    if (project.phaseStatus === 'pending') {
      startPlanning();
    } else if (project.phaseStatus === 'completed') {
      loadPlan();
    }
  }, [project.id, project.phaseStatus]);

  const startPlanning = async () => {
    setLoading(true);
    setError('');

    try {
      await generationApi.startPlanning(project.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start planning');
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async () => {
    try {
      const response = await projectsApi.getSpecFile(project.id, 'plan.md');
      setPlanContent(response.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    }
  };

  if (loading || (project.phaseStatus === 'in_progress' && !planContent)) {
    return (
      <div className="phase-loading">
        <div className="spinner"></div>
        <p>Generating implementation plan...</p>
        <p className="help-text">This may take a minute. The AI is analyzing requirements and creating a detailed plan.</p>
      </div>
    );
  }

  if (project.phaseStatus === 'completed' && planContent) {
    return (
      <div className="phase-container">
        <h2>✓ Planning Phase Completed</h2>
        <p className="phase-description">Implementation plan has been generated and validated.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="spec-file">
          <h3>Implementation Plan</h3>
          <pre className="spec-content">{planContent}</pre>
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
      <h2>Planning Phase</h2>
      <p className="phase-description">
        The AI will break down your project into steps and create a detailed implementation plan.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="phase-actions">
        <button onClick={startPlanning} className="btn-primary" disabled={loading}>
          {loading ? 'Starting...' : 'Start Planning'}
        </button>
      </div>
    </div>
  );
}
