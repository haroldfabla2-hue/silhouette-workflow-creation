# Contributing to Silhouette Workflow Creation Platform

Thank you for your interest in contributing to Silhouette! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## How to Contribute

Contributions are welcome! Here are some ways you can contribute:

- **Report bugs** by creating an issue
- **Suggest features** by opening an issue
- **Submit pull requests** for bug fixes or new features
- **Improve documentation**
- **Write tests**
- **Review pull requests**

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Quick Start

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/silhouette-workflow-creation.git
   cd silhouette-workflow-creation
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development services:**
   ```bash
   docker-compose up -d
   ```

5. **Run the application:**
   ```bash
   npm run dev
   ```

### Full Setup

For production-ready setup, use:
```bash
./setup-production.sh
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Maximum line length: 100 characters

### Python (Enterprise Teams)

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for classes and functions
- Maximum line length: 88 characters (Black default)

### General

- Write self-documenting code
- Add comments for complex logic
- Use consistent naming conventions
- Keep functions small and focused

## Testing

### Frontend Testing

```bash
cd frontend
npm test                    # Run unit tests
npm run test:coverage       # Run with coverage
npm run test:e2e           # Run E2E tests
```

### Backend Testing

```bash
cd backend
npm test                    # Run unit tests
npm run test:integration   # Run integration tests
```

### Mobile Testing

```bash
cd mobile
npm test                    # Run tests
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions
- Document complex algorithms
- Include examples in docstrings
- Update README.md for new features

### API Documentation

- Document all API endpoints
- Include request/response examples
- Update OpenAPI specs
- Add breaking change notes

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation
   - Ensure all tests pass

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request with:**
   - Clear title and description
   - Link to related issues
   - Screenshots/videos for UI changes
   - Test results

### PR Title Format

Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for refactoring
- `test:` for testing
- `chore:` for maintenance

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Project Structure

```
silhouette-workflow-creation/
├── backend/                 # Node.js/Express backend
├── frontend/               # Next.js frontend
├── mobile/                 # React Native mobile app
├── database/               # Database schemas
├── scripts/                # Deployment scripts
├── config/                 # Configuration files
├── docs/                   # Documentation
└── enterprise-agents/      # Python enterprise teams
```

## Architecture Guidelines

### Backend (Node.js/Express)

- Use TypeScript for all code
- Implement proper error handling
- Use middleware for cross-cutting concerns
- Follow RESTful API conventions
- Use dependency injection

### Frontend (Next.js)

- Use functional components with hooks
- Implement proper state management
- Use TypeScript for type safety
- Follow React best practices
- Implement responsive design

### Mobile (React Native)

- Use functional components
- Implement proper navigation
- Use Redux for state management
- Follow platform-specific guidelines
- Implement offline-first approach

### Enterprise Teams (Python)

- Follow Single Responsibility Principle
- Use proper logging
- Implement async operations
- Use proper error handling
- Follow PEP 8 standards

## Communication

- **Issues:** Use GitHub issues for bug reports and feature requests
- **Discussions:** Use GitHub Discussions for general questions
- **PR Reviews:** Be constructive and respectful in reviews

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (if applicable)

Thank you for contributing to Silhouette!