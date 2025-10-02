#!/usr/bin/env node

/**
 * Monitor Chrome processes during test execution
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function getChromeProcesses() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`
        Get-WmiObject Win32_Process | 
        Where-Object { $_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe" } | 
        Select-Object ProcessId, CommandLine, CreationDate | 
        ConvertTo-Json
      `, { shell: 'powershell', timeout: 15000 });
      
      const processes = JSON.parse(stdout || '[]');
      return Array.isArray(processes) ? processes : (processes ? [processes] : []);
    } else {
      const { stdout } = await execAsync(`
        ps aux | grep -E "(chrome|chromium)" | grep -v grep | 
        awk '{print $2 " " $11}' | head -20
      `, { timeout: 15000 });
      
      return stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [pid, ...cmdParts] = line.split(' ');
          return {
            ProcessId: parseInt(pid),
            CommandLine: cmdParts.join(' ')
          };
        });
    }
  } catch (error) {
    console.error('Failed to get Chrome processes:', error.message);
    return [];
  }
}

async function monitorProcesses() {
  console.log('🔍 Chrome Process Monitor Started');
  console.log('Press Ctrl+C to stop\n');

  let previousProcesses = [];

  const monitor = async () => {
    const currentProcesses = await getChromeProcesses();
    
    // Check for new processes
    const newProcesses = currentProcesses.filter(current => 
      !previousProcesses.some(prev => prev.ProcessId === current.ProcessId)
    );

    // Check for terminated processes
    const terminatedProcesses = previousProcesses.filter(prev => 
      !currentProcesses.some(current => current.ProcessId === prev.ProcessId)
    );

    if (newProcesses.length > 0) {
      console.log(`🆕 New Chrome processes (${newProcesses.length}):`);
      newProcesses.forEach(proc => {
        const cmdShort = proc.CommandLine ? proc.CommandLine.substring(0, 100) + '...' : 'N/A';
        console.log(`   PID ${proc.ProcessId}: ${cmdShort}`);
      });
    }

    if (terminatedProcesses.length > 0) {
      console.log(`❌ Terminated Chrome processes (${terminatedProcesses.length}):`);
      terminatedProcesses.forEach(proc => {
        console.log(`   PID ${proc.ProcessId}`);
      });
    }

    if (newProcesses.length === 0 && terminatedProcesses.length === 0 && currentProcesses.length > 0) {
      console.log(`📊 ${currentProcesses.length} Chrome processes running (no changes)`);
    }

    if (currentProcesses.length === 0 && previousProcesses.length > 0) {
      console.log('✅ All Chrome processes terminated');
    }

    previousProcesses = currentProcesses;
  };

  // Initial check
  await monitor();

  // Monitor every 2 seconds
  const interval = setInterval(monitor, 2000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    clearInterval(interval);
    process.exit(0);
  });
}

if (require.main === module) {
  monitorProcesses().catch(error => {
    console.error('Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = { monitorProcesses, getChromeProcesses };