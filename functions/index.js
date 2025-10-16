/**
 * ACCIZARD NEWS SYSTEM - FIREBASE CLOUD FUNCTIONS
 * 
 * Automated news fetching system that:
 * - Runs every 5 hours (5 times per day)
 * - Fetches exactly 10 articles per run (50 articles/day)
 * - Uses exactly 5 NewsData.io API calls per day
 * - Stores results in Firebase Cloud Storage
 * - Provides secure API proxy for frontend
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const cors = require('cors')({ origin: true });
const nodemailer = require('nodemailer');

admin.initializeApp();

// NewsData.io API configuration - secured via environment variables
let NEWS_API_KEY;
try {
  NEWS_API_KEY = process.env.NEWSDATA_API_KEY || functions.config().newsdata?.apikey || 'pub_e50a94871c1640aaa68bf69837585a15';
} catch (configError) {
  console.warn('⚠️ Config access failed, using fallback API key');
  NEWS_API_KEY = 'pub_e50a94871c1640aaa68bf69837585a15';
}

// Validate API key exists
if (!NEWS_API_KEY) {
  console.error('❌ CRITICAL: NewsData.io API key not found');
}

// STRICT FREE TIER LIMITS - NEVER EXCEED THESE
const DAILY_FETCH_LIMIT = 5;           // Max 5 API calls per day
const ARTICLES_PER_FETCH = 10;         // 10 articles per fetch
const MAX_MONTHLY_FETCHES = 150;       // 5 per day × 30 days = 150 per month
const MAX_FIRESTORE_WRITES_PER_DAY = 15; // Well under 20K daily limit
const MAX_STORAGE_SIZE_MB = 1;         // Well under 5GB limit

// Emergency brake - if we somehow exceed limits, stop everything
const EMERGENCY_BRAKE_ENABLED = true;

/**
 * SCHEDULED NEWS FETCHER
 * Runs every 5 hours: 00:00, 05:00, 10:00, 15:00, 20:00 UTC
 * Fetches 10 articles per run = 50 articles per day
 * Uses exactly 1 API call per run = 5 API calls per day
 */
