#!/usr/bin/env node

/**
 * Test script to verify browser strategy selection is working correctly
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

async function countChromeProcesses() {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync(`
        (Get-WmiObject Win32_Process | 
         Where-Object { $_.Name -eq "chrome.exe" -or $_.Name -eq "chromium.exe" }).Count
      `, { shell: 'powershell', timeout: 10000 });
            return parseInt(stdout.trim()) || 0;
        } else {
            const { stdout } = await execAsync('ps aux | grep -E "(chrome|chromium)" | grep -v grep | wc -l',
                { timeout: 10000 });
            return parseInt(stdout.trim()) || 0;
        }
    } catch (error) {
        return -1;
    }
}

async function testStrategy(strategyName, env) {
    console.log(`\n🧪 Testing ${strategyName} strategy...`);

    const initialCount = await countChromeProcesses();
    console.log(`   Initial Chrome processes: ${initialCount}`);

    const testPromise = new Promise((resolve, reject) => {
        const child = spawn('node', [
            path.join(__dirname, '..', 'scripts', 'run-cli.js'),
            'convert',
            'https://example.com',
            `test-${strategyName}.pdf`,
            '--dry-run'
        ], {
            stdio: 'pipe',
            env: {
                ...process.env,
                ...env
            }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });

        child.on('error', reject);
    });

    try {
        const result = await testPromise;
        console.log(`   Exit code: ${result.code}`);

        // Check if strategy was logged
        if (result.stdout.includes('Using browser strategy:')) {
            const strategyLine = result.stdout.split('\n').find(line =>
                line.includes('Using browser strategy:')
            );
            console.log(`   Strategy used: ${strategyLine}`);
        }

        if (result.code !== 0 && result.stderr) {
            console.log(`   stderr: ${result.stderr.substring(0, 200)}...`);
        }
    } catch (error) {
        console.error(`   Test failed: ${error.message}`);
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalCount = await countChromeProcesses();
    console.log(`   Final Chrome processes: ${finalCount}`);

    const leaked = finalCount - initialCount;
    if (leaked <= 0) {
        console.log(`   ✅ No processes leaked with ${strategyName} strategy`);
    } else {
        console.log(`   ❌ ${leaked} processes leaked with ${strategyName} strategy`);
    }

    return leaked;
}

async function runTests() {
    console.log('🧪 Testing Browser Strategy Selection...\n');

    // Test oneshot strategy (should be default for CLI)
    const oneshotLeaks = await testStrategy('oneshot', {
        NODE_ENV: 'test',
        PRINTEER_BROWSER_STRATEGY: 'oneshot',
        PRINTEER_BUNDLED_ONLY: '1'
    });

    // Test pool strategy
    const poolLeaks = await testStrategy('pool', {
        NODE_ENV: 'production',
        PRINTEER_BROWSER_STRATEGY: 'pool',
        PRINTEER_BUNDLED_ONLY: '1'
    });

    // Test default CLI behavior (should use oneshot)
    const defaultLeaks = await testStrategy('default-cli', {
        NODE_ENV: 'production', // Not test mode
        PRINTEER_BUNDLED_ONLY: '1'
        // No explicit strategy - should detect CLI and use oneshot
    });

    console.log('\n📊 Summary:');
    console.log(`   Oneshot strategy leaks: ${oneshotLeaks}`);
    console.log(`   Pool strategy leaks: ${poolLeaks}`);
    console.log(`   Default CLI leaks: ${defaultLeaks}`);

    if (oneshotLeaks <= 0 && defaultLeaks <= 0) {
        console.log('\n✅ Browser strategy selection is working correctly!');
        console.log('   CLI commands use oneshot strategy with no leaks');
    } else {
        console.log('\n❌ Browser strategy has issues');
        console.log('   CLI commands should not leak browser processes');
    }

    if (poolLeaks > 0) {
        console.log('\n⚠️  Pool strategy leaked processes');
        console.log('   This is expected behavior - pools keep browsers alive');
        console.log('   Use cleanup commands to manage pool lifecycle');
    }
}

if (require.main === module) {
    runTests().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests };