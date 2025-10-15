# Contact Us Feature Setup Instructions

## Overview
This implementation provides a complete working contact form with:
- Modern popup modal design
- Firebase Cloud Functions backend
- Gmail SMTP integration
- Form validation and success/error messages
- Responsive design

## Setup Steps

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Configure Environment Variables
The function now uses environment variables directly. You can set them in two ways:

**Option A: Set in Firebase Console (Recommended)**
1. Go to Firebase Console → Functions → Configuration
2. Add environment variables:
   - `GMAIL_USER` = `accizardlucban@gmail.com`
   - `GMAIL_PASS` = `your-gmail-app-password` (your Gmail App Password)

**Option B: Create .env file locally**
Create a `functions/.env` file:
```
GMAIL_USER=accizardlucban@gmail.com
GMAIL_PASS=your-gmail-app-password
```

**Important Notes:**
- Use your Gmail App Password, not your regular Gmail password
- To generate an App Password:
  1. Go to Google Account settings
  2. Security → 2-Step Verification (must be enabled)
  3. App passwords → Generate password for "Mail"
  4. Use the generated 16-character password

### 3. Deploy Firebase Functions
```bash
firebase deploy --only functions
```

### 4. Test the Function
After deployment, test the contact form function:
```bash
curl -X POST https://sendcontactemail-4hksadkxba-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "subject": "Test Message",
    "message": "This is a test message from the contact form."
  }'
```

## Usage

### Frontend Integration
The contact form is already integrated into your website:

1. **Popup Trigger**: Click the "Contact Us" button in the About section
2. **Form Fields**: 
   - First Name (required)
   - Last Name (required)
   - Email (required, validated)
   - Subject (required)
   - Message (required)

3. **User Experience**:
   - Modern popup with blur background
   - Form validation
   - Loading states
   - Success/error messages
   - Mobile responsive

### Backend Processing
- Firebase Function receives form data
- Validates all fields
- Sends formatted email to `accizardlucban@gmail.com`
- Returns success/error response

## Email Format
Received emails will include:
- Sender's name and email
- Subject line with "[AcciZard Contact]" prefix
- Formatted message content
- Timestamp
- HTML formatting for better readability

## Security Features
- CORS enabled for cross-origin requests
- Input validation on both frontend and backend
- Email format validation
- Rate limiting through Firebase Functions
- No data storage (emails sent directly)

## Monitoring
Monitor function usage in Firebase Console:
- Function invocations
- Execution time
- Error rates
- Email delivery status

## Troubleshooting

### Common Issues:

1. **"Email configuration failed"**
   - Check if App Password is correct
   - Verify 2-Step Verification is enabled
   - Ensure environment variables are set

2. **"Failed to send message"**
   - Check Firebase Function logs
   - Verify Gmail SMTP settings
   - Test with testEmailConfig function

3. **CORS errors**
   - Function includes CORS headers
   - Check if function URL is correct

### Debug Commands:
```bash
# View function logs
firebase functions:log --only sendContactEmail

# Test contact form function
curl -X POST https://sendcontactemail-4hksadkxba-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","subject":"Test","message":"Test message"}'

# Check function config
firebase functions:config:get
```

## Free Tier Limits
- 500 emails/day
- 125,000 function invocations/month
- 40,000 GB-seconds compute time/month

Your usage should easily stay within these limits for a contact form.

## File Structure
```
functions/
├── index.js          # Main function code
├── package.json      # Dependencies
└── node_modules/     # Installed packages

index.html            # Frontend popup and form
styles.css           # Popup styling
```

## Support
If you encounter issues:
1. Check Firebase Console for function logs
2. Verify Gmail App Password setup
3. Test email configuration function
4. Check browser console for frontend errors
