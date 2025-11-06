// Test submit report endpoint specifically
async function testSubmitEndpoint() {
  try {
    console.log('🧪 Testing submit report endpoint...')
    
    // First, let's test the response as text to see what we're getting
    const response = await fetch('http://localhost:3001/api/reports/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storeId: "STORE001",
        samsungSKUId: "test",
        planId: "test",
        imei: "123456789012345"
      })
    })

    console.log('Status:', response.status)
    console.log('Content-Type:', response.headers.get('content-type'))
    
    // Get response as text first to see what we're actually getting
    const responseText = await response.text()
    console.log('Response body (first 200 chars):', responseText.substring(0, 200))
    
    // Try to parse as JSON if possible
    try {
      const data = JSON.parse(responseText)
      console.log('Parsed JSON:', data)
    } catch (parseError) {
      console.log('Not JSON response - probably HTML error page')
    }
    
  } catch (error) {
    console.error('❌ Network Error testing submit:', error.message)
  }
}

testSubmitEndpoint()