exports.fetchNews = onSchedule({
  schedule: '0 */5 * * *', // Every 5 hours: 00:00, 05:00, 10:00, 15:00, 20:00 UTC
  timeZone: 'UTC',
  memory: '256MiB',
  timeoutSeconds: 300
}, async (event) => {
  const startTime = Date.now();
  console.log('🚀 Starting scheduled news fetch...');
  
  try {
    // Check daily fetch limit to stay within free tier
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let counterData = {};
    let dailyCounterRef;
    
    try {
      dailyCounterRef = admin.firestore().collection('system').doc('daily-fetch-counter');
      const counterDoc = await dailyCounterRef.get();
      counterData = counterDoc.exists ? counterDoc.data() : {};
      console.log('✅ Firestore access successful');
      
      // Monthly tracking for long-term free tier compliance
      const currentMonth = today.substring(0, 7); // YYYY-MM
      if (!counterData.monthlyStats) counterData.monthlyStats = {};
      if (!counterData.monthlyStats[currentMonth]) {
        counterData.monthlyStats[currentMonth] = { fetches: 0, firestoreWrites: 0 };
      }
      
      // Emergency brake check
      if (EMERGENCY_BRAKE_ENABLED && counterData.monthlyStats[currentMonth].fetches >= MAX_MONTHLY_FETCHES) {
        console.log(`🚨 EMERGENCY BRAKE: Monthly limit reached (${MAX_MONTHLY_FETCHES}). Stopping all fetches.`);
        return {
          success: false,
          message: `Emergency brake activated - monthly limit of ${MAX_MONTHLY_FETCHES} fetches reached`,
          monthlyStats: counterData.monthlyStats[currentMonth]
        };
      }
      
    } catch (firestoreError) {
      console.error('❌ Firestore access failed:', firestoreError);
      console.log('⚠️ Proceeding without daily counter (will use default limits)');
      counterData = { date: today, count: 0, monthlyStats: {} };
    }
    
    // Reset counter if it's a new day
    if (counterData.date !== today) {
      counterData.date = today;
      counterData.count = 0;
    }
    
    // Check if we've reached daily limit
    if (counterData.count >= DAILY_FETCH_LIMIT) {
      console.log(`⚠️ Daily fetch limit reached (${DAILY_FETCH_LIMIT}). Skipping fetch.`);
      return {
        success: false,
        message: `Daily limit of ${DAILY_FETCH_LIMIT} fetches reached`,
        date: today,
        count: counterData.count
      };
    }
    
    // Increment counters
    counterData.count += 1;
    const currentMonth = today.substring(0, 7);
    if (counterData.monthlyStats && counterData.monthlyStats[currentMonth]) {
      counterData.monthlyStats[currentMonth].fetches += 1;
      counterData.monthlyStats[currentMonth].firestoreWrites += 1;
    }
    
    // Save updated counters
    if (dailyCounterRef) {
      await dailyCounterRef.set(counterData);
    }
    
    console.log(`📊 Daily fetch count: ${counterData.count}/${DAILY_FETCH_LIMIT}`);
    console.log(`📊 Monthly fetch count: ${counterData.monthlyStats?.[currentMonth]?.fetches || 0}/${MAX_MONTHLY_FETCHES}`);
    
    // Proceed with fetch
    // Import fetch dynamically (ES module)
    const fetch = (await import('node-fetch')).default;
    
    // Build NewsData.io API request
    const apiUrl = new URL('https://newsdata.io/api/1/news');
    apiUrl.searchParams.set('apikey', NEWS_API_KEY);
    apiUrl.searchParams.set('country', 'ph');
    apiUrl.searchParams.set('q', 'government OR disaster OR weather OR politics OR PAGASA OR DOST OR NDRRMC');
    apiUrl.searchParams.set('size', '10'); // Changed from pageSize to size
    
    console.log('📡 Fetching from NewsData.io...');
    console.log('🔍 Query: Government, disaster, weather, politics (Philippines, filtering for relevance)');
    console.log('🔗 API URL:', apiUrl.toString());
    
    // Make API request
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AcciZard-News-System/1.0'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Response Error:', response.status, response.statusText);
      console.error('❌ Error Body:', errorText);
      console.error('❌ Request URL:', apiUrl.toString());
      console.error('❌ API Key (first 10 chars):', NEWS_API_KEY.substring(0, 10) + '...');
      throw new Error(`NewsData.io API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io API failed: ${data.message || 'Unknown error'}`);
    }
    
    console.log(`✅ Received ${data.results?.length || 0} articles from API`);
    
    // Process and validate articles
    const processedArticles = processArticles(data.results || []);
    
    // Create news data object
    const newsData = {
      fetchedAt: new Date().toISOString(),
      totalArticles: processedArticles.length,
      source: 'NewsData.io',
      query: 'DOST OR PAGASA OR NDRRMC',
      country: 'Philippines',
      articles: processedArticles
    };
    
    // Save to Firebase Cloud Storage
    await saveNewsToStorage(newsData);
    
    const duration = Date.now() - startTime;
    console.log(`🎉 News fetch completed successfully in ${duration}ms`);
    console.log(`📊 Processed ${processedArticles.length} articles`);
    
    return {
      success: true,
      articlesCount: processedArticles.length,
      duration: duration,
      timestamp: newsData.fetchedAt
    };
    
  } catch (error) {
    console.error('❌ News fetch failed:', error);
    
    // Log detailed error for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      apiKey: NEWS_API_KEY ? 'Present' : 'Missing',
      dailyCount: counterData?.count || 'Unknown'
    });
    
    // Try to update counter even on failure to prevent infinite retries
    try {
      if (counterData) {
        counterData.lastError = error.message;
        counterData.lastErrorTime = new Date().toISOString();
        await dailyCounterRef.set(counterData);
      }
    } catch (counterError) {
      console.error('❌ Failed to update error counter:', counterError);
    }
    
    // Don't throw - let the function complete to avoid retries
    // Firebase will automatically retry failed scheduled functions
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * MANUAL NEWS TRIGGER
 * Allows manual triggering of news fetch for testing
 * Requires authentication token to prevent abuse
 */
