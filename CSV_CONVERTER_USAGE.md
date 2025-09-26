# CSV to JSON Converter Usage Guide

## Overview
This script converts patient CSV data to JSON format for the Unimed Monthly Automation system. It extracts specific day numbers from the "Dias de lançamento" column to schedule monthly procedures.

## Usage

### Basic Command
```bash
node convertCsvToJson.js patients.csv
```

### With Custom Output File
```bash
node convertCsvToJson.js patients.csv custom_output.json
```

### With Custom Professional Name
```bash
node convertCsvToJson.js patients.csv output.json "Dr. John Doe"
```

## CSV Format Requirements

Your CSV file must include these columns:
- `nome` - Patient name
- `skip` - Whether to skip biometric steps (true/false)
- `carteirinha` - Card number
- `nascimento` - Birth date (DD-MM-YYYY format)
- `cpf` - CPF number
- `nome da mae` - Mother's name
- `nome do titular` - Titular's name
- `Dias de lançamento` - Monthly days for procedures (e.g., "2, 15, 30")

### Example CSV:
```csv
nome,skip,carteirinha,nascimento,cpf,nome da mae,nome do titular,Dias de lançamento
JOÃO SILVA,false,00410001001251870,07-02-2016,052.484.360-64,Maria Silva,José Silva,"10,24"
MARIA SANTOS,true,00410010009464596,04-04-2023,071.044.030-86,Ana Santos,Pedro Santos,"8,15,22"
```

## JSON Output Structure

The converter generates a JSON file with the following structure:

```json
[
  {
    "nome": "JOÃO SILVA",
    "skip": false,
    "carteirinha": "00410001001251870",
    "nascimento": "07-02-2016",
    "cpf": "05248436064",
    "nomeDaMae": "Maria Silva",
    "nomeDoTitular": "José Silva",
    "idade": 8,
    "monthlyDays": [10, 24],
    "professional": "flavia manuela boeira"
  }
]
```

## Key Features

### Monthly Days Extraction
- Parses the "Dias de lançamento" column
- Extracts day numbers (1-31)
- Sorts and removes duplicates
- Example: "10,24" → `[10, 24]`

### Date Format Conversion
- Input: DD-MM-YYYY (from CSV)
- Output: DD-MM-YYYY (kept for JSON)
- Used as DD/MM/YYYY during automation

### Automatic File Naming
- Adds current date suffix to output files
- Format: `patients_data_DD_MM.json`
- Example: `patients_data_26_09.json`

### CPF Formatting
- Removes all non-numeric characters
- Stores as numeric string
- Example: "052.484.360-64" → "05248436064"

### Age Calculation
- Automatically calculates age from birth date
- Adds `idade` field to JSON

## How It Works

1. **Read CSV**: Parses the CSV file with proper handling of quoted fields
2. **Extract Days**: Converts "Dias de lançamento" to array of day numbers
3. **Transform Data**:
   - Uppercases names
   - Formats CPF
   - Calculates age
   - Parses skip status
4. **Generate JSON**: Creates properly formatted JSON file
5. **Add Date Suffix**: Appends current date to filename

## Examples

### Run with default settings:
```bash
node convertCsvToJson.js patients.csv
# Output: patients_data_26_09.json (with current date)
```

### Run with custom output:
```bash
node convertCsvToJson.js patients.csv monthly_patients.json
# Output: monthly_patients_26_09.json
```

### Run with custom professional:
```bash
node convertCsvToJson.js patients.csv output.json "Dr. Smith"
# Sets professional field to "Dr. Smith" for all patients
```

## Troubleshooting

### Common Issues

1. **Missing columns**: Ensure your CSV has all required columns
2. **Date format**: Use DD-MM-YYYY format in CSV
3. **Days format**: Use comma-separated numbers (e.g., "1,15,30")
4. **Encoding issues**: Save CSV as UTF-8

### Validation

The converter will:
- Skip patients without names
- Validate day numbers (1-31)
- Handle missing optional fields gracefully
- Report conversion statistics

## Integration with Automation

After conversion, update your `.env` file:
```env
PATIENT_DATA_FILE=patients_data_26_09.json
```

Or use the generated file directly with the automation script.