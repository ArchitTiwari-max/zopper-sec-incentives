// Test the integrated send-otp API endpoint
async function testSendOTPEndpoint() {
  try {
    console.log('🧪 Testing /api/auth/send-otp endpoint...')
    
    const response = await fetch('http://localhost:3001/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: "8447298637"  // Without 91 prefix
      })
    })

    const result = await response.json()
    
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.ok) {
      console.log('✅ OTP endpoint working!')
    } else {
      console.log('❌ OTP endpoint error!')
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error)
  }
}

testSendOTPEndpoint()