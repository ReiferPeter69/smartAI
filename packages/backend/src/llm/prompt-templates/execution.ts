export const EXECUTION_SYSTEM_PROMPT = `You are an expert software engineer specialized in writing clean, production-ready code.

Your goal is to generate complete, working implementations based on technical specifications.

You MUST follow these principles:
1. Write complete implementations (NO placeholders, NO TODOs)
2. Follow SOLID principles and design patterns
3. Use strict typing throughout
4. Add proper error handling
5. Include JSDoc/docstrings for complex logic
6. Follow security best practices (never expose secrets)
7. Use consistent naming conventions
8. Keep functions small and focused

Output Requirements:
- Generate exact file paths (e.g., "./src/components/Button.tsx")
- Ensure all imports are correct
- Make code self-contained and complete
- Follow the architecture specification exactly

Be thorough and professional. Every line of code should be production-ready.`;

export const CODE_GENERATION_PROMPT = (
  architecture: string,
  plan: string,
  step: {
    id: string;
    title: string;
    description: string;
  }
) => `Generate production-ready code for the following implementation step.

Architecture Specification:
"""
${architecture}
"""

Implementation Plan:
"""
${plan}
"""

Current Step:
ID: ${step.id}
Title: ${step.title}
Description: ${step.description}

Generate complete code files for this step. Return ONLY a JSON array of file objects:

[
  {
    "path": "relative/path/to/file.ext",
    "content": "complete file contents",
    "language": "typescript|javascript|python|json|etc"
  }
]

Requirements:
- Use exact file paths that match the architecture
- Include ALL necessary imports
- Write complete implementations (no placeholders)
- Add proper error handling
- Follow the tech stack from architecture.md
- Ensure code is ready to run without modifications

Return ONLY the JSON array, no additional text or formatting.`;

export const FILE_GENERATION_PROMPT = (
  filePath: string,
  description: string,
  context: string
) => `Generate a complete implementation for the following file.

File Path: ${filePath}
Description: ${description}

Context:
${context}

Generate the complete file contents. Follow these requirements:
- Complete implementation (no placeholders)
- Proper imports and dependencies
- Error handling where appropriate
- Type safety (TypeScript/Python type hints)
- Clean, readable code
- Production-ready quality

Return ONLY the file contents, no additional text, no markdown code blocks.`;

export const DIRECTORY_STRUCTURE_PROMPT = (
  appType: string,
  framework: string
) => `Generate the directory structure for a ${appType} application using ${framework}.

Return ONLY a JSON array of directory paths (relative to project root):

[
  "src",
  "src/components",
  "src/utils",
  "tests"
]

Include all standard directories for this type of project.
Return ONLY the JSON array, no additional text.`;

export const DEPENDENCY_ANALYSIS_PROMPT = (
  architecture: string,
  techStack: string
) => `Analyze the following technical specification and determine required dependencies.

Architecture:
"""
${architecture}
"""

Tech Stack: ${techStack}

Return ONLY a JSON object with dependencies and devDependencies:

{
  "dependencies": {
    "package-name": "^version"
  },
  "devDependencies": {
    "package-name": "^version"
  }
}

Include:
- Framework and core libraries
- UI libraries if mentioned
- Database clients
- Testing libraries (in devDependencies)
- Build tools (in devDependencies)

Use latest stable versions. Return ONLY the JSON object.`;

export const CODE_REVIEW_PROMPT = (code: string, filePath: string) => `Review the following code for issues.

File: ${filePath}

Code:
"""
${code}
"""

Check for:
- Syntax errors
- Missing imports
- Incomplete implementations (placeholders, TODOs)
- Type safety issues
- Security vulnerabilities (exposed secrets, SQL injection, XSS)
- Logic errors

Return a JSON object:
{
  "valid": true|false,
  "issues": [
    {
      "severity": "error|warning",
      "message": "Description of the issue",
      "line": number|null
    }
  ]
}

If no issues found, return {"valid": true, "issues": []}.
Return ONLY the JSON object.`;

export const FIX_CODE_PROMPT = (
  code: string,
  filePath: string,
  issues: Array<{ severity: string; message: string; line: number | null }>
) => `Fix the following code issues.

File: ${filePath}

Original Code:
"""
${code}
"""

Issues to Fix:
${issues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.message} ${issue.line ? `(line ${issue.line})` : ''}`).join('\n')}

Generate the corrected code that fixes all issues.
Maintain the same structure and logic, just fix the problems.

Return ONLY the corrected code, no additional text, no markdown blocks.`;
