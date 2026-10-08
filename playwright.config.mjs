import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./browser-tests',
  fullyParallel:false,
  workers:1,
  timeout:60000,
  expect:{timeout:10000},
  reporter:'list',
  use:{
    baseURL:'http://127.0.0.1:4199',
    browserName:'chromium',
    headless:true,
    viewport:{width:1440,height:1000},
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'node preview.mjs 4199',
    url:'http://127.0.0.1:4199/',
    reuseExistingServer:false,
    timeout:30000
  }
});
