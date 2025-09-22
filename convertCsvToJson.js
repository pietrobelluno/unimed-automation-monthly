#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  
  const parts = birthDate.split(/[-\/]/);
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  
  const birth = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function formatCPF(cpf) {
  if (!cpf) return null;
  
  const cleaned = cpf.replace(/[^\d]/g, '');
  
  if (cleaned.length !== 11) return cleaned || null;
  
  return cleaned;
}

function parseWeekdays(daysString) {
  if (!daysString) return [];
  
  const dayMap = {
    'segunda': 'monday',
    'segunda-feira': 'monday',
    'segunda feira': 'monday',
    'segunta': 'monday',
    'terça': 'tuesday',
    'terca': 'tuesday',
    'terça-feira': 'tuesday',
    'terça feira': 'tuesday',
    'quarta': 'wednesday',
    'quarta-feira': 'wednesday',
    'quarta feira': 'wednesday',
    'quinta': 'thursday',
    'quinta-feira': 'thursday',
    'quinta feira': 'thursday',
    'sexta': 'friday',
    'sexta-feira': 'friday',
    'sexta feira': 'friday',
    'sábado': 'saturday',
    'sabado': 'saturday',
    'domingo': 'sunday'
  };
  
  const normalizedString = daysString.toLowerCase()
    .replace(/\s+e\s+/g, ',')
    .replace(/,\s+/g, ',')
    .replace(/\s+/g, ' ');
  
  const days = normalizedString.split(',');
  const weekdays = [];
  
  for (const day of days) {
    const trimmedDay = day.trim();
    if (dayMap[trimmedDay]) {
      weekdays.push(dayMap[trimmedDay]);
    }
  }
  
  return weekdays;
}

function convertCSVToJSON(csvFilePath, outputPath, professional = 'flavia manuela boeira') {
  try {
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    const csvData = parseCSV(csvContent);
    
    const jsonData = csvData
      .filter(row => row.nome && row.nome.trim() !== '')
      .map(row => {
        const patient = {
          nome: row.nome.trim().toUpperCase(),
          skip: row.skip === 'true' || row.skip === true,
          carteirinha: row.carteirinha ? row.carteirinha.trim() : null,
          nascimento: row.nascimento ? row.nascimento.trim() : null,
          cpf: formatCPF(row.cpf),
          nomeDaMae: row['nome da mae'] ? row['nome da mae'].trim() : null,
          nomeDoTitular: row['nome do titular'] ? row['nome do titular'].trim() : null,
          idade: calculateAge(row.nascimento),
          weekdays: parseWeekdays(row['Dias de atendimento']),
          professional: professional
        };
        
        return patient;
      });
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    
    console.log(`✅ Successfully converted ${jsonData.length} patients`);
    console.log(`📄 Output saved to: ${outputPath}`);
    
    const skipped = jsonData.filter(p => p.skip).length;
    const active = jsonData.filter(p => !p.skip).length;
    console.log(`📊 Active: ${active}, Skipped: ${skipped}`);
    
    return jsonData;
  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error.message);
    process.exit(1);
  }
}

function getDateSuffix() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  return `${day}_${month}`;
}

function addDateToFilename(filename) {
  const dateSuffix = getDateSuffix();
  
  // If no filename provided, use default with date
  if (!filename) {
    return `patients_data_${dateSuffix}.json`;
  }
  
  // If filename has extension, insert date before extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0) {
    const name = filename.substring(0, lastDot);
    const extension = filename.substring(lastDot);
    return `${name}_${dateSuffix}${extension}`;
  }
  
  // If no extension, just append date
  return `${filename}_${dateSuffix}`;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node convertCsvToJson.js <csv-file> [output-file] [professional-name]');
    console.log('Example: node convertCsvToJson.js patients.csv');
    console.log('         (generates: patients_data_DD_MM.json with current date)');
    console.log('Example: node convertCsvToJson.js patients.csv custom.json "flavia manuela boeira"');
    console.log('         (generates: custom_DD_MM.json with current date)');
    process.exit(1);
  }
  
  const csvFile = args[0];
  const outputFile = addDateToFilename(args[1]);
  const professional = args[2] || 'flavia manuela boeira';
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    process.exit(1);
  }
  
  convertCSVToJSON(csvFile, outputFile, professional);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { convertCSVToJSON, parseCSV, calculateAge, formatCPF, parseWeekdays };