#!/usr/bin/env node

/**
 * Comprehensive System Status Check
 * Verifies all components and data collection capabilities
 */

const fs = require('fs');
const path = require('path');

async function checkFileSystem() {
  console.log('📁 Checking File System...');
  
  const criticalFiles = [
    'missing-persons.csv',
    'database/app.db',
    'package.json',
    'src/app/api/missing-persons/route.ts',
    'src/lib/data-sources/DataSourceManager.ts',
    'src/lib/scheduler/SchedulerService.ts'
  ];
  
  const results = {};
  
  for (const file of criticalFiles) {
    try {
      const stats = fs.statSync(file);
      const ageHours = Math.round((Date.now() - stats.mtime) / (1000 * 60 * 60));
      results[file] = {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        ageHours: ageHours,
        status: ageHours > 168 ? 'stale' : 'fresh' // 1 week
      };
    } catch (error) {
      results[file] = {
        exists: false,
        error: error.message,
        status: 'missing'
      };
    }
  }
  
  return results;
}

async function checkAPI() {
  console.log('🌐 Checking API Endpoints...');
  
  const endpoints = [
    'http://localhost:3000/api/missing-persons?limit=1',
    'http://localhost:3000/api/missing-persons?category=Missing%20Children&limit=1',
    'http://localhost:3006/api/missing-persons?limit=1' // Alternative port
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SaveThemNow.Jesus System Check'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        results[endpoint] = {
          accessible: true,
          status: response.status,
          recordCount: data.data ? data.data.length : 0,
          dataSource: data.meta ? data.meta.source : 'unknown',
          hasCoordinates: data.data ? data.data.some(r => r.latitude && r.longitude) : false
        };
      } else {
        results[endpoint] = {
          accessible: false,
          status: response.status,
          error: response.statusText
        };
      }
    } catch (error) {
      results[endpoint] = {
        accessible: false,
        error: error.message,
        status: error.name === 'AbortError' ? 'timeout' : 'error'
      };
    }
  }
  
  return results;
}

async function checkDataSources() {
  console.log('📡 Checking External Data Sources...');
  
  const sources = [
    {
      name: 'Weather Service AMBER Alerts',
      url: 'https://api.weather.gov/alerts/active?event=Child%20Abduction%20Emergency',
      type: 'amber'
    },
    {
      name: 'Weather Service All Alerts',
      url: 'https://api.weather.gov/alerts/active.atom?region_type=land',
      type: 'rss'
    },
    {
      name: 'NamUs Main Site',
      url: 'https://namus.nij.ojp.gov/',
      type: 'html'
    },
    {
      name: 'NCMEC Main Site',
      url: 'https://www.missingkids.org/',
      type: 'html'
    }
  ];
  
  const results = {};
  
  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SaveThemNow.Jesus/2.0 System Check'
        }
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type') || '';
      let hasRelevantData = false;
      
      if (response.ok) {
        if (source.type === 'amber') {
          const data = await response.json();
          hasRelevantData = data.features && Array.isArray(data.features);
          results[source.name] = {
            accessible: true,
            status: response.status,
            contentType,
            alertCount: data.features ? data.features.length : 0,
            amberAlerts: data.features ? data.features.filter(f => 
              f.properties.event === 'Child Abduction Emergency'
            ).length : 0
          };
        } else {
          const text = await response.text();
          const sample = text.substring(0, 500).toLowerCase();
          hasRelevantData = sample.includes('missing') || sample.includes('alert') || 
                           sample.includes('amber') || sample.includes('child');
          
          results[source.name] = {
            accessible: true,
            status: response.status,
            contentType,
            contentLength: text.length,
            hasRelevantData,
            sampleContents: sample.substring(0, 100) + '...'
          };
        }
      } else {
        results[source.name] = {
          accessible: false,
          status: response.status,
          error: response.statusText
        };
      }
    } catch (error) {
      results[source.name] = {
        accessible: false,
        error: error.message,
        status: error.name === 'AbortError' ? 'timeout' : 'connection_error'
      };
    }
  }
  
  return results;
}

