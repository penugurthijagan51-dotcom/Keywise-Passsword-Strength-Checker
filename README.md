# Keywise Password Strength Checker

A clean, responsive, client-side password checker and secure password generator.
The website checks passwords locally in your browser and does not upload or
store them. The standalone Python command-line checker remains available too.

## Run the website

Open `index.html` in a modern browser. No build step, package installation, or
server is required. For clipboard access, serve the folder from localhost or
use a secure HTTPS deployment; browser clipboard APIs may be disabled for
ordinary `file://` pages.

## Features

- Live strength feedback, checklist, and improvement suggestions.
- Show/hide and clear controls for the password field.
- In-browser password generator using the Web Crypto API.
- Responsive layout and keyboard-accessible controls.
- No password analytics, network requests, or local storage.

The scoring and cracking-time estimate are simplified heuristics for guidance,
not a guarantee of security or a cryptographic entropy measurement. The
checker is not connected to an AI service and does not query a breach database.
Prefer a unique, long password or passphrase for each account, use a password
manager, and enable multi-factor authentication where available.

## Run the Python CLI

```powershell
python password_checker.py
```

## Run the tests

```powershell
python -m unittest -v
```
