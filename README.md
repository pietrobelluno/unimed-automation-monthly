# Unimed Automation Script

Automated web script for processing patient registrations on the Unimed Nordeste medical plan website.

## Features

- ✅ Automated login and authentication
- ✅ Batch processing of multiple patients
- ✅ Card-less and biometric-less registration
- ✅ Intelligent validation question answering
- ✅ Automatic date calculation for procedures
- ✅ Professional selection
- ✅ Comprehensive logging and error tracking
- ✅ Processing status reports (successful/failed)
- ✅ Screenshot capture on errors
- ✅ Retry mechanism for failed operations

## Installation

1. Clone the repository:
```bash
cd unimed-automation
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env` (if provided)
   - Or edit `.env` directly with your credentials

## Configuration

Edit the `.env` file with your credentials:

```env
CLINICA=2219
USUARIO=camila.vigano
SENHA=Lorvi1011
```

## Patient Data Structure

Update `src/patients.js` with your patient data:

```javascript
{
  fono: "Carol",
  nome: "AGATHA GROSS ANDREIS",
  carteirinha: "00410010008490763",
  nascimento: "21/05/2020",
  cpf: "065.668.990-06",
  nomeDaMae: "Simone de Oliveira Gross Andreis",
  nomeDoTitular: "Francisco Antônio Andreis",
  weekday: "monday",  // Day for procedure scheduling
  professional: "Dr. Carol Silva"  // Professional to select
}
```

## Usage

### Run in headless mode (default):
```bash
npm start
```

### Run in headed mode (visible browser):
```bash
npm run dev
```

### Test mode:
```bash
npm test
```

## Logs and Reports

The system generates comprehensive logs:

1. **Real-time logs**: Console output and `logs/automation.log`
2. **Error logs**: `logs/errors.log`
3. **Processing reports**: `logs/processing_YYYY-MM-DD.json`
4. **Screenshots**: `logs/screenshots/` (on errors)

### Processing Report Structure

Each daily report includes:
- Total patients processed
- Success/failure counts
- Detailed step-by-step progress for each patient
- Error messages and screenshots for failed attempts
- Processing time metrics

Example report:
```json
{
  "executionDate": "2024-01-15T10:00:00.000Z",
  "totalPatients": 10,
  "successful": 8,
  "failed": 2,
  "results": [
    {
      "patient": {
        "nome": "AGATHA GROSS ANDREIS",
        "carteirinha": "00410010008490763"
      },
      "status": "completed",
      "completedSteps": 10,
      "totalSteps": 10,
      "processingTime": "45s"
    }
  ]
}
```

## Automation Steps

The script performs these 12 steps for each patient:

1. **Register Without Card** - Clicks registration button
2. **Fill Card Details** - Enters card number and justification
3. **Confirm Dialog** - Handles confirmation message
4. **Register Without Biometrics** - Initiates biometric-less registration (skipped if patient.skip=true)
5. **Biometric Justification** - Provides reason for no biometrics (skipped if patient.skip=true)
6. **Answer Validation Questions** - Intelligently answers security questions (skipped if patient.skip=true)
7. **Load Authorization** - Refreshes authorization data
8. **Find Active Procedure** - Locates "Em Execução" row
9. **Set Procedure Date** - Calculates and fills appropriate date
10. **Select Professional** - Chooses the assigned professional
11. **Execute Procedure** - Clicks the Execute button to submit
12. **Confirm Success** - Handles success dialog and captures registration number

## Troubleshooting

### Common Issues

1. **Login failures**: Check credentials in `.env`
2. **Timeout errors**: Increase `TIMEOUT` in `.env`
3. **Element not found**: Website structure may have changed
4. **Network errors**: Check internet connection and retry

### Debug Mode

For detailed debugging:
```bash
LOG_LEVEL=debug npm start
```

## Security Notes

- Never commit `.env` file with real credentials
- Store screenshots securely (may contain PHI)
- Rotate credentials regularly
- Use secure password practices

## Requirements

- Node.js 16+ 
- NPM or Yarn
- Chrome/Chromium browser
- Stable internet connection