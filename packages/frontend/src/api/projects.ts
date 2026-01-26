import { api } from './client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  appType: string;
  status: string;
  currentPhase: string;
  phaseStatus: string;
  filesPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  prompt: string;
  appType: string;
}

export const projectsApi = {
  getAll(): Promise<Project[]> {
    return api.get<Project[]>('/projects');
  },

  getById(id: string): Promise<Project> {
    return api.get<Project>(`/projects/${id}`);
  },

  create(data: CreateProjectData): Promise<Project> {
    return api.post<Project>('/projects', data);
  },

  update(id: string, data: Partial<CreateProjectData>): Promise<Project> {
    return api.patch<Project>(`/projects/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/projects/${id}`);
  },

  getSpecFile(projectId: string, filename: string): Promise<{ content: string }> {
    return api.get<{ content: string }>(`/projects/${projectId}/files/${filename}`);
  },
};
