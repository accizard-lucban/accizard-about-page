# 🚀 ACCIZARD FIREBASE NEWS SYSTEM

Complete Firebase-native automated news system that fetches 50 articles per day using exactly 5 NewsData.io API calls.

## 📋 System Overview

**Automated Schedule:**
- ⏰ **Every 5 hours**: 00:00, 05:00, 10:00, 15:00, 20:00 UTC
- 📊 **10 articles per fetch** = 50 articles per day
- 💰 **1 API call per fetch** = 5 API calls per day
- 🎯 **Target sources**: DOST, PAGASA, NDRRMC (Philippines government)

**Architecture:**
- ✅ **Firebase Cloud Functions** - Scheduled news fetching
- ✅ **Firebase Cloud Storage** - News data storage (news.json)
- ✅ **Firebase Hosting** - Static website hosting
- ✅ **NewsData.io API** - News source (secured with Firebase secrets)

## 🔧 Setup Instructions

### Step 1: Configure Firebase Project

1. **Initialize Firebase in your project:**
```bash
firebase init
# Select: Functions, Hosting, Storage
# Choose existing project or create new one
```

2. **Set your NewsData.io API key as a Firebase secret:**
```bash
firebase functions:secrets:set NEWS_API_KEY
# When prompted, enter: pub_e50a94871c1640aaa68bf69837585a15
```

3. **Update the frontend URL in index.html:**
   - Replace `YOUR_PROJECT_ID` in line 634 with your actual Firebase project ID
   - Example: `https://us-central1-accizard-news.cloudfunctions.net/getNews`

### Step 2: Deploy the System

1. **Install function dependencies:**
```bash
cd functions
npm install
cd ..
```

2. **Deploy everything:**
```bash
firebase deploy
```

**Or deploy components separately:**
```bash
firebase deploy --only functions    # Deploy Cloud Functions
firebase deploy --only hosting     # Deploy website
firebase deploy --only storage     # Deploy storage rules
```

### Step 3: Verify Deployment

1. **Check Cloud Functions:**
```bash
firebase functions:log
```

2. **Test manual fetch (optional):**
```bash
curl "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/manualFetchNews?token=accizard-manual-fetch-2024"
```

3. **Test news API:**
```bash
curl "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getNews"
```

## 📊 API Endpoints

### 1. Scheduled News Fetcher
- **Function**: `fetchNews`
- **Trigger**: Every 5 hours (automatic)
- **Purpose**: Fetch 10 articles from NewsData.io
- **Storage**: Saves to `news.json` in Cloud Storage

### 2. Manual News Trigger
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/manualFetchNews`
- **Method**: GET
- **Auth**: `?token=accizard-manual-fetch-2024`
- **Purpose**: Manual news fetch for testing

### 3. News API Proxy
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getNews`
- **Method**: GET
- **Purpose**: Secure endpoint for frontend to fetch news
- **Cache**: 5 minutes

## 📁 File Structure

```
Landing Page/
├── functions/
│   ├── index.js              # Cloud Functions code
│   └── package.json          # Function dependencies
├── firebase.json             # Firebase configuration
├── storage.rules             # Cloud Storage security rules
├── index.html                # Main website with news display
├── styles.css                # Website styling
└── README-FIREBASE-NEWS.md   # This file
```

## 🔍 NewsData.io Query Details

**API Request URL:**
```
https://newsdata.io/api/1/news?apikey=${API_KEY}&country=ph&q=DOST OR PAGASA OR NDRRMC&pageSize=10&language=en
```

**Query Parameters:**
- `country=ph` - Philippines only
- `q=DOST OR PAGASA OR NDRRMC` - Government agencies
- `pageSize=10` - Exactly 10 articles per request
- `language=en` - English articles only

## 📄 News Data Structure

**Stored in Cloud Storage as `news.json`:**
```json
{
  "fetchedAt": "2024-10-12T20:00:00.000Z",
  "totalArticles": 8,
  "source": "NewsData.io",
  "query": "DOST OR PAGASA OR NDRRMC",
  "country": "Philippines",
  "articles": [
    {
      "title": "DOST Launches New Weather Monitoring System",
      "description": "Advanced technology to improve disaster preparedness...",
      "image": "https://example.com/image.jpg",
      "source": "DOST",
      "publishedAt": "2024-10-12T18:30:00.000Z",
      "url": "https://dost.gov.ph/news/article-123",
      "category": "Technology"
    }
  ]
}
```

## 🎨 Frontend Integration

