export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedProject {
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  structure: ProjectStructure;
  metadata: ProjectMetadata;
}

export interface ProjectStructure {
  rootDir: string;
  directories: string[];
  entrypoint?: string;
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  framework: string;
  language: string;
  buildCommand?: string;
  devCommand?: string;
  testCommand?: string;
}

export interface TemplateConfig {
  type: string;
  name: string;
  framework: string;
  language: string;
  defaultDependencies: Record<string, string>;
  fileTemplates: TemplateFile[];
}

export interface TemplateFile {
  path: string;
  template: string;
  variables?: Record<string, unknown>;
}

export interface VerificationResult {
  passed: boolean;
  failedStage?: string;
  error?: string;
  stages: StageResult[];
}

export interface StageResult {
  name: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}
