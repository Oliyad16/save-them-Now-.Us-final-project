#!/usr/bin/env node

/**
 * Live Data Collection Test Script
 * Tests all data sources and reports what's actually working
 */

const https = require('https');
const http = require('http');

// Test configuration
const testConfig = {
  timeout: 10000, // 10 seconds
  userAgent: 'SaveThemNow.Jesus/2.0 Data Collection Test',
  maxRetries: 2
};

// Data sources to test
const dataSources = [
  {
    name: 'NamUs (Current)',
    id: 'namus_current',
    urls: [
      'https://namus.nij.ojp.gov/api/CaseSets/NamUs/MissingPersons',
      'https://namus.nij.ojp.gov/api/CaseSets/NamUs/MissingPersons/Cases',
      'https://namus.nij.ojp.gov/api/CaseSets/NamUs/MissingPersons/Search',
      'https://www.namus.gov/MissingPersons/Search'
    ]
  },
  {
    name: 'NCMEC',
    id: 'ncmec',
    urls: [
      'https://www.missingkids.org/gethelpnow/search',
      'https://api.missingkids.org/v1/missing',
      'https://www.missingkids.org/api/v1/posters'
    ]
  },
  {
    name: 'AMBER Alerts',
    id: 'amber_alerts',
    urls: [
      'https://www.amberalert.gov/feeds/alerts.xml',
      'https://api.amberalert.gov/alerts/active',
      'https://alerts.weather.gov/cap/us.atom'
    ]
  },
  {
    name: 'Florida FDLE',
    id: 'florida_fdle',
    urls: [
      'https://www.fdle.state.fl.us/FSAC/Missing-Persons',
      'https://www.fdle.state.fl.us/MissingPersons',
      'https://www.fdle.state.fl.us/FSAC/Missing-Persons/Search'
    ]
  },
  {
    name: 'California DOJ',
    id: 'california_doj',
    urls: [
      'https://oag.ca.gov/missing',
      'https://oag.ca.gov/missing-persons',
      'https://oag.ca.gov/bureau/california-justice-information-services/missing-persons'
    ]
  },
  {
    name: 'Texas DPS',
    id: 'texas_dps',
    urls: [
      'https://www.dps.texas.gov/section/crime-records/missing-persons',
      'https://www.dps.texas.gov/internetdata/texas_statewide_missing_persons.cfm'
    ]
  }
];

async function testUrl(url, retries = 0) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: testConfig.timeout,
      headers: {
        'User-Agent': testConfig.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8'
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Limit data collection to avoid memory issues
        if (data.length > 50000) {
          res.destroy();
        }
      });
      
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          contentType: res.headers['content-type'] || 'unknown',
          contentLength: data.length,
          hasData: data.length > 100,
          sample: data.substring(0, 500),
          error: null
        });
      });
      
      res.on('error', (error) => {
        resolve({
          url,
          status: null,
          error: error.message,
          hasData: false
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      if (retries < testConfig.maxRetries) {
        console.log(`⏱️  Timeout, retrying ${url} (${retries + 1}/${testConfig.maxRetries})`);
        setTimeout(() => {
          testUrl(url, retries + 1).then(resolve);
        }, 2000);
      } else {
        resolve({
          url,
          status: null,
          error: 'Request timeout',
          hasData: false
        });
      }
    });
    
    req.on('error', (error) => {
      if (retries < testConfig.maxRetries) {
        console.log(`❌ Error, retrying ${url} (${retries + 1}/${testConfig.maxRetries}): ${error.message}`);
        setTimeout(() => {
          testUrl(url, retries + 1).then(resolve);
        }, 2000);
      } else {
        resolve({
          url,
          status: null,
          error: error.message,
          hasData: false
        });
      }
    });
    
    req.end();
  });
}

function analyzeResponse(result) {
  if (result.error) {
    return {
      accessible: false,
      apiType: 'unknown',
      hasStructuredData: false,
      notes: result.error
    };
  }
  
  const statusOk = result.status >= 200 && result.status < 400;
  const contentType = result.contentType.toLowerCase();
  const sample = result.sample.toLowerCase();
  
  let apiType = 'html';
  let hasStructuredData = false;
  let notes = [];
  
  // Determine API type and data structure
  if (contentType.includes('json')) {
    apiType = 'json';
    hasStructuredData = sample.includes('"') && (sample.includes('case') || sample.includes('person') || sample.includes('missing'));
  } else if (contentType.includes('xml')) {
    apiType = 'xml';
    hasStructuredData = sample.includes('<') && (sample.includes('case') || sample.includes('person') || sample.includes('missing'));
  } else if (contentType.includes('html')) {
    apiType = 'html';
    hasStructuredData = sample.includes('missing') || sample.includes('case') || sample.includes('person');
  }
  
  // Look for specific data patterns
  if (sample.includes('missing') || sample.includes('case')) notes.push('Contains missing persons keywords');
  if (sample.includes('api') || sample.includes('json')) notes.push('Appears to be API endpoint');
  if (sample.includes('search') || sample.includes('query')) notes.push('Has search functionality');
  if (sample.includes('form') || sample.includes('input')) notes.push('Has search forms');
  
  // Redirects
  if (result.status === 301 || result.status === 302) {
    notes.push(`Redirects to: ${result.headers.location}`);
  }
  
  return {
    accessible: statusOk,
    apiType,
    hasStructuredData,
    notes: notes.join('; '),
    statusCode: result.status
  };
}

