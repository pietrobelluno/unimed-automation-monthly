import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logsDir = join(dirname(__dirname), 'logs');

export class LiveSummaryLogger {
  constructor(totalSteps = 13) {
    this.summaryFile = join(logsDir, 'live_summary.md');
    this.startTime = new Date();
    this.currentPatient = null;
    this.currentStep = 0;
    this.totalSteps = totalSteps;
    
    // Initialize tracking arrays
    this.completed = [];
    this.failed = [];
    this.skipped = [];
    this.remaining = [];
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    
    // Initialize the summary file
    this.initializeSummary();
  }
  
  initializeSummary() {
    const content = `# Automation Live Summary
Started: ${this.startTime.toLocaleString()}
Last Updated: ${new Date().toLocaleString()}

## Current Status
🚀 **Starting automation...**

## Progress Overview
- Total Patients: 0
- Completed: 0 ✅
- Failed: 0 ❌
- Skipped: 0 ⏭️
- Remaining: 0 ⏳

## Completed Patients
_None yet_

## Failed Patients
_None yet_

## Skipped Patients
_None yet_

## Currently in Queue
_Loading patient list..._
`;
    
    fs.writeFileSync(this.summaryFile, content);
  }
  
  setPatientList(patients) {
    this.remaining = patients.map(p => ({
      name: p.nome,
      weekdays: p.weekdays || [],
      skip: p.skip || false
    }));
    this.updateSummary();
  }
  
  startPatient(patient, weekday) {
    this.currentPatient = {
      name: patient.nome,
      weekday: weekday,
      startTime: new Date(),
      skip: patient.skip || false,
      authQuantities: null
    };
    this.currentStep = 0;
    this.updateSummary();
  }
  
  updateStep(stepNumber, stepName, success = true) {
    this.currentStep = stepNumber;
    if (this.currentPatient) {
      this.currentPatient.lastStep = stepName;
      this.currentPatient.lastStepSuccess = success;
    }
    this.updateSummary();
  }
  
  updateAuthQuantities(quantities) {
    if (this.currentPatient) {
      this.currentPatient.authQuantities = quantities;
      this.updateSummary();
    }
  }
  
  completePatient(success = true, registrationNumber = null, error = null, realizationDate = null) {
    if (!this.currentPatient) return;
    
    const result = {
      ...this.currentPatient,
      endTime: new Date(),
      success: success,
      registrationNumber: registrationNumber,
      error: error,
      realizationDate: realizationDate,
      completedSteps: this.currentStep,
      authQuantities: this.currentPatient.authQuantities
    };
    
    if (success) {
      this.completed.push(result);
    } else {
      this.failed.push(result);
    }
    
    // Remove from remaining
    this.remaining = this.remaining.filter(p => 
      !(p.name === this.currentPatient.name && 
        (!this.currentPatient.weekday || p.weekdays.includes(this.currentPatient.weekday)))
    );
    
    this.currentPatient = null;
    this.currentStep = 0;
    this.updateSummary();
  }
  
  skipPatient(patient, weekday, reason) {
    const result = {
      name: patient.nome,
      weekday: weekday,
      reason: reason,
      skipTime: new Date()
    };
    
    this.skipped.push(result);
    
    // Remove from remaining
    this.remaining = this.remaining.filter(p => 
      !(p.name === patient.nome && p.weekdays.includes(weekday))
    );
    
    this.updateSummary();
  }
  
