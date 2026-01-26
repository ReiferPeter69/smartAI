import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import './ProjectCreate.css';

const APP_TYPES = [
  { value: 'web-app', label: 'Web Application' },
  { value: 'api', label: 'REST API' },
  { value: 'cli', label: 'CLI Tool' },
  { value: 'library', label: 'Library/Package' },
  { value: 'mobile-app', label: 'Mobile App' },
];

export function ProjectCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [appType, setAppType] = useState('web-app');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const project = await projectsApi.create({
        name,
        description: description || undefined,
        prompt,
        appType,
      });

      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="project-create-page">
      <div className="page-header">
        <h1>Create New Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="name">
            Project Name <span className="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Project"
            required
            minLength={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your project (optional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="appType">
            Application Type <span className="required">*</span>
          </label>
          <select id="appType" value={appType} onChange={(e) => setAppType(e.target.value)} required>
            {APP_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="prompt">
            Project Description <span className="required">*</span>
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build in detail. Include features, technologies, and any specific requirements..."
            required
            minLength={20}
            rows={8}
          />
          <span className="help-text">
            Be as specific as possible. The AI will use this to generate clarifying questions and plan your
            project.
          </span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
