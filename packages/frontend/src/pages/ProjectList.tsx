import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, Project } from '../api/projects';
import './ProjectList.css';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await projectsApi.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="project-list-page">
      <div className="page-header">
        <h1>My Projects</h1>
        <Link to="/projects/new" className="btn-primary">
          Create New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Create your first project to get started with AI-powered code generation.</p>
          <Link to="/projects/new" className="btn-primary">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <Link to={`/projects/${project.id}`} className="project-card-link">
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <span className={`badge badge-${project.phaseStatus}`}>{project.phaseStatus}</span>
                </div>

                {project.description && <p className="project-description">{project.description}</p>}

                <div className="project-meta">
                  <span className="meta-item">
                    <strong>Phase:</strong> {project.currentPhase}
                  </span>
                  <span className="meta-item">
                    <strong>Type:</strong> {project.appType}
                  </span>
                </div>

                <div className="project-footer">
                  <span className="project-date">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>

              <div className="project-actions">
                <button onClick={() => handleDelete(project.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