  updateSummary() {
    const now = new Date();
    const elapsed = Math.round((now - this.startTime) / 1000);
    const elapsedMinutes = Math.floor(elapsed / 60);
    const elapsedSeconds = elapsed % 60;
    
    let currentStatusText = '✅ **Idle - Waiting for next patient**';
    if (this.currentPatient) {
      const skipNote = this.currentPatient.skip ? ' (skip mode)' : '';
      currentStatusText = `🔄 **Currently Processing**: ${this.currentPatient.name} - ${this.currentPatient.weekday}${skipNote}\n`;
      currentStatusText += `   Step ${this.currentStep}/${this.totalSteps}`;
      if (this.currentPatient.lastStep) {
        currentStatusText += ` - ${this.currentPatient.lastStep}`;
      }
      currentStatusText += `\n   Started: ${this.currentPatient.startTime.toLocaleTimeString()}`;
      
      // Add authorization quantities if available
      if (this.currentPatient.authQuantities && 
          (this.currentPatient.authQuantities.quantSolic !== null || 
           this.currentPatient.authQuantities.quantAut !== null)) {
        const quant = this.currentPatient.authQuantities;
        const solicText = quant.quantSolic !== null ? quant.quantSolic : 'N/A';
        const autText = quant.quantAut !== null ? quant.quantAut : 'N/A';
        const realizText = quant.quantRealiz !== null ? quant.quantRealiz : 'N/A';
        
        currentStatusText += `\n   📊 **Authorization Status:**`;
        currentStatusText += `\n      • Requested: ${solicText} sessions`;
        currentStatusText += `\n      • Authorized: ${autText} sessions`;
        currentStatusText += `\n      • Completed: ${realizText} sessions`;
        
        if (quant.quantRealiz !== null && quant.quantAut !== null) {
          const remaining = quant.quantAut - quant.quantRealiz;
          currentStatusText += `\n      • Remaining: ${remaining} sessions`;
        }
      }
    }
    
    // Calculate total procedures
    const totalProcedures = this.completed.length + this.failed.length + 
                          this.skipped.length + this.remaining.reduce((sum, p) => sum + p.weekdays.length, 0);
    
    let content = `# Automation Live Summary
Started: ${this.startTime.toLocaleString()}
Last Updated: ${now.toLocaleString()}
Elapsed Time: ${elapsedMinutes}m ${elapsedSeconds}s

## Current Status
${currentStatusText}

## Progress Overview
- Total Procedures: ${totalProcedures}
- Completed: ${this.completed.length} ✅
- Failed: ${this.failed.length} ❌
- Skipped: ${this.skipped.length} ⏭️
- Remaining: ${this.remaining.reduce((sum, p) => sum + p.weekdays.length, 0)} ⏳

## Completed Patients
`;
    
    if (this.completed.length > 0) {
      this.completed.forEach(p => {
        const duration = Math.round((p.endTime - p.startTime) / 1000);
        content += `✅ **${p.name}** - ${p.weekday}\n`;
        content += `   • Steps: ${p.completedSteps}/${this.totalSteps}`;
        
        if (p.registrationNumber) {
          content += ` | Registration: ${p.registrationNumber}`;
        }
        
        if (p.realizationDate) {
          content += ` | Realization: ${p.realizationDate}`;
        }
        
        content += ` | Duration: ${duration}s\n`;
        
        // Add authorization quantities if available
        if (p.authQuantities && (p.authQuantities.quantSolic !== null || p.authQuantities.quantAut !== null)) {
          const quant = p.authQuantities;
          const solicText = quant.quantSolic !== null ? quant.quantSolic : 'N/A';
          const autText = quant.quantAut !== null ? quant.quantAut : 'N/A';
          const realizText = quant.quantRealiz !== null ? quant.quantRealiz : 'N/A';
          
          content += `   • 📊 Sessions: Requested: ${solicText} | Authorized: ${autText} | Completed: ${realizText}`;
          
          if (quant.quantRealiz !== null && quant.quantAut !== null) {
            const remaining = quant.quantAut - quant.quantRealiz;
            content += ` | Remaining: ${remaining}`;
          }
          content += '\n';
        }
        content += '\n';
      });
    } else {
      content += '_None yet_\n';
    }
    
    content += '\n## Failed Patients\n';
    if (this.failed.length > 0) {
      this.failed.forEach(p => {
        content += `❌ **${p.name}** - ${p.weekday} - Failed at Step ${p.completedSteps}`;
        if (p.lastStep) {
          content += `: ${p.lastStep}`;
        }
        if (p.error) {
          content += `\n   Error: ${p.error}`;
        }
        content += '\n';
      });
    } else {
      content += '_None yet_\n';
    }
    
    content += '\n## Skipped Patients\n';
    if (this.skipped.length > 0) {
      this.skipped.forEach(p => {
        content += `⏭️ **${p.name}** - ${p.weekday} - Reason: ${p.reason}\n`;
      });
    } else {
      content += '_None yet_\n';
    }
    
    content += '\n## Currently in Queue\n';
    if (this.remaining.length > 0) {
      // Group by patient and show weekdays
      const grouped = {};
      this.remaining.forEach(p => {
        if (!grouped[p.name]) {
          grouped[p.name] = { weekdays: [], skip: p.skip };
        }
        grouped[p.name].weekdays.push(...p.weekdays);
      });
      
      Object.entries(grouped).forEach(([name, data]) => {
        const skipNote = data.skip ? ' [SKIP]' : '';
        const weekdaysStr = [...new Set(data.weekdays)].join(', ');
        content += `⏳ **${name}**${skipNote} - ${weekdaysStr}\n`;
      });
    } else {
      content += '_Queue empty_\n';
    }
    
    content += `\n---\n_File: ${this.summaryFile}_\n`;
    content += `_Auto-generated by Unimed Automation System_\n`;
    
    // Write to file immediately (synchronous to ensure it's saved)
    fs.writeFileSync(this.summaryFile, content);
  }
  
  logError(message) {
    // Add error to current status and update
    if (this.currentPatient) {
      this.currentPatient.lastError = message;
    }
    this.updateSummary();
  }
}