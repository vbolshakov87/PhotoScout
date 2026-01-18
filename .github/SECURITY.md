# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at PhotoScout. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to the project maintainers
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on the progress
- Credit in the security advisory (if desired)

### Scope

The following are in scope for security reports:

- **Web Application** (aiscout.photo)
- **API endpoints**
- **iOS Application**
- **Infrastructure configurations**

### Out of Scope

- Denial of Service attacks
- Social engineering
- Physical security
- Third-party services we use

## Security Measures

PhotoScout implements the following security measures:

- HTTPS-only communication
- Google OAuth 2.0 for authentication
- Input validation and sanitization
- Regular dependency updates via Dependabot
- AWS security best practices
- No storage of sensitive credentials in code

## Disclosure Policy

We follow a coordinated disclosure process:

1. Reporter submits vulnerability
2. We confirm and assess the issue
3. We develop and test a fix
4. We deploy the fix
5. We publicly disclose the vulnerability (with reporter credit)

Thank you for helping keep PhotoScout and its users safe!
