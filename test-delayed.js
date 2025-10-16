// Test after delay to ensure server is fully started
async function delayedTest() {
  console.log('⏳ Waiting 3 seconds for server to fully start...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('🧪 Testing submit endpoint...')
  
  try {
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
    console.log('URL:', response.url)
    
    const text = await response.text()
    console.log('Response:', text.substring(0, 300))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

delayedTest()