**The website automatically:**
1. **Fetches news** from Firebase Cloud Function on page load
2. **Displays articles** in responsive cards with:
   - Article image (with fallback placeholder)
   - Title and description
   - Source badge (DOST/PAGASA/NDRRMC)
   - Published date
   - "Read More" link to original article
3. **Shows status messages** for loading/success/error states
4. **Updates automatically** as new articles are fetched

## 🔒 Security Features

**API Key Protection:**
- ✅ NewsData.io API key stored as Firebase secret
- ✅ Never exposed to frontend or client-side code
- ✅ Only accessible to Cloud Functions

**Storage Security:**
- ✅ Public read access to `news.json` only
- ✅ Write access restricted to Cloud Functions
- ✅ All other files blocked

**Rate Limiting:**
- ✅ Scheduled function prevents over-usage
- ✅ Manual trigger requires authentication token
- ✅ Exactly 5 API calls per day guaranteed

## 💰 Firebase Costs (Spark Plan - FREE)

**Monthly Usage Estimates:**
- **Cloud Functions**: ~150 invocations (5/day × 30 days) = FREE
- **Cloud Storage**: ~1MB (news.json updates) = FREE  
- **Hosting**: Static files = FREE
- **Bandwidth**: Minimal API responses = FREE

**NewsData.io Costs:**
- **Free Plan**: 200 API calls/month
- **System Usage**: 150 calls/month (5/day × 30 days)
- **Remaining**: 50 calls for testing/manual fetches

## 🛠️ Local Development

**Test functions locally:**
```bash
firebase emulators:start --only functions
```

**Test with local API key:**
```bash
export NEWS_API_KEY="pub_e50a94871c1640aaa68bf69837585a15"
firebase functions:shell
```

**Manual function testing:**
```javascript
// In Firebase shell
fetchNews()
getNews()
```

## 📊 Monitoring & Logs

**View function logs:**
```bash
firebase functions:log --only fetchNews
firebase functions:log --only getNews
```

**Check scheduled function status:**
```bash
firebase functions:log --only fetchNews --limit 10
```

**Monitor API usage:**
- Check NewsData.io dashboard for daily usage
- Expected: 5 calls per day, 150 calls per month

## 🚨 Troubleshooting

### Common Issues:

**1. "Function not found" error:**
```bash
# Redeploy functions
firebase deploy --only functions
```

**2. "Permission denied" on storage:**
```bash
# Redeploy storage rules
firebase deploy --only storage
```

**3. "API key not found" error:**
```bash
# Reset the secret
firebase functions:secrets:set NEWS_API_KEY
```

**4. No articles returned:**
- Check NewsData.io API quota
- Verify query parameters in function logs
- Test manual fetch endpoint

### Expected Log Messages:

**Successful fetch:**
```
🚀 Starting scheduled news fetch...
📡 Fetching from NewsData.io...
✅ Received 8 articles from API
💾 News data saved to Cloud Storage (news.json)
🎉 News fetch completed successfully in 2341ms
```

**API error:**
```
❌ News fetch failed: NewsData.io API error: 429 Too Many Requests
```

## 🎯 Success Indicators

**System is working correctly when:**
1. ✅ Cloud Functions deploy without errors
2. ✅ Scheduled function runs every 5 hours
3. ✅ `news.json` updates in Cloud Storage
4. ✅ Website displays fresh articles
5. ✅ Function logs show successful API calls
6. ✅ NewsData.io usage stays at 5 calls/day

## 🔄 Manual Operations

**Force immediate news fetch:**
```bash
curl "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/manualFetchNews?token=accizard-manual-fetch-2024"
```

**Check current news data:**
```bash
curl "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getNews"
```

**Update API key:**
```bash
firebase functions:secrets:set NEWS_API_KEY
firebase deploy --only functions
```

## 📈 Scaling Considerations

**Current limits (Firebase Spark - Free):**
- ✅ 125K function invocations/month (using ~150)
- ✅ 1GB storage (using ~1MB)
- ✅ 10GB bandwidth/month (using minimal)

**To increase capacity:**
- Upgrade to Firebase Blaze plan for higher limits
- Increase `pageSize` in NewsData.io query (costs more API calls)
- Add more news sources or categories

---

## 🎉 Deployment Complete!

Your Firebase-native news system is now:
- ✅ **Fully automated** - Runs every 5 hours without intervention
- ✅ **Cost-efficient** - Uses exactly 5 API calls per day
- ✅ **Secure** - API keys protected with Firebase secrets
- ✅ **Scalable** - Built on Firebase infrastructure
- ✅ **Reliable** - Automatic retries and error handling

**The system will now fetch fresh government news every 5 hours and display it on your website automatically!** 🚀