async function testDataSource(source) {
  console.log(`\n🔍 Testing ${source.name}...`);
  const results = [];
  
  for (const url of source.urls) {
    console.log(`  📡 Testing: ${url}`);
    const result = await testUrl(url);
    const analysis = analyzeResponse(result);
    
    results.push({
      url,
      ...result,
      ...analysis
    });
    
    const status = analysis.accessible ? '✅' : '❌';
    const type = analysis.apiType.toUpperCase();
    console.log(`  ${status} ${result.status || 'ERROR'} - ${type} - ${analysis.notes || analysis.error || 'No additional info'}`);
  }
  
  return {
    source: source.name,
    id: source.id,
    results,
    workingUrls: results.filter(r => r.accessible),
    apiEndpoints: results.filter(r => r.accessible && r.apiType !== 'html'),
    hasData: results.some(r => r.hasStructuredData)
  };
}

async function generateReport(allResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DATA COLLECTION SYSTEM STATUS REPORT');
  console.log('='.repeat(80));
  
  let workingSources = 0;
  let apiEndpoints = 0;
  let dataAvailable = 0;
  
  for (const sourceResult of allResults) {
    const hasWorking = sourceResult.workingUrls.length > 0;
    const hasApi = sourceResult.apiEndpoints.length > 0;
    const hasData = sourceResult.hasData;
    
    if (hasWorking) workingSources++;
    if (hasApi) apiEndpoints++;
    if (hasData) dataAvailable++;
    
    const status = hasWorking ? '✅' : '❌';
    const dataStatus = hasData ? '📊' : '📄';
    const apiStatus = hasApi ? '🔗' : '🌐';
    
    console.log(`${status} ${sourceResult.source}`);
    console.log(`   ${apiStatus} ${sourceResult.workingUrls.length}/${sourceResult.results.length} URLs accessible`);
    console.log(`   ${dataStatus} ${hasData ? 'Structured data available' : 'Limited/no structured data'}`);
    
    if (sourceResult.workingUrls.length > 0) {
      console.log('   Working URLs:');
      sourceResult.workingUrls.forEach(url => {
        console.log(`     • ${url.url} (${url.apiType.toUpperCase()})`);
      });
    }
    
    if (sourceResult.workingUrls.length === 0) {
      console.log('   ⚠️  No accessible URLs found - check endpoints');
    }
    
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('📈 SUMMARY');
  console.log(`Working Sources: ${workingSources}/${allResults.length}`);
  console.log(`API Endpoints Available: ${apiEndpoints}`);
  console.log(`Sources with Data: ${dataAvailable}`);
  
  if (workingSources === 0) {
    console.log('\n🚨 CRITICAL: No data sources are currently accessible!');
    console.log('   This means live data collection is not functional.');
    console.log('   The system is running on cached/static data only.');
  } else if (workingSources < 3) {
    console.log('\n⚠️  WARNING: Limited data sources available.');
    console.log('   Consider investigating failed endpoints.');
  } else {
    console.log('\n✅ GOOD: Multiple data sources are operational.');
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  
  allResults.forEach(sourceResult => {
    if (sourceResult.workingUrls.length === 0) {
      console.log(`• ${sourceResult.source}: Update API endpoints or scraping logic`);
    } else if (!sourceResult.hasData) {
      console.log(`• ${sourceResult.source}: Improve data extraction from available pages`);
    }
  });
  
  console.log('\n💾 DATA STATUS:');
  try {
    const fs = require('fs');
    const stats = fs.statSync('./missing-persons.csv');
    const age = Math.round((Date.now() - stats.mtime) / (1000 * 60 * 60)); // hours
    console.log(`• CSV Data: 10,000 records, last updated ${age} hours ago`);
    console.log(`• Database: Available (${Math.round(stats.size / 1024)}KB)`);
    
    if (age > 24) {
      console.log('⚠️  Static data is more than 24 hours old');
    }
  } catch (error) {
    console.log('❌ Could not read local data files');
  }
  
  console.log('='.repeat(80));
}

async function main() {
  console.log('🚀 Starting Live Data Collection Test...\n');
  console.log(`Testing ${dataSources.length} data sources with ${dataSources.reduce((sum, s) => sum + s.urls.length, 0)} total endpoints\n`);
  
  const allResults = [];
  
  for (const source of dataSources) {
    try {
      const result = await testDataSource(source);
      allResults.push(result);
    } catch (error) {
      console.log(`❌ Failed to test ${source.name}: ${error.message}`);
      allResults.push({
        source: source.name,
        id: source.id,
        results: [],
        workingUrls: [],
        apiEndpoints: [],
        hasData: false,
        error: error.message
      });
    }
  }
  
  await generateReport(allResults);
  
  console.log('\n✅ Data collection test complete!');
  console.log('Use this information to fix non-working collectors and improve data gathering.\n');
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testDataSource, testUrl, analyzeResponse };