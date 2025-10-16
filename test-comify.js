// Test script for Comify WhatsApp API
async function testComifyAPI() {
  try {
    console.log('🧪 Testing Comify API...')
    
    const response = await fetch('https://commify.transify.tech/v1/comm', {
      method: 'POST',
      headers: {
        'Authorization': 'ApiKey 4hp75ThOEyWdJAWQ4cNmD4GpSBHrBh',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "zopper_oem_sec_verify",
        payload: {
          phone: "7408108617",
          otp: 123787
        },
        type: "whatsappTemplate"
      })
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log('Response:', result)
    } else {
      console.log('❌ Error!')
      console.log('Status:', response.status)
      console.log('Response:', result)
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error)
  }
}

testComifyAPI()