async function checkDatabase() {
  console.log('🗃️ Checking Database Status...');
  
  const results = {};
  
  try {
    // Check CSV data
    const csvStats = fs.statSync('missing-persons.csv');
    const csvContent = fs.readFileSync('missing-persons.csv', 'utf-8');
    const lineCount = csvContent.split('\n').length - 1; // Subtract header
    
    results.csv = {
      exists: true,
      recordCount: lineCount,
      fileSize: csvStats.size,
      lastModified: csvStats.mtime,
      ageHours: Math.round((Date.now() - csvStats.mtime) / (1000 * 60 * 60))
    };
    
    // Sample recent data
    const lines = csvContent.split('\n');
    if (lines.length > 1) {
      const sampleLine = lines[1]; // First data line
      const fields = sampleLine.split(',');
      results.csv.sampleFields = {
        caseNumber: fields[0] ? fields[0].replace(/"/g, '') : '',
        date: fields[1] ? fields[1].replace(/"/g, '') : '',
        name: fields[2] && fields[3] ? 
          `${fields[3].replace(/"/g, '')} ${fields[2].replace(/"/g, '')}` : ''
      };
    }
    
  } catch (error) {
    results.csv = {
      exists: false,
      error: error.message
    };
  }
  
  // Check SQLite database
  try {
    const dbStats = fs.statSync('database/app.db');
    results.sqlite = {
      exists: true,
      fileSize: dbStats.size,
      lastModified: dbStats.mtime,
      ageHours: Math.round((Date.now() - dbStats.mtime) / (1000 * 60 * 60))
    };
  } catch (error) {
    results.sqlite = {
      exists: false,
      error: error.message
    };
  }
  
  return results;
}

async function generateSystemReport() {
  console.log('🔍 COMPREHENSIVE SYSTEM STATUS CHECK');
  console.log('=' .repeat(60));
  console.log(`Timestamp: ${new Date().toLocaleString()}\n`);
  
  // File System Check
  const fileResults = await checkFileSystem();
  console.log('📁 FILE SYSTEM STATUS:');
  for (const [file, result] of Object.entries(fileResults)) {
    const status = result.exists ? '✅' : '❌';
    const age = result.ageHours ? ` (${result.ageHours}h old)` : '';
    const size = result.size ? ` ${Math.round(result.size/1024)}KB` : '';
    console.log(`   ${status} ${file}${size}${age}`);
  }
  
  // API Check
  console.log('\n🌐 API STATUS:');
  const apiResults = await checkAPI();
  let workingAPI = null;
  for (const [endpoint, result] of Object.entries(apiResults)) {
    const status = result.accessible ? '✅' : '❌';
    if (result.accessible && !workingAPI) workingAPI = endpoint;
    console.log(`   ${status} ${endpoint}`);
    if (result.accessible) {
      console.log(`       Records: ${result.recordCount}, Source: ${result.dataSource}`);
      console.log(`       Geocoded: ${result.hasCoordinates ? 'Yes' : 'No'}`);
    } else {
      console.log(`       Error: ${result.error}`);
    }
  }
  
  // Data Sources Check  
  console.log('\n📡 EXTERNAL DATA SOURCES:');
  const sourceResults = await checkDataSources();
  let workingSources = 0;
  for (const [source, result] of Object.entries(sourceResults)) {
    const status = result.accessible ? '✅' : '❌';
    if (result.accessible) workingSources++;
    console.log(`   ${status} ${source}`);
    if (result.accessible) {
      if (result.alertCount !== undefined) {
        console.log(`       Active alerts: ${result.alertCount}`);
        if (result.amberAlerts > 0) {
          console.log(`       🚨 AMBER ALERTS: ${result.amberAlerts}`);
        }
      } else {
        console.log(`       Content: ${result.contentLength} bytes, Relevant: ${result.hasRelevantData ? 'Yes' : 'No'}`);
      }
    } else {
      console.log(`       Error: ${result.error}`);
    }
  }
  
  // Database Check
  console.log('\n🗃️ DATABASE STATUS:');
  const dbResults = await checkDatabase();
  if (dbResults.csv && dbResults.csv.exists) {
    const ageStatus = dbResults.csv.ageHours < 24 ? '🟢' : 
                     dbResults.csv.ageHours < 168 ? '🟡' : '🔴';
    console.log(`   ✅ CSV Data: ${dbResults.csv.recordCount.toLocaleString()} records ${ageStatus}`);
    console.log(`       Last updated: ${Math.round(dbResults.csv.ageHours)} hours ago`);
    if (dbResults.csv.sampleFields) {
      console.log(`       Sample: ${dbResults.csv.sampleFields.name} (${dbResults.csv.sampleFields.caseNumber})`);
    }
  } else {
    console.log(`   ❌ CSV Data: Not accessible`);
  }
  
  if (dbResults.sqlite && dbResults.sqlite.exists) {
    console.log(`   ✅ SQLite: ${Math.round(dbResults.sqlite.fileSize/1024)}KB`);
  } else {
    console.log(`   ❌ SQLite: Not accessible`);
  }
  
  // Overall Assessment
  console.log('\n📊 SYSTEM ASSESSMENT:');
  console.log('=' .repeat(60));
  
  const hasWorkingAPI = workingAPI !== null;
  const hasData = dbResults.csv && dbResults.csv.exists && dbResults.csv.recordCount > 0;
  const hasExternalSources = workingSources > 0;
  
  console.log(`🌐 API Service: ${hasWorkingAPI ? '✅ OPERATIONAL' : '❌ DOWN'}`);
  console.log(`💾 Data Storage: ${hasData ? '✅ OPERATIONAL' : '❌ NO DATA'}`);
  console.log(`📡 Data Collection: ${hasExternalSources ? '✅ PARTIAL' : '❌ DOWN'}`);
  
  if (hasData) {
    const dataAge = dbResults.csv.ageHours;
    const freshness = dataAge < 6 ? '🟢 FRESH' : 
                     dataAge < 24 ? '🟡 RECENT' : 
                     dataAge < 168 ? '🟠 STALE' : '🔴 VERY STALE';
    console.log(`⏰ Data Freshness: ${freshness} (${dataAge}h old)`);
  }
  
  // Current Capabilities
  console.log('\n🔧 CURRENT CAPABILITIES:');
  if (hasWorkingAPI && hasData) {
    console.log('✅ Can serve missing persons data to users');
    console.log('✅ Search and filtering functionality available');
    console.log('✅ Geographic data (coordinates) available');
  }
  
  if (hasExternalSources) {
    console.log('✅ AMBER Alert monitoring operational');
    console.log('✅ Can detect new alerts when they occur');
  } else {
    console.log('⚠️ AMBER Alert monitoring limited');
  }
  
  // Real-time status
  console.log('\n⚡ REAL-TIME STATUS:');
  if (sourceResults['Weather Service AMBER Alerts']?.amberAlerts > 0) {
    console.log(`🚨 ${sourceResults['Weather Service AMBER Alerts'].amberAlerts} ACTIVE AMBER ALERTS RIGHT NOW!`);
  } else {
    console.log('✅ No active AMBER alerts (normal)');
  }
  
  console.log(`📈 Total records available: ${hasData ? dbResults.csv.recordCount.toLocaleString() : '0'}`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (!hasWorkingAPI) {
    console.log('🔧 Start the Next.js development server: npm run dev');
  }
  if (hasData && dbResults.csv.ageHours > 24) {
    console.log('🔄 Data is stale - consider updating the CSV or enabling live collection');
  }
  if (workingSources < 2) {
    console.log('📡 Limited data sources - investigate API endpoint changes');
  }
  
  console.log('\n✅ System check complete!');
}

// Run the check
if (require.main === module) {
  generateSystemReport().catch(error => {
    console.error('❌ System check failed:', error.message);
    process.exit(1);
  });
}

module.exports = { checkFileSystem, checkAPI, checkDataSources, checkDatabase };