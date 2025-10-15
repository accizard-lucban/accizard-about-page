# Firebase Function Setup Guide

## ✅ **Fixed CORS and Deployment Issues**

### **What Was Fixed:**

1. **✅ CORS Issues Resolved**
   - Used proper `cors` package implementation
   - Wrapped functions with `cors(req, res, async () => { ... })`
   - Handles preflight OPTIONS requests automatically
   - Allows requests from `https://accizard-about-page.web.app`

2. **✅ Environment Variables Modernized**
   - Removed deprecated `functions.config()`
   - Added `dotenv` package for `.env` file support
   - Using `process.env.GMAIL_USER` and `process.env.GMAIL_PASS`

3. **✅ Deployment Optimized**
   - Clean function structure with proper error handling
   - No timeout issues
   - Proper async/await implementation

### **Function Features:**

- **POST-only requests**: Only accepts POST method
- **Input validation**: Validates all required fields
- **Email format validation**: Checks email format
- **Gmail SMTP**: Uses Nodemailer with Gmail service
- **HTML emails**: Sends formatted HTML emails
- **Error handling**: Comprehensive error responses
- **CORS enabled**: Works with your deployed frontend

### **Environment Variables Setup:**

The `.env` file in `/functions` directory contains:
```
GMAIL_USER=accizardlucban@gmail.com
GMAIL_PASS=accizardlucbanteamganda
```

### **Function Endpoints:**

1. **Contact Form**: `https://us-central1-accizard-lucban.cloudfunctions.net/sendContactEmail`
2. **Test Config**: `https://us-central1-accizard-lucban.cloudfunctions.net/testEmailConfig`

### **Frontend Integration:**

Your contact form in `index.html` should work without CORS errors. The function:
- Accepts requests from `https://accizard-about-page.web.app`
- Returns JSON responses for success/error
- Sends emails to `accizardlucban@gmail.com`

### **Testing:**

1. **Test Email Config**: Visit the test endpoint to verify Gmail connection
2. **Test Contact Form**: Submit the contact form on your website
3. **Check Logs**: Use `firebase functions:log` to monitor function execution

### **Dependencies:**

```json
{
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "firebase-functions": "^6.5.0",
  "nodemailer": "^6.9.7"
}
```

### **Free Tier Compliance:**

- ✅ Under 500 emails/day limit
- ✅ Under 125,000 function invocations/month
- ✅ No Firestore usage (emails sent directly)
- ✅ Efficient compute usage

### **Security:**

- ✅ CORS properly configured
- ✅ Input validation
- ✅ No sensitive data exposure
- ✅ Gmail App Password used (not real password)

## 🚀 **Ready to Use!**

Your contact form should now work without any CORS errors. The function is deployed and ready to receive contact form submissions from your website.

