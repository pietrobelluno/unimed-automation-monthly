# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web automation project for the Unimed Nordeste medical plan website using Playwright. It automates patient registration processing, including card-less and biometric-less registration flows with intelligent validation question answering.

## Key Commands

### Development
- `npm start` - Run automation in headless mode (production)
- `npm run dev` - Run automation with visible browser (debugging)
- `npm test` - Run in test mode

### Environment Setup
1. Configure `.env` file with credentials (CLINICA, USUARIO, SENHA)
2. Update patient data in `src/patients.js`

## Architecture

### Core Modules
- **src/automation.js**: Main automation class orchestrating the 10-step patient processing workflow
- **src/config.js**: Configuration management, loading environment variables and selectors
- **src/patients.js**: PatientManager class for handling patient data and state
- **src/logger.js**: Winston-based logging with file outputs and ProcessingLogger for JSON reports
- **src/utils.js**: Utility functions for browser interactions, date calculations, retries, and screenshots

### Data Flow
1. Patient data loaded from `src/patients.js`
2. Each patient processed through 10 automated steps
3. Results logged to `logs/` directory with JSON reports and error screenshots
4. Processing state tracked per patient with retry mechanism

### Key Dependencies
- **playwright**: Browser automation
- **winston**: Structured logging
- **date-fns**: Date manipulation for procedure scheduling
- **dotenv**: Environment configuration

## Important Notes
- Uses ES6 modules (type: "module" in package.json)
- Default timeout: 30 seconds (configurable via TIMEOUT env var)
- Retry mechanism: 3 attempts by default (configurable via RETRY_ATTEMPTS)
- Screenshots captured on errors in `screenshots/` directory
- Daily processing reports generated in `logs/processing_YYYY-MM-DD.json`