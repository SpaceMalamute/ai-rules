---
name: generate-tests
description: Generate comprehensive tests for a file or function
argument-hint: <file-path-or-function>
---

# Generate Tests

Generate tests for: $ARGUMENTS

## Steps

1. **Analyze the target**
   - Read the file/function to test
   - Understand its purpose and behavior
   - Identify dependencies to mock

2. **Identify test cases**

   ### Happy path
   - Normal inputs → expected outputs

   ### Edge cases
   - Empty inputs
   - Null/undefined
   - Boundary values
   - Large inputs

   ### Error cases
   - Invalid inputs
   - Missing dependencies
   - Network/DB failures (if applicable)

3. **Check existing patterns**
   - Find similar test files in the project
   - Follow the same structure and conventions
   - Use the same testing utilities

4. **Generate tests**
   - Use project's test framework (Jest, Vitest, pytest, xUnit, etc.)
   - Follow AAA pattern: Arrange, Act, Assert
   - One assertion per test when possible
   - Descriptive test names

5. **Verify**
   - Run the new tests
   - Ensure they pass
   - Check coverage if available

## Output

Create the test file following project conventions:
- `*.spec.ts` or `*.test.ts` (JS/TS)
- `test_*.py` or `*_test.py` (Python)
- `*Tests.cs` (C#)