exports.manualFetchNews = onRequest({
  memory: '256MiB',
  timeoutSeconds: 300,
  cors: true
}, async (req, res) => {
  // Simple token-based authentication
  const authToken = req.headers.authorization || req.query.token;
  const expectedToken = 'accizard-manual-fetch-2024'; // Change this for security
  
  if (authToken !== expectedToken) {
    console.warn('🚫 Unauthorized manual fetch attempt');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid token required for manual fetch'
    });
  }
  
  console.log('🔄 Manual news fetch triggered');
  
  try {
    // Reuse the same logic as scheduled function
    const result = await fetchNewsLogic();
    
    res.status(200).json({
      success: true,
      message: 'Manual fetch completed',
      ...result
    });
    
  } catch (error) {
    console.error('❌ Manual fetch failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * NEWS API PROXY
 * Secure endpoint for frontend to fetch news data
 * Prevents direct access to Cloud Storage from frontend
 */
exports.getNews = onRequest({
  memory: '128MiB',
  timeoutSeconds: 60,
  cors: true
}, async (req, res) => {
  try {
    console.log('📰 Frontend requesting news data');
    
    const bucket = getStorage().bucket();
    const file = bucket.file('news.json');
    
    // Check if file exists
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log('📄 No news data found, returning empty response');
      return res.status(200).json({
        fetchedAt: new Date().toISOString(),
        totalArticles: 0,
        articles: [],
        message: 'No news data available yet. First fetch will occur automatically.'
      });
    }
    
    // Download and parse news data
    const [contents] = await file.download();
    const newsData = JSON.parse(contents.toString());
    
    console.log(`📊 Serving ${newsData.totalArticles || 0} articles to frontend`);
    
    // Add cache headers (5 minutes)
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).json(newsData);
    
  } catch (error) {
    console.error('❌ Error serving news data:', error);
    
    res.status(500).json({
      error: 'Failed to fetch news data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PROCESS ARTICLES
 * Clean and validate article data from NewsData.io
 * Filter for relevant government, disaster, and political news only
 */
function processArticles(articles) {
  if (!Array.isArray(articles)) {
    console.warn('⚠️ Invalid articles data received');
    return [];
  }
  
  return articles
    .filter(article => {
      // Basic validation
      if (!article || !article.title || !article.link || !article.link.startsWith('http')) {
        return false;
      }
      
      // Content filtering - exclude entertainment, sports, celebrity news
      const content = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
      
      // Exclude keywords (entertainment, sports, celebrities)
      const excludeKeywords = [
        'celebrity', 'actor', 'actress', 'singer', 'artist', 'movie', 'film', 'concert', 
        'album', 'song', 'music', 'entertainment', 'showbiz', 'drama', 'series', 'tv show',
        'basketball', 'football', 'soccer', 'volleyball', 'boxing', 'sports', 'athlete',
        'game', 'match', 'tournament', 'championship', 'league', 'player', 'coach',
        'fashion', 'beauty', 'lifestyle', 'gossip', 'romance', 'dating', 'wedding',
        'social media', 'instagram', 'tiktok', 'facebook post', 'viral video'
      ];
      
      // Check if article contains excluded content
      const hasExcludedContent = excludeKeywords.some(keyword => content.includes(keyword));
      if (hasExcludedContent) {
        console.log(`🚫 Excluded article: ${article.title.substring(0, 50)}... (entertainment/sports)`);
        return false;
      }
      
      // Include keywords (government, disaster, weather, politics)
      const includeKeywords = [
        // Government agencies
        'dost', 'pagasa', 'ndrrmc', 'phivolcs', 'denr', 'dilg', 'doh', 'dpwh',
        // Weather and disasters
        'typhoon', 'storm', 'flood', 'earthquake', 'tsunami', 'landslide', 'drought',
        'weather', 'climate', 'disaster', 'calamity', 'emergency', 'evacuation',
        'rainfall', 'temperature', 'wind', 'cyclone', 'monsoon', 'el niño', 'la niña',
        // Politics and government
        'president', 'senate', 'congress', 'government', 'politics', 'policy', 'law',
        'mayor', 'governor', 'barangay', 'lgu', 'national', 'local government',
        'budget', 'infrastructure', 'public', 'citizen', 'community', 'province',
        'manila', 'cebu', 'davao', 'region', 'municipality', 'city hall',
        // Safety and preparedness
        'safety', 'preparedness', 'warning', 'alert', 'advisory', 'bulletin',
        'rescue', 'relief', 'assistance', 'aid', 'response', 'recovery'
      ];
      
      // Check if article contains relevant content
      const hasRelevantContent = includeKeywords.some(keyword => content.includes(keyword));
      
      if (hasRelevantContent) {
        console.log(`✅ Included article: ${article.title.substring(0, 50)}...`);
        return true;
      }
      
      console.log(`⚠️ Filtered out: ${article.title.substring(0, 50)}... (not relevant)`);
      return false;
    })
    .map(article => ({
      title: article.title.trim(),
      description: article.description?.trim() || article.content?.trim() || 'No description available.',
      image: article.image_url || 'https://via.placeholder.com/300x200?text=Government+News',
      source: detectSource(article),
      publishedAt: article.pubDate || new Date().toISOString(),
      url: article.link,
      category: article.category?.[0] || 'Government'
    }))
    .slice(0, 10); // Return exactly 10 relevant articles
}

/**
 * DETECT NEWS SOURCE
 * Identify if article is from DOST, PAGASA, or NDRRMC
 */
function detectSource(article) {
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const link = (article.link || '').toLowerCase();
  const content = `${title} ${description} ${link}`;
  
  if (content.includes('pagasa') || link.includes('pagasa.dost.gov.ph')) {
    return 'PAGASA';
  }
  
  if (content.includes('dost') || link.includes('dost.gov.ph')) {
    return 'DOST';
  }
  
  if (content.includes('ndrrmc') || link.includes('ndrrmc.gov.ph')) {
    return 'NDRRMC';
  }
  
  return 'Government';
}

/**
 * SAVE NEWS TO CLOUD STORAGE
 * Store processed news data in Firebase Cloud Storage
 */
async function saveNewsToStorage(newsData) {
  try {
    console.log('💾 Attempting to save news data to Cloud Storage...');
    
    const bucket = getStorage().bucket();
    console.log('✅ Storage bucket accessed successfully');
    
    const file = bucket.file('news.json');
    
    // Convert to JSON string
    const jsonData = JSON.stringify(newsData, null, 2);
    console.log(`📝 JSON data prepared (${jsonData.length} characters)`);
    
    // Save to Cloud Storage
    await file.save(jsonData, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=300' // 5 minutes cache
      }
    });
    
    console.log('✅ News data saved to Cloud Storage (news.json)');
    
  } catch (error) {
    console.error('❌ Failed to save news data:', error);
    console.error('❌ Storage error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Storage save failed: ${error.message}`);
  }
}

/**
 * SHARED FETCH LOGIC
 * Common logic for both scheduled and manual fetch
 */
async function fetchNewsLogic() {
  const fetch = (await import('node-fetch')).default;
  
  const apiUrl = new URL('https://newsdata.io/api/1/news');
  apiUrl.searchParams.set('apikey', NEWS_API_KEY);
  apiUrl.searchParams.set('country', 'ph');
  apiUrl.searchParams.set('q', 'government OR disaster OR weather OR politics OR PAGASA OR DOST OR NDRRMC');
  apiUrl.searchParams.set('size', '10'); // Changed from pageSize to size
  
  const response = await fetch(apiUrl.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'AcciZard-News-System/1.0' },
    timeout: 30000
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.status !== 'success') {
    throw new Error(`API failed: ${data.message || 'Unknown error'}`);
  }
  
  const processedArticles = processArticles(data.results || []);
  
  const newsData = {
    fetchedAt: new Date().toISOString(),
    totalArticles: processedArticles.length,
    source: 'NewsData.io',
    query: 'DOST OR PAGASA OR NDRRMC',
    country: 'Philippines',
    articles: processedArticles
  };
  
  await saveNewsToStorage(newsData);
  
  return {
    articlesCount: processedArticles.length,
    timestamp: newsData.fetchedAt
  };
}

/**
 * CONTACT FORM HANDLER
 * Handles contact form submissions and stores them in Firestore
 * For now, stores submissions and sends notification (email integration can be added later)
 */
exports.sendContactEmail = onRequest({
  memory: '128MiB',
  timeoutSeconds: 60,
  cors: true
}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }

      console.log('📧 Contact form submission received');
      
      // Extract form data
      const { firstName, lastName, email, subject, message } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }
      
      // Configure email transporter with Gmail App Password
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'accizardlucban@gmail.com',
          pass: 'qtta bfzu ktjw pyag' // Google App Password
        }
      });
      
      // Email content
      const mailOptions = {
        from: 'accizardlucban@gmail.com',
        to: 'accizardlucban@gmail.com',
        subject: `Contact Form: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${req.ip || 'unknown'}</p>
        `,
        replyTo: email
      };
      
      console.log('📧 Sending email notification...');
      
      // Store submission in Firestore for record keeping
      const submissionData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        status: 'new',
        processed: false,
        emailSent: false
      };
      
      let emailSent = false;
      let emailError = null;
      
      try {
        // Send email notification
        await transporter.sendMail(mailOptions);
        console.log('✅ Email notification sent successfully');
        emailSent = true;
        submissionData.emailSent = true;
      } catch (emailErr) {
        console.error('❌ Failed to send email notification:', emailErr);
        emailError = emailErr.message;
        submissionData.emailError = emailErr.message;
      }
      
      const docRef = await admin.firestore().collection('contact-submissions').add(submissionData);
      console.log(`📝 Contact submission stored with ID: ${docRef.id}`);
      
      // Log submission details for monitoring
      console.log(`✅ Contact form submission from: ${firstName} ${lastName} (${email})`);
      console.log(`📋 Subject: ${subject}`);
      console.log(`💬 Message preview: ${message.substring(0, 100)}...`);
      
      // Success response (even if email fails, we still store the submission)
      res.status(200).json({
        success: true,
        message: emailSent 
          ? 'Message sent successfully! We\'ll get back to you soon.'
          : 'Message received and stored. Email notification may be delayed.',
        submissionId: docRef.id,
        emailSent: emailSent
      });
      
    } catch (error) {
      console.error('❌ Contact form error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send message. Please try again later.',
        details: error.message
      });
    }
  });
});
