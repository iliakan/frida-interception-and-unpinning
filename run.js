#!/usr/bin/env node

// Attach Frida to many processes

// Usage:
// node runjs windsurf

const { spawn, execSync } = require('child_process');

const script = process.argv.at(-1);

function filterPs(line) {
  // console.log("Look for " + script + " in " + line);
  if (line.toLowerCase().includes(script.toLowerCase())) {
    return true;
  }
  return false;
}


// Function to get Windsurf PIDs
function getPIDs() {
  try {
    // Get the output from frida-ps and filter for Windsurf processes
    const output = execSync('frida-ps', { encoding: 'utf8' });
    
    // Extract PIDs from the output
    const pids = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (!filterPs(line)) continue;
      if (line.trim()) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1) {
          const pid = parseInt(parts[0], 10);
          if (!isNaN(pid)) {
            pids.push(pid);
          }
        }
      }
    }
    
    
    if (pids.length === 0) {
      console.log('No processes found');
    } else {
      console.log(`Found ${pids.length} process(es): ${pids.join(', ')}`);
    }
    
    return pids;
  } catch (error) {
    console.error(`Error getting PIDs: ${error.message}`);
    return [];
  }
}

// Function to attach Frida to a process
function attachFridaToProcess(pid) {
  console.log(`Attaching to PID: ${pid}`);
  const fridaProcess = spawn('frida', ['-p', pid.toString(), '-l', 'config.js', '-l', 'native-connect-hook.js'], {
    stdio: ['ignore', 'inherit', 'inherit'] // Ignore stdin, inherit stdout and stderr
  });
  
  fridaProcess.on('close', (code) => {
    console.log(`Frida process for PID ${pid} exited with code ${code}`);
  });
  
  return fridaProcess;
}

// Main function
function main() {
  const pids = getPIDs();
  
  if (pids.length === 0) {
    console.log('No Windsurf processes to attach to. Exiting...');
    process.exit(0);
  }
  
  // Attach Frida to all PIDs
  const fridaProcesses = pids.map(pid => attachFridaToProcess(pid));
  
  // Setup direct stdin handling to listen for 'Q' key
  console.log('Press Q to quit all Frida processes');
  
  // Set raw mode to capture keystrokes
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    // Check if 'q' or 'Q' is pressed
    if (key.toString().toLowerCase() === 'q') {
      console.log('Quitting all Frida processes...');
      
      // Kill all Frida processes
      for (const proc of fridaProcesses) {
        proc.kill('SIGKILL');
      }
      
      // Exit the application
      process.exit(0);
    }
  });
  
    
}

// Start the application
main();
