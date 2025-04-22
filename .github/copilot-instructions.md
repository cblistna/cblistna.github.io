# Vanilla JavaScript Project Best Practices

## 1. Project Structure

- Organize code into logical modules/files.
- Keep configuration files (e.g., `deno.json`, `README.md`) in the project root.

## 2. Code Style

- Use consistent indentation (2 or 4 spaces).
- Prefer `const` and `let` over `var`.
- Use descriptive variable and function names.
- Avoid deeply nested code.

## 3. Function Exports

- Export functions explicitly using ES module syntax.
- Document all exported functions with JSDoc type annotations.

  ```js
  /**
   * Adds two numbers.
   * @param {number} a
   * @param {number} b 
   * @returns {number}
   */
  export function add(a, b) {
    return a + b;
  }
  ```

## 4. Type Safety

- Use JSDoc for type annotations on all public functions and complex objects.
- Prefer explicit types for function parameters and return values.

## 5. Testing

- Use Deno's built-in test runner (`deno test`).
- Place test files alongside source files.
- Name test files with `.test.js` or `.spec.js` suffix.
- Use 'jsr:' imports.
- Use deno BDD style testing with 'describe', 'it' style.
- For assertions use '@std/expect'

```js
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

describe("Add", () => {
  it("should add two numbers", () => {
    expect(add(2, 3)).isEqualTo(5);
  });
});
```

## 6. Dependencies

- Do not use external dependencies except for Deno's standard library (e.g., for testing).
- Prefer native JavaScript and Deno APIs.

## 7. Linting & Formatting

- Use `deno lint` and `deno fmt` to enforce code quality and formatting.
- Fix all lint and format issues before committing code.

## 8. Documentation

- Document all modules and exported functions with JSDoc.
- Maintain a clear and concise `README.md` with usage instructions.

## 9. Version Control

- Use `.gitignore` to exclude unnecessary files (e.g., `node_modules`, build artifacts).
- Commit early and often with meaningful messages.

## 10. Security

- Avoid using `eval` or other unsafe code patterns.
- Validate and sanitize all user input.
