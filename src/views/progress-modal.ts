/**
 * Progress Modal
 * Shows step-by-step progress during canvas generation
 */

import { App, Modal } from 'obsidian';

export interface ProgressStep {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export class ProgressModal extends Modal {
  private steps: ProgressStep[] = [];
  private stepsContainer!: HTMLElement;
  private statusMessage!: HTMLElement;
  private onCancel?: () => void;
  private isCancelled = false;

  constructor(app: App, onCancel?: () => void) {
    super(app);
    this.onCancel = onCancel;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('aca-progress-modal');

    contentEl.createEl('h2', { text: 'Generating Canvas...' });

    this.stepsContainer = contentEl.createDiv({ cls: 'aca-progress-steps' });
    this.statusMessage = contentEl.createDiv({ cls: 'aca-progress-status' });

    // Cancel button
    if (this.onCancel) {
      const cancelButton = contentEl.createEl('button', {
        text: 'Cancel',
        cls: 'aca-progress-cancel',
      });
      cancelButton.addEventListener('click', () => {
        this.isCancelled = true;
        this.onCancel?.();
        this.close();
      });
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * Initialize with a list of step labels
   */
  initSteps(labels: string[]): void {
    this.steps = labels.map((label) => ({
      label,
      status: 'pending',
    }));
    this.renderSteps();
  }

  /**
   * Update a specific step's status
   */
  updateStep(index: number, status: ProgressStep['status'], message?: string): void {
    if (index >= 0 && index < this.steps.length) {
      this.steps[index].status = status;
      this.steps[index].message = message;
      this.renderSteps();
    }
  }

  /**
   * Set the current step as running
   */
  setCurrentStep(index: number): void {
    this.steps.forEach((step, i) => {
      if (i < index) {
        step.status = 'completed';
      } else if (i === index) {
        step.status = 'running';
      } else {
        step.status = 'pending';
      }
    });
    this.renderSteps();
  }

  /**
   * Mark all steps as completed
   */
  complete(message?: string): void {
    this.steps.forEach((step) => {
      if (step.status !== 'error') {
        step.status = 'completed';
      }
    });
    this.renderSteps();
    if (message) {
      this.setStatus(message);
    }
  }

  /**
   * Set error state
   */
  setError(stepIndex: number, message: string): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].status = 'error';
      this.steps[stepIndex].message = message;
      this.renderSteps();
    }
    this.setStatus(`Error: ${message}`);
  }

  /**
   * Update status message
   */
  setStatus(message: string): void {
    this.statusMessage.textContent = message;
  }

  /**
   * Check if user cancelled
   */
  get cancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Render the steps list
   */
  private renderSteps(): void {
    this.stepsContainer.empty();

    for (const step of this.steps) {
      const stepEl = this.stepsContainer.createDiv({
        cls: `aca-progress-step aca-step-${step.status}`,
      });

      // Status icon
      const iconEl = stepEl.createSpan({ cls: 'aca-step-icon' });
      switch (step.status) {
        case 'pending':
          iconEl.textContent = '○';
          break;
        case 'running':
          iconEl.textContent = '◐';
          iconEl.addClass('aca-step-spinning');
          break;
        case 'completed':
          iconEl.textContent = '✓';
          break;
        case 'error':
          iconEl.textContent = '✗';
          break;
      }

      // Step label
      stepEl.createSpan({ text: step.label, cls: 'aca-step-label' });

      // Optional message
      if (step.message) {
        stepEl.createSpan({ text: ` - ${step.message}`, cls: 'aca-step-message' });
      }
    }
  }
}
