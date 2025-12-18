# eBay API Credentials Setup Guide

## Getting Your eBay Developer Credentials

To use the eBay API integration, you need to obtain API credentials from eBay's Developer Portal.

### Step 1: Create an eBay Developer Account

1. Go to https://developer.ebay.com/
2. Click "Join" or "Sign In" 
3. Create a new account or sign in with your existing eBay account
4. Complete the registration process

### Step 2: Create an Application

1. After logging in, go to **"My Account"** → **"Application Keys"**
2. Click **"Create an Application Key Set"**
3. Fill in the application details:
   - **Application Title**: For Gamers Hardware Integration
   - **Application Type**: Select "Production" (or "Sandbox" for testing)
   - **Complete the form** with your application details

### Step 3: Get Your Credentials

Once your application is created, you'll see:
- **App ID (Client ID)**: A long string starting with your username
- **Cert ID (Client Secret)**: A long hex string

### Step 4: Configure Your Application

Add the credentials to your `.env` file in the `backend` directory:

```bash
# eBay API Configuration
EBAY_CLIENT_ID=YourApp-YourCompany-PRD-xxxxxxxxxx
EBAY_CLIENT_SECRET=PRD-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EBAY_API_ENV=production
```

**For testing/development**, you can use the sandbox environment:
```bash
EBAY_API_ENV=sandbox
```

### Step 5: Test Your Credentials

Run the test script to verify your credentials are working:

```bash
cd c:\Users\Anton\Documents\For-Gamers\backend
python test_ebay_oauth.py
```

If successful, you should see:
```
✅ SUCCESS! OAuth token obtained
```

### Step 6: Test Hardware Search

Test the hardware search functionality:

```bash
python test_ebay_search.py
```

This will search for sample hardware items and display the results.

## API Usage Limits

- **Production**: 5,000 calls per day by default
- **Sandbox**: Limited to testing only
- Rate limiting is handled automatically by the service

## Troubleshooting

### "eBay API credentials not configured"
- Make sure your `.env` file is in the `backend` directory
- Ensure the variable names are exactly: `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`
- Restart your backend server after adding credentials

### "Failed to obtain OAuth token"
- Double-check that you copied the credentials correctly (no extra spaces)
- Verify you're using Production credentials (not Sandbox) if `EBAY_API_ENV=production`
- Check your internet connection
- Verify your eBay Developer account is in good standing

### No Results from Search
- The eBay Browse API only returns active listings
- Try different search keywords
- Check if rate limits have been exceeded
- Verify your app has the correct permissions/scopes

## Additional Resources

- [eBay Developer Portal](https://developer.ebay.com/)
- [Browse API Documentation](https://developer.ebay.com/api-docs/buy/browse/overview.html)
- [OAuth 2.0 Guide](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
