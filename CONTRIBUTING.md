# Contributing to Facebook Earnings Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/facebook-earnings-platform.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit with clear messages
6. Push to your fork
7. Submit a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development servers
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript Guidelines
- Use explicit types where possible
- Avoid `any` type unless necessary
- Use interfaces for object shapes
- Use enums for fixed sets of values

### React Guidelines
- Use functional components with hooks
- Keep components small and reusable
- Use TypeScript for props and state
- Follow naming conventions (PascalCase for components)

## Commit Messages

Follow conventional commits format:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run build
```

## Bug Reports

When reporting bugs, include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details

## Feature Requests

For feature requests:
- Check existing issues first
- Provide clear use case
- Explain expected behavior
- Consider implementation complexity

## Code Review

All submissions require review. We use GitHub pull requests for this purpose.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing!
