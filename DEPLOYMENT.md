# 🚀 Deployment Guide - Zopper SEC Incentives

## Option 1: Vercel (Recommended - Free & Easy)

### 1. Prepare for Deployment
```bash
# Build the project
npm run build

# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Import Project"
4. Select your `zopper-sec-incentives` repository
5. Configure environment variables:
   - `DATABASE_URL`: Your MongoDB connection string
   - `JWT_SECRET`: Any secure random string
   - `COMIFY_API_KEY`: 4hp75ThOEyWdJAWQ4cNmD4GpSBHrBh
   - `COMIFY_BASE_URL`: https://commify.transify.tech/v1
   - `COMIFY_TEMPLATE_NAME`: zopper_oem_sec_verify

6. Click Deploy!

### 3. Update Frontend API URLs
After deployment, update API calls in your React components to use the deployed URL instead of localhost:3001

---

## Option 2: Railway (Good Alternative)

### 1. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables (same as above)
6. Deploy!

---

## Option 3: Render (Another Good Option)

### 1. Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create new "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - Add environment variables
6. Deploy!

---

## Option 4: DigitalOcean App Platform

### 1. Deploy to DigitalOcean
1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Create new App
3. Connect GitHub repository
4. Configure build settings
5. Add environment variables
6. Deploy!

---

## 🔧 Post-Deployment Tasks

### 1. Update Frontend API URLs
In your React components, change:
```javascript
// From:
fetch('http://localhost:3001/api/...')

// To:
fetch('/api/...')  // For Vercel
// OR
fetch('https://your-app-name.vercel.app/api/...')
```

### 2. Database Setup
Run these commands after deployment:
```bash
# Push database schema
npm run db:push

# Seed initial data
npm run db:seed
```

### 3. Test Deployment
- Test login functionality
- Test OTP sending via WhatsApp
- Test report submission
- Test admin dashboard

---

## 🌐 Domain Setup (Optional)

### Custom Domain
1. In your deployment platform, go to "Domains"
2. Add your custom domain
3. Update DNS settings as instructed
4. Enable HTTPS (usually automatic)

---

## 📱 Production Environment Variables

Make sure these are set in production:

```env
DATABASE_URL=mongodb+srv://...
JWT_SECRET=your-super-secure-secret-key
COMIFY_API_KEY=4hp75ThOEyWdJAWQ4cNmD4GpSBHrBh
COMIFY_BASE_URL=https://commify.transify.tech/v1
COMIFY_TEMPLATE_NAME=zopper_oem_sec_verify
NODE_ENV=production
```

---

## 🔍 Monitoring & Maintenance

### Health Checks
Your app includes a health check endpoint:
- `GET /api/health` - Check if API is running

### Logs
Monitor application logs in your deployment platform for:
- Authentication issues
- Database connection problems
- WhatsApp OTP delivery status

### Performance
Monitor:
- Response times
- Error rates
- Database query performance
- Memory/CPU usage

---

## 🚨 Troubleshooting

### Common Issues:
1. **Build Fails**: Check Node.js version compatibility
2. **Database Connection**: Verify MongoDB connection string
3. **Environment Variables**: Ensure all required vars are set
4. **CORS Issues**: Update CORS settings for production domain
5. **WhatsApp OTP**: Check Comify API key and template name

### Quick Fixes:
```bash
# Rebuild and redeploy
npm run build
git push origin main

# Reset database
npm run db:reset
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] Build script works locally
- [ ] Database schema pushed
- [ ] Initial admin user seeded
- [ ] WhatsApp OTP tested
- [ ] All API endpoints tested
- [ ] Frontend connects to backend
- [ ] Custom domain configured (if needed)
- [ ] HTTPS enabled
- [ ] Monitoring set up

🎉 **Your Zopper SEC Incentives app is now live!**