import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi, Project } from '../api/projects';
import { DiscoveryPhase } from '../components/phases/DiscoveryPhase';
import { PlanningPhase } from '../components/phases/PlanningPhase';
import { ExecutionPhase } from '../components/phases/ExecutionPhase';
import { VerificationPhase } from '../components/phases/VerificationPhase';
import { useEventStream } from '../hooks/useEventStream';
import './ProjectDetail.css';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEventStream(projectId || '', (event) => {
    if (event.projectId === projectId) {
      loadProject();
    }
  });

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      const data = await projectsApi.getById(projectId);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return <div className="error-container">{error || 'Project not found'}</div>;
  }

  const renderPhase = () => {
    switch (project.currentPhase) {
      case 'discovery':
        return <DiscoveryPhase project={project} onUpdate={loadProject} />;
      case 'planning':
        return <PlanningPhase project={project} onUpdate={loadProject} />;
      case 'execution':
        return <ExecutionPhase project={project} onUpdate={loadProject} />;
      case 'verification':
        return <VerificationPhase project={project} onUpdate={loadProject} />;
      default:
        return <div>Unknown phase: {project.currentPhase}</div>;
    }
  };

  return (
    <div className="project-detail-page">
      <div className="project-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="project-subtitle">{project.description}</p>}
        </div>
        <span className={`badge badge-${project.phaseStatus}`}>{project.phaseStatus}</span>
      </div>

      <div className="phase-progress">
        <div className={`phase-step ${project.currentPhase === 'discovery' ? 'active' : 'completed'}`}>
          Discovery
        </div>
        <div
          className={`phase-step ${
            project.currentPhase === 'planning'
              ? 'active'
              : ['execution', 'verification'].includes(project.currentPhase)
                ? 'completed'
                : ''
          }`}
        >
          Planning
        </div>
        <div
          className={`phase-step ${
            project.currentPhase === 'execution'
              ? 'active'
              : project.currentPhase === 'verification'
                ? 'completed'
                : ''
          }`}
        >
          Execution
        </div>
        <div className={`phase-step ${project.currentPhase === 'verification' ? 'active' : ''}`}>
          Verification
        </div>
      </div>

      <div className="phase-content">{renderPhase()}</div>
    </div>
  );
}
