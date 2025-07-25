// Backward compatible export
import printeer from "./printeer";

// Enhanced exports
export * from './types';
export * from './interfaces';
export * from './core';

// Enhanced library interface (will be implemented in task 8)
export { PrinteerService } from './interfaces/service';

// Backward compatible default export
export default printeer;

// Enhanced conversion function (will be implemented in task 8)
export async function convert(_options: any): Promise<any> {
  throw new Error('Enhanced convert function not implemented yet - will be implemented in task 8');
}

// Doctor functionality
export async function doctor(): Promise<any[]> {
  const { DefaultDoctorModule } = await import('./core/doctor');
  const doctorModule = new DefaultDoctorModule();
  return await doctorModule.runFullDiagnostics();
}
