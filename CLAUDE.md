# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web automation project for the Unimed Nordeste medical plan website using Playwright. It automates patient registration processing through a 12-step workflow including card-less and biometric-less registration flows with intelligent validation question answering.

## Key Commands

### Development
- `npm start` - Run automation in headless mode (default: headless=false based on .env)
- `npm run dev` - Run automation with visible browser (--headed flag)
- `npm test` - Run in test mode (--test flag)

### Environment Setup
1. Configure `.env` file with credentials and settings:
   - `CLINICA`, `USUARIO`, `SENHA` - Login credentials
   - `PATIENT_DATA_FILE` - JSON file with patient data (default: patients_data.json)
   - `HEADLESS` - Run browser in headless mode (default: false)
   - `TIMEOUT` - Operation timeout in ms (default: 30000)
   - `RETRY_ATTEMPTS` - Number of retry attempts (default: 1)

## Architecture

### Core Modules
- **src/automation.js**: Main UnimedAutomation class orchestrating the 12-step patient processing workflow
- **src/config.js**: Configuration management, loading environment variables and DOM selectors
- **src/patients.js**: PatientManager class loading patient data from JSON files, handles date format conversion (DD-MM-YYYY to DD/MM/YYYY)
- **src/logger.js**: Winston-based logging with ProcessingLogger for structured JSON reports
- **src/liveSummaryLogger.js**: Real-time progress tracking and summary display
- **src/utils.js**: Utility functions for browser interactions, date calculations (getCurrentWeekDate), retries, and screenshots

### Patient Data Structure
Patient JSON files must contain:
```json
{
  "fono": "Carol",
  "nome": "PATIENT NAME",
  "carteirinha": "00410010008490763",
  "nascimento": "21-05-2020",
  "cpf": "065.668.990-06",
  "nomeDaMae": "Mother's Name",
  "nomeDoTitular": "Titular's Name",
  "weekday": "monday",
  "professional": "Dr. Carol Silva",
  "skip": false  // Optional: skip biometric steps if true
}
```

### Processing Workflow
The automation performs 12 steps per patient:
1. Register Without Card - Initiates card-less registration
2. Fill Card Details - Enters card number and justification
3. Confirm Dialog - Handles confirmation message
4. Register Without Biometrics - Skipped if patient.skip=true
5. Biometric Justification - Skipped if patient.skip=true
6. Answer Validation Questions - Intelligently answers security questions, skipped if patient.skip=true
7. Load Authorization - Refreshes authorization data
8. Find Active Procedure - Locates "Em Execução" row
9. Set Procedure Date - Calculates date based on patient.weekday
10. Select Professional - Chooses assigned professional
11. Execute Procedure - Submits the form
12. Confirm Success - Captures registration number

### Key Implementation Details
- Date calculations use date-fns to find the next occurrence of patient.weekday
- Validation questions are answered using patient data (mother's name, CPF, birth date, etc.)
- "Liberação Digital" screen is automatically dismissed during login
- Live summary provides real-time progress updates during execution
- Processing reports include step-by-step progress, timing, and error details

## Important Notes
- Uses ES6 modules (type: "module" in package.json)
- Patient data files support multiple formats: patients_data.json, patients_06_09.json, etc.
- Date format in JSON: DD-MM-YYYY (automatically converted to DD/MM/YYYY)
- Logs directory structure: logs/, logs/screenshots/
- Daily processing reports: logs/processing_YYYY-MM-DD.json