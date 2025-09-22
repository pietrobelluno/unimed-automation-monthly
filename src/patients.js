import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build the full path using the configured filename
const dataFilePath = join(dirname(__dirname), config.dataFiles.patientData);

// Check if file exists
if (!existsSync(dataFilePath)) {
  console.error(`Patient data file not found: ${dataFilePath}`);
  console.error(`Please ensure the file exists or update PATIENT_DATA_FILE in your .env file`);
  process.exit(1);
}

// Load patient data from the configured JSON file
const rawData = readFileSync(dataFilePath, 'utf-8');
const patientsJson = JSON.parse(rawData);

console.log(`Loaded ${patientsJson.length} patients from ${config.dataFiles.patientData}`);

// Transform the data: convert date format from DD-MM-YYYY to DD/MM/YYYY
export const patients = patientsJson.map(patient => ({
  ...patient,
  nascimento: patient.nascimento ? patient.nascimento.replace(/-/g, '/') : null
}));

export class PatientManager {
  constructor(patientList = patients) {
    this.patients = patientList;
    this.currentIndex = 0;
  }

  getCurrentPatient() {
    return this.patients[this.currentIndex];
  }

  nextPatient() {
    this.currentIndex++;
    return this.currentIndex < this.patients.length;
  }

  resetIndex() {
    this.currentIndex = 0;
  }

  getPatientByCarteirinha(carteirinha) {
    return this.patients.find((p) => p.carteirinha === carteirinha);
  }

  getAllPatients() {
    return this.patients;
  }

  getPatientCount() {
    return this.patients.length;
  }

  // Parse CPF to extract specific digits
  getCPFDigits(cpf, startPos, endPos) {
    const cleanCPF = cpf.replace(/[.-]/g, "");
    return cleanCPF.substring(startPos - 1, endPos);
  }

  // Get mother's last name
  getMothersLastName(patient) {
    if (!patient.nomeDaMae) return "";
    const names = patient.nomeDaMae.split(" ");
    return names[names.length - 1];
  }

  // Get titular's first name
  getTitularFirstName(patient) {
    if (!patient.nomeDoTitular) return "";
    const names = patient.nomeDoTitular.split(" ");
    return names[0];
  }

  // Map validation questions to patient data
  mapValidationAnswer(question, patient) {
    const questionLower = question.toLowerCase();

    // Mother's name questions
    if (
      questionLower.includes("primeiro nome") &&
      questionLower.includes("mãe")
    ) {
      if (!patient.nomeDaMae) return "";
      const names = patient.nomeDaMae.split(" ");
      return names[0];
    }

    if (
      questionLower.includes("último nome") &&
      questionLower.includes("mãe")
    ) {
      if (!patient.nomeDaMae) return "";
      const names = patient.nomeDaMae.split(" ");
      return names[names.length - 1];
    }

    // Titular's name questions
    if (
      questionLower.includes("primeiro nome") &&
      questionLower.includes("titular")
    ) {
      if (!patient.nomeDoTitular) return "";
      const names = patient.nomeDoTitular.split(" ");
      return names[0];
    }

    if (
      questionLower.includes("último nome") &&
      questionLower.includes("titular")
    ) {
      if (!patient.nomeDoTitular) return "";
      const names = patient.nomeDoTitular.split(" ");
      return names[names.length - 1];
    }

    // CPF questions
    if (
      questionLower.includes("três primeiros") &&
      questionLower.includes("cpf")
    ) {
      if (!patient.cpf) return "";
      return patient.cpf.substring(0, 3);
    }

    if (
      questionLower.includes("quarto, quinto e sexto") &&
      questionLower.includes("cpf")
    ) {
      if (!patient.cpf) return "";
      return patient.cpf.substring(3, 6);
    }

    if (
      questionLower.includes("dois últimos") &&
      questionLower.includes("cpf")
    ) {
      if (!patient.cpf) return "";
      return patient.cpf.substring(patient.cpf.length - 2);
    }

    // Age question
    if (questionLower.includes("idade") && questionLower.includes("anos")) {
      return patient.idade ? patient.idade.toString() : "";
    }

    // Birth date questions
    if (questionLower.includes("dia de nascimento")) {
      if (!patient.nascimento) return "";
      const [day] = patient.nascimento.split("/");
      return day;
    }

    if (questionLower.includes("mês de nascimento")) {
      if (!patient.nascimento) return "";
      const [, month] = patient.nascimento.split("/");
      return month;
    }

    if (questionLower.includes("ano de nascimento")) {
      if (!patient.nascimento) return "";
      const [, , year] = patient.nascimento.split("/");
      return year;
    }

    // Default: return empty string and log for manual review
    console.warn(`Could not map validation question: "${question}"`);
    return "";
  }
}
