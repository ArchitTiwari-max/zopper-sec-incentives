const express = require('express')
const app = express()

app.use(express.json())

// Test route
app.post('/api/reports/submit', (req, res) => {
  res.json({ message: 'Test route working!' })
})

app.listen(3002, () => {
  console.log('Test server running on port 3002')
})

// Test the route
setTimeout(async () => {
  try {
    const fetch = (await import('node-fetch')).default
    const response = await fetch('http://localhost:3002/api/reports/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    })
    const data = await response.json()
    console.log('Test result:', data)
    process.exit(0)
  } catch (error) {
    console.error('Test failed:', error.message)
    process.exit(1)
  }
}, 1000)