#!/usr/bin/env node

/**
 * Test AMBER Alert Collection
 */

const https = require('https');

async function testAmberAlerts() {
  console.log('🚨 Testing AMBER Alert Collection...\n');
  
  try {
    // Test Weather Service API
    console.log('📡 Testing Weather Service AMBER Alert API...');
    
    const response = await fetch('https://api.weather.gov/alerts/active?event=Child%20Abduction%20Emergency', {
      headers: {
        'User-Agent': 'SaveThemNow.Jesus/2.0 AMBER Alert Test'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Weather Service API accessible`);
    console.log(`📊 Response structure:`);
    console.log(`   - Type: ${data.type}`);
    console.log(`   - Features: ${data.features ? data.features.length : 0}`);
    
    let amberAlerts = 0;
    if (data.features) {
      for (const feature of data.features) {
        const alert = feature.properties;
        if (alert.event === 'Child Abduction Emergency') {
          amberAlerts++;
          console.log(`\n🚨 ACTIVE AMBER ALERT FOUND:`);
          console.log(`   ID: ${alert.id}`);
          console.log(`   Status: ${alert.status}`);
          console.log(`   Headline: ${alert.headline}`);
          console.log(`   Urgency: ${alert.urgency}`);
          console.log(`   Severity: ${alert.severity}`);
          console.log(`   Sent: ${alert.sent}`);
          console.log(`   Expires: ${alert.expires}`);
          console.log(`   Issuer: ${alert.senderName}`);
          console.log(`   Areas: ${alert.areaDesc}`);
          if (alert.description) {
            const desc = alert.description.substring(0, 200);
            console.log(`   Description: ${desc}${alert.description.length > 200 ? '...' : ''}`);
          }
        }
      }
    }
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   🚨 Active AMBER Alerts: ${amberAlerts}`);
    console.log(`   📡 Total Weather Alerts: ${data.features ? data.features.length : 0}`);
    
    if (amberAlerts === 0) {
      console.log(`\n✅ No active AMBER alerts (this is normal - most of the time there are none)`);
      console.log(`   The system is working correctly and will detect alerts when they occur.`);
    } else {
      console.log(`\n🚨 CRITICAL: ${amberAlerts} ACTIVE AMBER ALERTS DETECTED!`);
      console.log(`   These would be processed and broadcast immediately.`);
    }
    
    // Test RSS fallback
    console.log(`\n📡 Testing RSS Fallback...`);
    try {
      const rssResponse = await fetch('https://alerts.weather.gov/cap/us.atom', {
        headers: {
          'User-Agent': 'SaveThemNow.Jesus/2.0 AMBER Alert Test'
        }
      });
      
      if (rssResponse.ok) {
        const rssText = await rssResponse.text();
        const amberCount = (rssText.match(/Child Abduction Emergency/g) || []).length;
        console.log(`✅ RSS Feed accessible`);
        console.log(`   AMBER mentions in RSS: ${amberCount}`);
      } else {
        console.log(`⚠️ RSS Feed error: ${rssResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️ RSS Feed failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ AMBER Alert test failed: ${error.message}`);
  }
}

// Test all alert types available
async function testAllAlertTypes() {
  console.log('\n📊 Testing all available alert types...');
  
  try {
    const response = await fetch('https://api.weather.gov/alerts/active', {
      headers: {
        'User-Agent': 'SaveThemNow.Jesus/2.0 Alert Types Test'
      }
    });
    
    const data = await response.json();
    
    if (data.features) {
      const eventTypes = new Map();
      
      for (const feature of data.features) {
        const event = feature.properties.event;
        eventTypes.set(event, (eventTypes.get(event) || 0) + 1);
      }
      
      console.log(`\n🌡️ Current active alert types:`);
      const sortedTypes = Array.from(eventTypes.entries()).sort((a, b) => b[1] - a[1]);
      
      for (const [eventType, count] of sortedTypes) {
        const emoji = eventType.includes('Child Abduction') ? '🚨' : 
                     eventType.includes('Tornado') ? '🌪️' :
                     eventType.includes('Flood') ? '🌊' :
                     eventType.includes('Fire') ? '🔥' : '⚠️';
        console.log(`   ${emoji} ${eventType}: ${count}`);
      }
      
      const amberCount = eventTypes.get('Child Abduction Emergency') || 0;
      if (amberCount > 0) {
        console.log(`\n🚨 ${amberCount} AMBER ALERTS ARE CURRENTLY ACTIVE!`);
      }
    }
    
  } catch (error) {
    console.error(`Failed to get alert types: ${error.message}`);
  }
}

async function main() {
  await testAmberAlerts();
  await testAllAlertTypes();
  
  console.log('\n✅ AMBER Alert testing complete!');
  console.log('\nThis system will:');
  console.log('• Check for AMBER alerts every 5 minutes');
  console.log('• Immediately broadcast any found alerts');
  console.log('• Send critical notifications via all configured channels');
  console.log('• Store alerts in the database for tracking\n');
}

main().catch(console.error);