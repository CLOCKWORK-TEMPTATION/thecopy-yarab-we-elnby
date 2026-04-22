#!/usr/bin/env node

import http from 'node:http';

const PORT = process.env.PORT || 3001;
const WAIT_SECONDS = parseInt(process.env.BACKEND_HEALTH_WAIT_SECONDS || '120', 10);
const startTime = Date.now();

function checkHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: '/health/live',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
      if (isHealthy) {
        resolve(true);
      } else {
        reject(new Error(`Health check returned ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
}

async function waitForHealth() {
  while (Date.now() - startTime < WAIT_SECONDS * 1000) {
    try {
      await checkHealth();
      console.log('Health check passed.');
      process.exit(0);
    } catch (e) {
      console.log(`Health check pending: ${e.message}. Retrying in 2 seconds...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.error(`Health check failed after waiting ${WAIT_SECONDS} seconds.`);
  process.exit(1);
}

waitForHealth();
