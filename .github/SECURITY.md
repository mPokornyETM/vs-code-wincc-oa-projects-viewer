# Security Policy

## 🔒 **Supported Versions**

We actively provide security updates for the following versions of the WinCC OA VS Code Extension:

| Version | Supported |
| ------- | --------- |
| 1.5.x   | ✅ Yes    |
| 1.0.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## 🚨 **Reporting a Vulnerability**

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### **1. Do Not File a Public Issue**

**Please do not report security vulnerabilities through public GitHub issues.**

### **2. Report Privately**

Send your report via email to: **[security@winccoa-extension.dev]** (replace with actual email)

Or use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab
2. Click **"Report a vulnerability"**
3. Fill out the security advisory form

### **3. Include in Your Report**

- **Description**: Clear description of the vulnerability
- **Impact**: How the vulnerability could be exploited
- **Reproduction**: Step-by-step instructions to reproduce
- **Environment**: VS Code version, OS, extension version
- **Proof of Concept**: Code or screenshots if applicable
- **Suggested Fix**: If you have ideas for mitigation

### **Example Report Format**

```text
Subject: [SECURITY] Potential Path Traversal in Config File Handling

Environment:
- Extension Version: 1.0.0
- VS Code Version: 1.85.0
- OS: Windows 11

Description:
The extension's config file parsing functionality may be vulnerable to path traversal attacks...

Reproduction Steps:
1. Create a malicious config file with "../" sequences
2. Place it in the WinCC OA project directory
3. Open the project in VS Code
4. Observe that files outside the project directory are accessible

Impact:
An attacker could potentially read sensitive files outside the project directory...

Suggested Fix:
Implement proper path validation and sanitization...
```

## ⏰ **Response Timeline**

| Phase                | Timeline        | Description                                      |
| -------------------- | --------------- | ------------------------------------------------ |
| **Initial Response** | 48 hours        | Acknowledgment of report                         |
| **Assessment**       | 5 business days | Vulnerability validation and severity assessment |
| **Fix Development**  | 2-4 weeks       | Develop and test security fix                    |
| **Disclosure**       | Coordinated     | Public disclosure after fix is released          |

## 🛡️ **Security Measures**

### **Extension Security**

- **Code Scanning**: Automated security scanning with CodeQL
- **Dependency Scanning**: Regular vulnerability checks for dependencies
- **Input Validation**: Sanitization of all user inputs and file paths
- **Sandboxing**: Extension runs in VS Code's secure extension host
- **Minimal Permissions**: Only requests necessary VS Code API permissions

### **Data Protection**

- **Local Storage Only**: No data transmitted to external servers
- **File System Access**: Limited to project directories only
- **Registry Access**: Read-only access to WinCC OA installation registry
- **Process Execution**: Restricted to WinCC OA utilities in safe directories

### **Secure Development**

- **Static Analysis**: ESLint security rules and TypeScript strict mode
- **Dependency Management**: Regular updates and vulnerability scanning
- **Code Reviews**: All changes reviewed for security implications
- **Testing**: Security-focused test cases and penetration testing

## 🔍 **Known Security Considerations**

### **File System Access**

The extension accesses the Windows file system for:

- Reading WinCC OA project configuration files
- Executing WinCC OA utilities (pmon, etc.)
- Parsing registry entries for project discovery

**Mitigations:**

- Path validation and sanitization
- Restricted to configured project directories
- Read-only access where possible

### **Process Execution**

The extension may execute WinCC OA system utilities:

- `pmon.exe` for project management operations
- Configuration tools for project setup

**Mitigations:**

- Whitelist of allowed executables
- Validation of executable paths
- Sandboxed execution environment

### **Registry Access**

The extension reads Windows registry for project discovery:

- HKEY_LOCAL_MACHINE\SOFTWARE\ETM\WinCC_OA
- Project installation paths and versions

**Mitigations:**

- Read-only registry access
- Validation of registry data
- Graceful handling of missing keys

## 🏆 **Security Hall of Fame**

We recognize and thank security researchers who help make our extension more secure:

<!--
Add contributors here as they report vulnerabilities:

- **[Researcher Name]** - Discovered and reported [vulnerability description] (Date)
-->

_No security reports have been received yet. Be the first to help us improve security!_

## 📚 **Additional Resources**

### **VS Code Extension Security**

- [VS Code Extension Security Guidelines](https://code.visualstudio.com/api/references/extension-guidelines#security)
- [Extension Manifest Security](https://code.visualstudio.com/api/references/extension-manifest)
- [VS Code Security Model](https://code.visualstudio.com/docs/editor/workspace-trust)

### **General Security Best Practices**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Microsoft SDL](https://www.microsoft.com/en-us/securityengineering/sdl/)
- [Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

### **Dependency Security**

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Dependabot](https://github.com/dependabot)
- [Snyk](https://snyk.io/)

---

**Last Updated:** January 2024  
**Next Review:** April 2024

_This security policy is reviewed and updated quarterly to ensure it remains current with best practices and emerging threats._
