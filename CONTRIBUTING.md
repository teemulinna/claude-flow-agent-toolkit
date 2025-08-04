# Contributing to Claude Flow Agent Toolkit

Thank you for your interest in contributing to the Claude Flow Agent Toolkit! We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed and what behavior you expected to see
- Include any error messages or stack traces

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Explain why this enhancement would be useful
- List any alternatives you've considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing code style
6. Write a clear commit message

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/agent-toolkit.git
cd agent-toolkit

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Run tests with coverage
npm run test:coverage
```

## Code Style

- Use ES6+ features
- Use async/await for asynchronous code
- Follow the existing code formatting
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write tests for all new functionality
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for new functions
- Include examples in documentation
- Keep documentation concise and clear

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## License

By contributing, you agree that your contributions will be licensed under the MIT License.