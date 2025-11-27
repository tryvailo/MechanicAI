# Google Places API (New) Setup Guide

This guide explains how to set up Google Places API (New) for the MechanicAI app.

## Prerequisites

- Google Cloud account
- Credit card for billing (required for API access)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `MechanicAI` (or your preferred name)
4. Click **Create**

## Step 2: Enable Required APIs

Navigate to **APIs & Services** → **Library** and enable:

1. **Places API (New)** - Required for nearby search
   - Search for "Places API (New)"
   - Click **Enable**

2. **Maps JavaScript API** - Required for map display
   - Search for "Maps JavaScript API"
   - Click **Enable**

> ⚠️ Make sure to enable **Places API (New)**, not the legacy "Places API"

## Step 3: Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the generated API key
4. Click **Edit API Key** to configure restrictions

### Recommended API Key Restrictions

#### For Production:

**Application restrictions:**
- Select **HTTP referrers (web sites)**
- Add your domains:
  ```
  https://yourdomain.com/*
  https://*.vercel.app/*
  ```

**API restrictions:**
- Select **Restrict key**
- Select APIs:
  - Places API (New)
  - Maps JavaScript API

#### For Development:

- You can leave restrictions open during development
- Add `localhost:3000/*` to HTTP referrers if restricting

## Step 4: Configure Environment Variables

### Local Development (.env.local)

Create or update `.env.local` in your project root:

```env
# Google Places API (server-side) - used by API routes
GOOGLE_PLACES_API_KEY=your_api_key_here

# Google Maps JavaScript API (client-side) - used by map component
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

> 💡 You can use the same API key for both, or create separate keys for better security tracking.

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GOOGLE_PLACES_API_KEY` | `your_api_key` | Production, Preview, Development |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `your_api_key` | Production, Preview, Development |

4. Redeploy your application

## Step 5: Enable Billing

1. Go to **Billing** in Google Cloud Console
2. Link a billing account to your project
3. Set up budget alerts (recommended)

### Pricing Overview

As of 2024:

| API | Price | Free Tier |
|-----|-------|-----------|
| Places API (New) - Nearby Search | $32 per 1,000 requests | $200/month credit |
| Maps JavaScript API | $7 per 1,000 loads | $200/month credit |

> 💡 The $200 monthly credit typically covers ~6,000 nearby searches

## Step 6: Verify Setup

### Check API Configuration

Run your Next.js app and visit the Places screen. If configured correctly:
- Map should load and display
- Nearby places should appear after granting location permission

### Common Issues

#### "REQUEST_DENIED" Error
- Check that Places API (New) is enabled
- Verify API key is correct
- Check API key restrictions

#### "This API key is not authorized"
- Verify HTTP referrer restrictions include your domain
- For local dev, add `http://localhost:3000/*`

#### Map Not Loading
- Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Verify Maps JavaScript API is enabled
- Check browser console for errors

#### "OVER_QUERY_LIMIT"
- You've exceeded quota
- Check billing is enabled
- Consider adding usage limits in Cloud Console

## API Usage Best Practices

1. **Cache Results**: Store search results to reduce API calls
2. **Debounce Searches**: Don't search on every radius change
3. **Limit Fields**: Only request needed fields (already configured)
4. **Use Appropriate Radius**: Smaller radius = faster, cheaper searches

## Security Notes

- Never commit API keys to version control
- Use environment variables only
- Restrict API keys in production
- Monitor usage in Cloud Console
- Set up budget alerts

## Useful Links

- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Pricing Calculator](https://mapsplatform.google.com/pricing/)

## Environment Variables Summary

| Variable | Used By | Required |
|----------|---------|----------|
| `GOOGLE_PLACES_API_KEY` | Server API routes | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client map component | Yes |
