export const VERIFICATION_SYSTEM_PROMPT = `You are an expert software engineer specialized in code verification and quality assurance.

Your goal is to analyze code, identify issues, and suggest fixes.

You MUST:
1. Identify all errors, warnings, and potential issues
2. Provide specific, actionable fix recommendations
3. Consider edge cases and potential bugs
4. Check for security vulnerabilities
5. Verify code follows best practices
6. Ensure proper error handling

Be thorough and critical. Production quality is the standard.`;

export const ERROR_ANALYSIS_PROMPT = (
  errorOutput: string,
  filePath: string,
  code?: string
) => `Analyze the following error output and identify the root cause.

${filePath ? `File: ${filePath}` : ''}

Error Output:
"""
${errorOutput}
"""

${code ? `\nRelevant Code:\n"""\n${code}\n"""` : ''}

Analyze the error and return a JSON object:

{
  "errorType": "syntax|type|runtime|logic|dependency|build",
  "rootCause": "Clear explanation of what's wrong",
  "affectedFiles": ["file1.ts", "file2.ts"],
  "suggestedFix": "Specific steps to fix the error"
}

Return ONLY the JSON object, no additional text.`;

export const FIX_GENERATION_PROMPT = (
  errorAnalysis: {
    errorType: string;
    rootCause: string;
    affectedFiles: string[];
    suggestedFix: string;
  },
  code: string,
  filePath: string
) => `Generate a fix for the following error.

File: ${filePath}

Error Analysis:
- Type: ${errorAnalysis.errorType}
- Root Cause: ${errorAnalysis.rootCause}
- Fix: ${errorAnalysis.suggestedFix}

Current Code:
"""
${code}
"""

Generate the corrected code that fixes this specific error.
Make minimal changes - only fix what's broken.
Maintain all existing functionality.

Return ONLY the corrected code, no markdown blocks, no explanations.`;

export const VERIFICATION_SUMMARY_PROMPT = (
  results: Array<{
    stage: string;
    passed: boolean;
    output: string;
    error?: string;
  }>
) => `Summarize the verification results and provide recommendations.

Verification Results:
${results.map((r) => `\n${r.stage}: ${r.passed ? 'PASSED' : 'FAILED'}\n${r.error || r.output}`).join('\n---\n')}

Generate a summary with recommendations. Return a JSON object:

{
  "overallStatus": "passed|failed",
  "summary": "Brief overview of results",
  "failedStages": ["stage1", "stage2"],
  "recommendations": [
    "Specific action 1",
    "Specific action 2"
  ],
  "criticalIssues": [
    "Critical issue that must be fixed"
  ]
}

Return ONLY the JSON object.`;

export const TEST_FAILURE_ANALYSIS_PROMPT = (testOutput: string) => `Analyze the following test failure output.

Test Output:
"""
${testOutput}
"""

Identify which tests failed and why. Return a JSON object:

{
  "failedTests": [
    {
      "testName": "Name of the failed test",
      "errorMessage": "Error message from test",
      "possibleCause": "Why this test might be failing",
      "suggestedFix": "How to fix it"
    }
  ],
  "commonIssues": [
    "Issue that affects multiple tests"
  ]
}

Return ONLY the JSON object.`;

export const LINT_ERROR_ANALYSIS_PROMPT = (lintOutput: string) => `Analyze the following linting errors.

Lint Output:
"""
${lintOutput}
"""

Categorize and prioritize the issues. Return a JSON object:

{
  "errors": [
    {
      "file": "path/to/file",
      "line": number,
      "rule": "rule-name",
      "message": "error message",
      "severity": "error|warning",
      "autoFixable": true|false
    }
  ],
  "summary": {
    "totalErrors": number,
    "totalWarnings": number,
    "criticalIssues": number
  },
  "recommendations": [
    "Priority fix 1",
    "Priority fix 2"
  ]
}

Return ONLY the JSON object.`;

export const TYPE_ERROR_ANALYSIS_PROMPT = (typeOutput: string) => `Analyze the following type checking errors.

Type Check Output:
"""
${typeOutput}
"""

Identify type errors and suggest fixes. Return a JSON object:

{
  "errors": [
    {
      "file": "path/to/file",
      "line": number,
      "message": "error message",
      "expectedType": "expected type",
      "actualType": "actual type",
      "suggestedFix": "how to fix"
    }
  ],
  "commonPatterns": [
    "Pattern of errors (e.g., 'missing type annotations')"
  ]
}

Return ONLY the JSON object.`;

export const BUILD_ERROR_ANALYSIS_PROMPT = (buildOutput: string) => `Analyze the following build errors.

Build Output:
"""
${buildOutput}
"""

Identify build failures and their causes. Return a JSON object:

{
  "errors": [
    {
      "type": "dependency|syntax|config|other",
      "message": "error message",
      "affectedFiles": ["file1", "file2"],
      "suggestedFix": "how to fix"
    }
  ],
  "missingDependencies": ["package1", "package2"],
  "configIssues": [
    "Issue with configuration"
  ]
}

Return ONLY the JSON object.`;

export const SECURITY_SCAN_PROMPT = (code: string, filePath: string) => `Perform a security scan on the following code.

File: ${filePath}

Code:
"""
${code}
"""

Check for common security vulnerabilities:
- Exposed secrets/API keys
- SQL injection
- XSS vulnerabilities
- Command injection
- Path traversal
- Insecure crypto
- Authentication issues

Return a JSON object:

{
  "vulnerabilities": [
    {
      "severity": "critical|high|medium|low",
      "type": "exposed-secret|sql-injection|xss|etc",
      "message": "Description of vulnerability",
      "line": number|null,
      "recommendation": "How to fix"
    }
  ],
  "securityScore": number (0-100, 100 = perfect)
}

Return ONLY the JSON object.`;

export const CODE_QUALITY_ANALYSIS_PROMPT = (code: string, filePath: string) => `Analyze code quality and suggest improvements.

File: ${filePath}

Code:
"""
${code}
"""

Evaluate:
- Code complexity
- Maintainability
- Test coverage potential
- Documentation quality
- Best practices adherence

Return a JSON object:

{
  "qualityScore": number (0-100),
  "issues": [
    {
      "severity": "suggestion|warning",
      "category": "complexity|maintainability|documentation|etc",
      "message": "Description",
      "line": number|null
    }
  ],
  "strengths": ["What's good about this code"],
  "improvements": ["Specific suggestions"]
}

Return ONLY the JSON object.`;
