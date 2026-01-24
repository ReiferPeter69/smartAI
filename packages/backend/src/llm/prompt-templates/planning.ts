export const PLANNING_SYSTEM_PROMPT = `You are a software architecture expert specialized in breaking down technical specifications into atomic, executable steps.

Your goal is to create a detailed implementation plan that ensures project success.

You should:
1. Break specifications into atomic, independent steps
2. Identify dependencies between steps
3. Perform risk analysis for each step
4. Suggest mitigation strategies
5. Define verification criteria

Focus on:
- Atomic steps (each step is self-contained and testable)
- Clear dependencies and ordering
- Risk identification and mitigation
- Verification strategy for each step
- Realistic time estimates

Be thorough and practical. Every step should be actionable.`;

export const STEP_BREAKDOWN_PROMPT = (architecture: string) => `Analyze the following technical architecture and break it down into atomic implementation steps.

Architecture Specification:
"""
${architecture}
"""

Generate a numbered list of atomic steps that:
- Are small and focused (one step = one feature/component)
- Have clear dependencies
- Include verification criteria
- Are ordered by dependencies

Return ONLY a JSON array of step objects with this structure:
[
  {
    "id": "step-1",
    "title": "Step title",
    "description": "Detailed description of what to implement",
    "dependencies": [],
    "verification": "How to verify this step is complete",
    "estimatedTime": "Time estimate in minutes"
  }
]`;

export const RED_TEAMING_PROMPT = (step: string) => `You are a critical reviewer performing red teaming on an implementation step.

Implementation Step:
"""
${step}
"""

Analyze this step and identify potential failure points by asking critical questions:
- What could go wrong?
- What edge cases might be missed?
- What dependencies might fail?
- What performance issues could arise?
- What security vulnerabilities exist?

For each risk, provide a mitigation strategy.

Return ONLY a JSON array of risk objects:
[
  {
    "risk": "Description of the risk",
    "severity": "high|medium|low",
    "mitigation": "Concrete mitigation strategy"
  }
]`;

export const PLAN_GENERATION_PROMPT = (
  architecture: string,
  steps: Array<{
    id: string;
    title: string;
    description: string;
    dependencies: string[];
    verification: string;
    estimatedTime: string;
  }>,
  risks: Record<string, Array<{ risk: string; severity: string; mitigation: string }>>
) => `Create a comprehensive implementation plan document.

Architecture:
"""
${architecture}
"""

Implementation Steps:
${JSON.stringify(steps, null, 2)}

Risk Analysis:
${JSON.stringify(risks, null, 2)}

Generate a detailed plan.md document with the following structure:

# Implementation Plan

## Overview
[Brief summary of the implementation approach]

## Steps

### Step 1: [Title]
**Description**: [Detailed description]

**Dependencies**: [List of dependencies or "None"]

**Implementation Details**:
- [Detail 1]
- [Detail 2]

**Verification Criteria**:
- [How to verify this step is complete]

**Estimated Time**: [Time estimate]

**Risks & Mitigations**:
- **Risk**: [Risk description] (Severity: [level])
  - **Mitigation**: [Mitigation strategy]

[Repeat for each step]

## Timeline
[Overall timeline estimate based on steps]

## Critical Path
[Identify which steps are on the critical path]

## Success Criteria
[Overall project success criteria]

Return ONLY the markdown content, no additional text or formatting.`;

export const PLAN_TEMPLATE = `# Implementation Plan

## Overview
[Brief summary of implementation approach and key decisions]

## Steps

### Step 1: [Title]
**Description**: [What needs to be implemented]

**Dependencies**: None

**Implementation Details**:
- [Technical detail 1]
- [Technical detail 2]

**Verification Criteria**:
- [Test/check 1]
- [Test/check 2]

**Estimated Time**: [X] minutes

**Risks & Mitigations**:
- **Risk**: [Potential issue] (Severity: medium)
  - **Mitigation**: [How to prevent/handle]

## Timeline
- **Total Estimated Time**: [X] minutes
- **Critical Path**: Steps [X, Y, Z]

## Success Criteria
- [ ] All tests passing
- [ ] Code builds without errors
- [ ] Meets all requirements from architecture.md
- [ ] Verification pipeline passes
`;
