// Degradation Strategy Implementation

import { DegradationStrategy } from './types/resource';

export class DefaultDegradationStrategy implements DegradationStrategy {
  private isThrottlingEnabled = false;
  private isQualityReduced = false;
  private nonEssentialFeaturesDisabled = false;

  async reduceBrowserPoolSize(): Promise<void> {
    console.info('Reducing browser pool size due to resource limits');
  }

  async reduceRenderingQuality(): Promise<void> {
    if (!this.isQualityReduced) {
      this.isQualityReduced = true;
      console.info('Reducing rendering quality due to resource limits');
    }
  }

  async enableRequestThrottling(): Promise<void> {
    if (!this.isThrottlingEnabled) {
      this.isThrottlingEnabled = true;
      console.info('Enabling request throttling due to resource limits');
    }
  }

  async disableNonEssentialFeatures(): Promise<void> {
    if (!this.nonEssentialFeaturesDisabled) {
      this.nonEssentialFeaturesDisabled = true;
      console.info('Disabling non-essential features due to resource limits');
    }
  }

  isRequestThrottlingEnabled(): boolean {
    return this.isThrottlingEnabled;
  }

  isRenderingQualityReduced(): boolean {
    return this.isQualityReduced;
  }

  areNonEssentialFeaturesDisabled(): boolean {
    return this.nonEssentialFeaturesDisabled;
  }

  async resetDegradation(): Promise<void> {
    this.isThrottlingEnabled = false;
    this.isQualityReduced = false;
    this.nonEssentialFeaturesDisabled = false;
  }
}