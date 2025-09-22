import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(dirname(__dirname), ".env") });

export const config = {
  credentials: {
    clinica: process.env.CLINICA,
    usuario: process.env.USUARIO,
    senha: process.env.SENHA,
  },
  browser: {
    headless: process.env.HEADLESS === "true",
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    screenshotOnError: process.env.SCREENSHOT_ON_ERROR === "true",
  },
  dataFiles: {
    patientData: process.env.PATIENT_DATA_FILE || "patients_data.json",
  },
  urls: {
    base: process.env.BASE_URL,
    login: process.env.BASE_URL,
  },
  logLevel: process.env.LOG_LEVEL || "info",
};

export const selectors = {
  login: {
    usuarioInput: "#j_provider",
    clinicaInput: "#j_username",
    senhaInput: "#j_password_aux",
    submitButton: "#sub",
    cancelButton: "#Form\\:btnCancel",
  },
  registration: {
    noCardButton: "#Form\\:no-card2",
    noCardDialog: "#mpNoCardContentDiv",
    cardNumberInput: "#insuranceNoCardForm\\:registrationId",
    justificationSelect:
      "#insuranceNoCardForm\\:justicationSend\\:justificationID",
    sendButton: "#insuranceNoCardForm\\:btnSend",
    okButton: "#insuranceNoCardForm\\:btnOK",
    confirmButton: "#formError\\:btnReturn",
    noBiometricButton: 'input[value="REGISTRO SEM BIOMETRIA"]',
    noBiometricDialog: "#mpNoBioCDiv",
    bioJustificationSelect:
      'select[name^="insuranceNoBioForm:justicationSend:"]',
    bioSendButton: "#insuranceNoBioForm\\:btnSend2",
  },
  validation: {
    firstAnswer: "#Form\\:firstAnswer",
    secondAnswer: "#Form\\:j_id304",
    thirdAnswer: "#Form\\:j_id308",
    submitButton: "#Form\\:btnSend",
  },
  authorization: {
    refreshIcon: 'img[src="/autorizador/images/refresh-icon.png"]',
    guidesTable: "#Form\\:guides\\:guides_grid",
    statusCell: '[id^="Form:guides:guides_grid:"][id$=":j_id1086"]',
    actionLink: '[id^="Form:guides:guides_grid:"][id$=":j_id1100"]',
  },
  procedure: {
    dateInput: "#Form\\:procedures\\:0\\:date",
    executantTable: "#Form\\:executantTable",
    searchIcon: 'img[src*="search.png"]',
    professionalDialog: "#searchProfessionalContentDiv",
  },
};
