import { chromium } from "playwright";
import { config, selectors } from "./config.js";
import { PatientManager } from "./patients.js";
import { logger } from "./logger.js";
import { LiveSummaryLogger } from "./liveSummaryLogger.js";
import {
  getCurrentWeekDate,
  validateProcedureDate,
  waitWithTimeout,
  clickAndWait,
  fillInput,
  selectOption,
  retry,
  takeScreenshot,
  handleDialog,
  delay,
} from "./utils.js";

class UnimedAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.patientManager = new PatientManager();
    this.liveSummary = new LiveSummaryLogger(13); // Updated to 13 total steps
  }

  async initialize() {
    logger.info("Initializing browser...");

    this.browser = await chromium.launch({
      headless: config.browser.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    this.page = await this.context.newPage();

    // Set default timeout
    this.page.setDefaultTimeout(config.browser.timeout);

    logger.info("Browser initialized successfully");
  }

  async login() {
    logger.info("Navigating to login page...");
    await this.page.goto(config.urls.login);

    // Fill login credentials in correct order
    await fillInput(
      this.page,
      selectors.login.usuarioInput,
      config.credentials.usuario
    );
    await fillInput(
      this.page,
      selectors.login.clinicaInput,
      config.credentials.clinica
    );
    await fillInput(
      this.page,
      selectors.login.senhaInput,
      config.credentials.senha
    );

    // Submit login - handle JavaScript form submission
    await Promise.all([
      this.page.waitForURL("**/*", {
        waitUntil: "networkidle",
        timeout: 30000,
      }),
      this.page.click(selectors.login.submitButton),
    ]);

    // Check for "Liberação Digital" screen and click cancel if present
    try {
      // Wait a moment for the page to fully render
      await this.page.waitForTimeout(2000);

      // Check if the text exists on the page (using regex to handle whitespace)
      const liberacaoDigitalText = await this.page
        .getByText(/Liberação\s+Digital/i)
        .count();

      if (liberacaoDigitalText > 0) {
        logger.info("Found 'Liberação Digital' screen, clicking cancel...");
        await this.page.click(selectors.login.cancelButton);
        await this.page.waitForLoadState("networkidle", { timeout: 10000 });
        logger.info("Dismissed 'Liberação Digital' screen");
      } else {
        logger.debug("'Liberação Digital' screen not found, continuing...");
      }
    } catch (error) {
      console.log(error);
      logger.error(
        "Error checking for 'Liberação Digital' screen:",
        error.message
      );
    }

    logger.info("Login completed successfully");
  }

  async processPatientWeekday(patient, weekday, patientIndex) {
    logger.info(`Processing patient: ${patient.nome} - ${weekday}`);
    this.liveSummary.startPatient(patient, weekday);

    try {
      // Step 1: Navigate to Checkin and Click "Register Without Card"
      logger.info("Step 1: Navigating to Checkin and clicking Register Without Card");
      
      // Click Checkin menu item using the specific ID
      await this.page.click('#iconFormMenu\\:j_id161\\:j_id165');
      logger.info("Clicked Checkin menu, waiting for page to load...");
      
      // Wait for the Register Without Card button to appear
      // This ensures we've navigated to the Checkin page
      await waitWithTimeout(this.page, selectors.registration.noCardButton);
      logger.info("Register Without Card button is now visible");
      
      // Now click Register Without Card button
      await clickAndWait(
        this.page,
        selectors.registration.noCardButton,
        selectors.registration.noCardDialog
      );
      this.liveSummary.updateStep(1, "Checkin accessed and Register Without Card clicked");

      // Step 2: Fill Card Number and Justification
      logger.info("Step 2: Filling card number and justification");
      await fillInput(
        this.page,
        selectors.registration.cardNumberInput,
        patient.carteirinha
      );

      // Click outside to trigger field validation and load other fields
      // First, ensure the input has focus, then blur it
      await this.page.locator(selectors.registration.cardNumberInput).blur();

      // Alternative: Click on a specific element outside the input
      await this.page.locator("body").click({ position: { x: 10, y: 10 } });

      // Wait for initial page stabilization
      await delay(1000);

      // Try to wait for justification select with proper timeout
      let justificationExists = false;
      try {
        logger.info("Waiting for justification select field to appear...");
        await this.page.waitForSelector(selectors.registration.justificationSelect, {
          timeout: 5000, // Give it 5 seconds to appear
          state: 'visible'
        });
        justificationExists = true;
        logger.info("Justification select found, filling with value 100");
      } catch (error) {
        // Only after timeout can we be sure it's intercâmbio
        logger.info("Justification select not found after 5 seconds (intercâmbio patient)");
      }
      
      if (justificationExists) {
        await selectOption(
          this.page,
          selectors.registration.justificationSelect,
          "100"
        );
        await clickAndWait(this.page, selectors.registration.sendButton);
        this.liveSummary.updateStep(2, "Card number and justification filled");
      } else {
        logger.info("Clicking OK button for intercâmbio patient");
        await clickAndWait(this.page, selectors.registration.okButton);
        this.liveSummary.updateStep(2, "Card number filled (intercâmbio - no justification needed)");
      }

      // Step 3: Handle Confirmation Dialog (two possible messages)
      logger.info("Step 3: Handling confirmation dialog");
      
      // Wait for either confirmation message to appear
      await this.page.waitForFunction(
        () => {
          const bodyText = document.body.textContent;
          return bodyText.includes("Registro sem cartão liberado. Justificativa enviada.") ||
                 bodyText.includes("Registro sem cartão liberado para beneficiário de intercambio. Não é necessário informar a justificativa.");
        },
        { timeout: 10000 }
      );
      
      // Check which message appeared for logging
      const pageContent = await this.page.textContent('body');
      const isIntercambio = pageContent.includes("beneficiário de intercambio");
      
      if (isIntercambio) {
        logger.info("Intercâmbio patient confirmation detected");
      } else {
        logger.info("Regular patient confirmation detected");
      }
      
      // Click confirmation button
      await this.page.click(selectors.registration.confirmButton);
      this.liveSummary.updateStep(3, `Confirmation dialog handled${isIntercambio ? ' (intercâmbio)' : ''}`);

      // Check if patient should skip biometric registration and validation
      if (patient.skip === true) {
        logger.info(`Patient ${patient.nome} has skip flag - jumping to step 7`);
        this.liveSummary.updateStep(6, "Skipped biometric/validation - Patient already registered");
      } else {
        // Step 4: Click "REGISTRO SEM BIOMETRIA"
        logger.info("Step 4: Clicking Register Without Biometrics");
        await clickAndWait(
          this.page,
          selectors.registration.noBiometricButton,
          selectors.registration.noBiometricDialog
        );
        this.liveSummary.updateStep(4, "Register Without Biometrics clicked");

        // Step 5: Biometric Justification
        logger.info("Step 5: Filling biometric justification");
        await selectOption(
          this.page,
          selectors.registration.bioJustificationSelect,
          "200"
        );
        await clickAndWait(this.page, selectors.registration.bioSendButton);
        this.liveSummary.updateStep(5, "Biometric justification filled");

        // Step 6: Answer Random Validation Questions
        logger.info("Step 6: Answering validation questions");
        await this.answerValidationQuestions(patient);
        this.liveSummary.updateStep(6, "Validation questions answered");
      }

      // Step 7: Load Authorization Data
      logger.info("Step 7: Loading authorization data");
      
      // Check if the contact update modal is visible
      // Check the main modal wrapper, not the inner container
      const isModalVisible = await this.page.evaluate(() => {
        const modal = document.querySelector('#mpUpdateInsuranceUserContact');
        if (modal) {
          const style = window.getComputedStyle(modal);
          return style.display !== 'none';
        }
        return false;
      });
      
      if (isModalVisible) {
        logger.info("Contact update modal is visible, clicking Cancel...");
        // Click the Cancel button in the modal
        await this.page.click('#updateInsuraceUserContactForm\\:j_id596');
        // Wait for modal to close
        await delay(1000);
      }
      
      // Now proceed with loading authorization data
      await clickAndWait(this.page, selectors.authorization.refreshIcon);
      this.liveSummary.updateStep(7, "Authorization data loaded");

      // Step 8: Locate "Em Execução" Row
      logger.info("Step 8: Locating Em Execução row");
      const authQuantities = await this.findAndClickExecutionRow();
      
      // Check if the execution row was found
      if (!authQuantities.found) {
        logger.warn(`Could not find "Em Execução" row for patient ${patient.nome}, skipping to next patient`);
        this.liveSummary.updateStep(8, "Em Execução row not found - skipping patient", false);
        this.liveSummary.completePatient(false, null, "Could not find Em Execução row after refresh", null);
        return; // Skip to the next patient
      }
      
      this.liveSummary.updateStep(8, "Em Execução row found and clicked");
      
      // Update live summary with authorization quantities if available
      if (authQuantities.quantSolic !== null || authQuantities.quantAut !== null) {
        this.liveSummary.updateAuthQuantities(authQuantities);
      }

      // Step 9: Fill Date for Procedure
      logger.info("Step 9: Filling procedure date");
      const dateInfo = getCurrentWeekDate(weekday);
      const validatedDate = validateProcedureDate(dateInfo);

      if (!validatedDate.isValid) {
        logger.warn(`Skipping procedure: ${validatedDate.message}`);
        this.liveSummary.skipPatient(patient, weekday, validatedDate.message);
        return; // Skip this procedure
      }
      
      // Wait for the date input field to appear (sometimes takes time to load)
      logger.info("Waiting for date input field to appear...");
      await waitWithTimeout(this.page, selectors.procedure.dateInput);
      
      // Add small delay to ensure the field is fully interactive
      await delay(500);
      
      // Form:procedures:0:date
      await fillInput(
        this.page,
        selectors.procedure.dateInput,
        validatedDate.date
      );
      this.liveSummary.updateStep(9, "Procedure date filled");

      // Step 10: Select Professional
      logger.info("Step 10: Selecting professional");
      await this.selectProfessional(patient.professional || "Dr. Carol Silva");
      this.liveSummary.updateStep(10, "Professional selected");

      // Step 11: Click Execute Button
      logger.info("Step 11: Clicking Execute button");
      await waitWithTimeout(this.page, "#Form\\:j_id1127");
      await delay(500); // Small delay to ensure button is ready
      await clickAndWait(this.page, "#Form\\:j_id1127");
      this.liveSummary.updateStep(11, "Execute button clicked");

      // Step 12: Handle Success Confirmation
      logger.info("Step 12: Handling success confirmation");
      // Wait for the modal dialog to appear
      await waitWithTimeout(this.page, "#mpErrorsContentTable");
      await delay(1000); // Wait for dialog content to load
      
      // Get the success message text
      const successMessage = await this.page.textContent('.rich-messages-label');
      logger.info(`Success message: ${successMessage}`);
      
      // Extract registration number if present
      let registrationNumber = null;
      const match = successMessage.match(/(\d{12})/);
      if (match) {
        registrationNumber = match[1];
        logger.info(`Registration number: ${registrationNumber}`);
      }
      
      // Verify it's a success message
      if (successMessage && successMessage.includes('realizado com sucesso')) {
        // Click OK button to close the dialog
        await clickAndWait(this.page, "#formError\\:btnReturn");
        this.liveSummary.updateStep(12, "Success confirmation handled");
      } else {
        throw new Error(`Unexpected message in confirmation dialog: ${successMessage}`);
      }

      // Step 13: Capture Realization Date from services table
      logger.info("Step 13: Capturing realization date from services table");
      let realizationDate = null;
      try {
        // Wait for the services table to appear
        await waitWithTimeout(this.page, "#Form\\:servicesTable", 5000);
        await delay(500); // Small delay to ensure table is fully loaded
        
        // Extract the realization date from the first cell's span
        realizationDate = await this.page.textContent('#Form\\:servicesTable tbody tr:first-child td:first-child span');
        
        if (realizationDate) {
          realizationDate = realizationDate.trim();
          logger.info(`Realization date: ${realizationDate}`);
          this.liveSummary.updateStep(13, `Realization date captured: ${realizationDate}`);
        } else {
          logger.warn("Could not extract realization date from services table");
        }
      } catch (error) {
        logger.warn(`Could not capture realization date: ${error.message}`);
      }

      // Mark patient as successfully processed
      this.liveSummary.completePatient(true, registrationNumber, null, realizationDate);
      logger.info(`Successfully processed patient: ${patient.nome}`);
    } catch (error) {
      logger.error(
        `Error processing patient ${patient.nome}: ${error.message}`
      );

      // Take screenshot on error
      if (config.browser.screenshotOnError) {
        await takeScreenshot(
          this.page,
          `error_${patient.carteirinha}`
        );
      }

      this.liveSummary.completePatient(false, null, error.message, null);
      throw error;
    }
  }

  async answerValidationQuestions(patient) {
    await waitWithTimeout(this.page, selectors.validation.firstAnswer);

    // Get question texts from h4 elements
    const questions = await this.page.evaluate(() => {
      const h4Elements = Array.from(document.querySelectorAll("h4"));
      return h4Elements.map((h4) => h4.textContent.trim());
    });

    logger.info(`Found validation questions: ${questions.join(", ")}`);

    // Map questions to answers
    const answers = questions.map((q) =>
      this.patientManager.mapValidationAnswer(q, patient)
    );

    // Log answers for debugging
    logger.debug(`Mapped answers: ${answers.join(", ")}`);

    // Fill answers - note that the second and third inputs don't have IDs
    if (answers[0]) {
      await fillInput(this.page, selectors.validation.firstAnswer, answers[0]);
    }
    if (answers[1]) {
      // Use name attribute for second input
      await fillInput(this.page, 'input[name="Form:j_id304"]', answers[1]);
    }
    if (answers[2]) {
      // Use name attribute for third input
      await fillInput(this.page, 'input[name="Form:j_id308"]', answers[2]);
    }

    // Submit answers
    await clickAndWait(this.page, selectors.validation.submitButton);
  }

  async findAndClickExecutionRow(retryAttempt = false) {
    await waitWithTimeout(this.page, selectors.authorization.guidesTable);

    // Wait a bit for table to fully load
    await delay(1000);

    // Find the row with "Em Execução" status, extract quantities, and click the [Executar] link
    const result = await this.page.evaluate(() => {
      // Get all table rows
      const rows = document.querySelectorAll("#Form\\:guides\\:guides_grid tr");
      
      // Find all tooltip content elements using pattern matching
      // This will match any ID like Form:guides:guides_grid:0:j_idXXXcontent
      const allTooltips = document.querySelectorAll('[id^="Form:guides:guides_grid:"][id$="content"]');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Get all td cells in this row
        const cells = row.querySelectorAll('td');
        
        // Check if row has at least 6 cells
        if (cells.length >= 6) {
          // Check the 5th cell (index 4) for "Em Execução" status
          const statusCell = cells[4];
          if (statusCell && statusCell.textContent.includes("Em Execução")) {
            let quantSolic = null;
            let quantAut = null;
            let quantRealiz = null;
            
            // Try to find the tooltip for this row
            // Row index in table (excluding header) should match tooltip index
            const rowIndex = i - 1; // Subtract 1 for header row
            
            // Look through all tooltips to find one matching this row index
            for (const tooltip of allTooltips) {
              // Check if this tooltip ID contains our row index
              // Pattern: Form:guides:guides_grid:ROWINDEX:j_idXXXcontent
              if (tooltip.id.includes(`:${rowIndex}:`)) {
                const tooltipText = tooltip.textContent || tooltip.innerText;
                
                // Extract Quant Solic
                const solicMatch = tooltipText.match(/Quant Solic:\s*(\d+)/);
                if (solicMatch) quantSolic = parseInt(solicMatch[1]);
                
                // Extract Quant Aut
                const autMatch = tooltipText.match(/Quant Aut:\s*(\d+)/);
                if (autMatch) quantAut = parseInt(autMatch[1]);
                
                // Extract Quant Realiz
                const realizMatch = tooltipText.match(/Quant Realiz:\s*(\d+)/);
                if (realizMatch) quantRealiz = parseInt(realizMatch[1]);
                
                console.log(`Found tooltip for row ${rowIndex}:`, tooltipText);
                break;
              }
            }
            
            // If no tooltip found, try to extract from visible table cells
            if (quantSolic === null && quantAut === null) {
              // Sometimes the quantities might be in the table cells themselves
              const rowText = row.textContent;
              console.log('No tooltip found, checking row text:', rowText);
            }
            
            // Find all anchors in the 6th cell (index 5)
            const actionCell = cells[5];
            const anchors = actionCell.querySelectorAll('a');
            
            // Click the second anchor which is [Executar]
            if (anchors.length > 1) {
              anchors[1].click();
              return {
                clicked: true,
                quantSolic,
                quantAut,
                quantRealiz
              };
            }
          }
        }
      }
      return { clicked: false };
    });

    // If row was not found and this is the first attempt, try refreshing the data
    if (!result.clicked && !retryAttempt) {
      logger.info('Could not find "Em Execução" row, refreshing authorization data...');
      
      try {
        // Click refresh icon to reload the authorization data
        await clickAndWait(this.page, selectors.authorization.refreshIcon);
        
        // Wait for the table to reload
        await delay(2000);
        
        // Recursively call this method with retry flag set to true
        return await this.findAndClickExecutionRow(true);
      } catch (error) {
        logger.error('Error refreshing authorization data:', error.message);
      }
    }

    // If still not found after retry, return a special indicator
    if (!result.clicked) {
      logger.warn('Could not find "Em Execução" row after refresh attempt');
      return {
        found: false,
        quantSolic: null,
        quantAut: null,
        quantRealiz: null
      };
    }

    // Log the quantities if found
    if (result.quantSolic !== null || result.quantAut !== null) {
      logger.info(`Authorization quantities - Requested: ${result.quantSolic}, Authorized: ${result.quantAut}, Completed: ${result.quantRealiz || 0}`);
    }

    // Wait for navigation after clicking
    await this.page.waitForLoadState("networkidle", { timeout: 10000 });
    
    // Return the quantities for use in summary
    return {
      found: true,
      quantSolic: result.quantSolic,
      quantAut: result.quantAut,
      quantRealiz: result.quantRealiz
    };
  }

  async selectProfessional(professionalName) {
    // Click search icon in executant table
    const searchIcon = await this.page
      .locator(
        `${selectors.procedure.executantTable} ${selectors.procedure.searchIcon}`
      )
      .first();
    await searchIcon.click();

    // Wait for professional dialog/table to load
    await this.page.waitForSelector("#Zoom_Professional\\:providers", {
      timeout: 10000,
    });
    await delay(1000); // Wait for table to populate

    // Find and click the professional by name (case-insensitive)
    const clicked = await this.page.evaluate((targetName) => {
      // Get all links in the professional table
      const links = document.querySelectorAll(
        "#Zoom_Professional\\:providers a.link"
      );

      for (const link of links) {
        // Compare names case-insensitively
        if (
          link.textContent.trim().toLowerCase() === targetName.toLowerCase()
        ) {
          link.click();
          return true;
        }
      }
      return false;
    }, professionalName);

    if (!clicked) {
      logger.error(`Could not find professional: ${professionalName}`);
      throw new Error(
        `Professional "${professionalName}" not found in the list`
      );
    }

    // Wait for dialog to close and page to update
    await delay(1000);
  }

  async run() {
    try {
      await this.initialize();
      await this.login();

      const patients = this.patientManager.getAllPatients();
      
      // Set patient list in live summary
      this.liveSummary.setPatientList(patients);

      // Calculate total procedures to process
      let totalProcedures = 0;
      patients.forEach((patient) => {
        totalProcedures += patient.weekdays ? patient.weekdays.length : 0;
      });

      logger.info(
        `Starting to process ${patients.length} patients with ${totalProcedures} total procedures`
      );
      logger.info(`Live summary available at: logs/live_summary.md`);

      for (let i = 0; i < patients.length; i++) {
        const patient = patients[i];

        // Process each weekday for this patient
        if (patient.weekdays && patient.weekdays.length > 0) {
          for (const weekday of patient.weekdays) {
            try {
              // Check if this weekday should be processed
              const dateInfo = getCurrentWeekDate(weekday);
              const validatedDate = validateProcedureDate(dateInfo);

              if (!validatedDate.isValid) {
                this.liveSummary.skipPatient(patient, weekday, validatedDate.message);
                logger.info(
                  `Skipping ${patient.nome} - ${weekday}: ${validatedDate.message}`
                );
                continue;
              }

              await retry(
                () => this.processPatientWeekday(patient, weekday, i),
                config.browser.retryAttempts,
                5000
              );
            } catch (error) {
              logger.error(
                `Failed to process patient ${patient.nome} - ${weekday} after ${config.browser.retryAttempts} attempts`
              );
            }

            // Add delay between procedures
            await delay(2000);
          }
        } else {
          logger.warn(`Patient ${patient.nome} has no weekdays configured`);
        }
      }
    } catch (error) {
      logger.error("Fatal error in automation:", error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new UnimedAutomation();

  automation
    .run()
    .then(() => {
      logger.info("Automation completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Automation failed:", error);
      process.exit(1);
    });
}

export default UnimedAutomation;
