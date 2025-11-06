const COMMIFY_API_URL = 'https://commify.transify.tech/v1/comm';
const API_KEY = '4hp75ThOEyWdJAWQ4cNmD4GpSBHrBh';

/**
 * Send WhatsApp test link to a SEC
 * @param {string} phone - Phone number with country code (e.g., "919956644505")
 * @param {string} testLink - Full test URL
 * @param {string} secName - SEC name
 * @param {string} deadline - Deadline date (format: DD/MM/YYYY)
 */
async function sendTestLink(phone, testLink, secName, deadline) {
  try {
    const response = await fetch(COMMIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'zopper_oem_sec_test',
        payload: {
          '1': testLink,
          'phone': phone,
          'SEC_name': secName,
          'Deadline': deadline
        },
        type: 'whatsappTemplate'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✓ Message sent to ${secName} (${phone})`);
      return { success: true, data: result };
    } else {
      console.error(`✗ Failed to send to ${secName} (${phone}):`, result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error(`✗ Error sending to ${secName} (${phone}):`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send test links to multiple SECs
 * @param {Array} secs - Array of {phone, testLink, name, deadline}
 */
async function sendBulkTestLinks(secs) {
  console.log(`Sending test links to ${secs.length} SECs...\n`);
  
  const results = [];
  for (const sec of secs) {
    const result = await sendTestLink(
      sec.phone,
      sec.testLink,
      sec.name,
      sec.deadline
    );
    results.push({ ...sec, ...result });
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`\n${successful}/${secs.length} messages sent successfully`);
  
  return results;
}

// Example usage - run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('send-test-link.js');

if (isMainModule) {
  const phone = process.argv[2] || '918368017420';
  const testLink = process.argv[3] || `test?phone=${phone}`;
  const secName = process.argv[4] || 'Vishal';
  const deadline = process.argv[5] || '25/10/2025';
  
  sendTestLink(phone, testLink, secName, deadline);
}

export { sendTestLink, sendBulkTestLinks };
