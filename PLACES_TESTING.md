# Места (Places) Feature — Integration Testing Guide

This document provides instructions for testing the "Места" (Places) feature before deployment.

## Table of Contents

1. [API Endpoint Testing](#1-api-endpoint-testing)
2. [Geolocation Flow Testing](#2-geolocation-flow-testing)
3. [Map & Markers Testing](#3-map--markers-testing)
4. [Error States Testing](#4-error-states-testing)
5. [QA Deployment Checklist](#5-qa-deployment-checklist)

---

## 1. API Endpoint Testing

### Prerequisites

- Server running locally: `pnpm dev`
- Valid `GOOGLE_PLACES_API_KEY` in `.env.local`

### Test with cURL

#### ✅ Success Case — Both place types

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 50.4501,
    "longitude": 30.5234,
    "radiusMeters": 5000,
    "placeTypes": ["car_repair", "parking"]
  }'
```

#### ✅ Success Case — Car repair only

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 50.4501,
    "longitude": 30.5234,
    "radiusMeters": 3000,
    "placeTypes": ["car_repair"]
  }'
```

#### ✅ Success Case — Parking only

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 50.4501,
    "longitude": 30.5234,
    "radiusMeters": 2000,
    "placeTypes": ["parking"]
  }'
```

#### ❌ Error Case — Missing coordinates

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d '{
    "radiusMeters": 5000,
    "placeTypes": ["car_repair"]
  }'
```

**Expected:** `400 Bad Request`

```json
{
  "error": "Invalid request. Required: latitude (number), longitude (number), radiusMeters (number), placeTypes (array of \"car_repair\" | \"parking\")"
}
```

#### ❌ Error Case — Invalid place type

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 50.4501,
    "longitude": 30.5234,
    "radiusMeters": 5000,
    "placeTypes": ["restaurant"]
  }'
```

**Expected:** `400 Bad Request`

#### ❌ Error Case — Invalid JSON

```bash
curl -X POST http://localhost:3000/api/nearby-places \
  -H "Content-Type: application/json" \
  -d 'not valid json'
```

**Expected:** `400 Bad Request` with `{"error": "Invalid JSON body"}`

### Expected Response Format

```json
{
  "carRepairs": [
    {
      "id": "ChIJ...",
      "name": "АвтоСервіс Київ",
      "rating": 4.5,
      "reviewCount": 128,
      "address": "вул. Хрещатик, 1, Київ",
      "lat": 50.4501,
      "lng": 30.5234,
      "mapsUri": "https://maps.google.com/?cid=...",
      "priceLevel": "PRICE_LEVEL_MODERATE",
      "websiteUri": "https://example.com",
      "distance": 1.2
    }
  ],
  "parkings": [
    {
      "id": "ChIJ...",
      "name": "Паркінг Центр",
      "address": "вул. Велика Васильківська, 5",
      "lat": 50.4480,
      "lng": 30.5200,
      "mapsUri": "https://maps.google.com/?cid=...",
      "distance": 0.5
    }
  ]
}
```

### Test with Postman

1. Import the collection from `postman-collection.json` (if available)
2. Or create a new POST request:
   - URL: `http://localhost:3000/api/nearby-places`
   - Body (raw JSON): see examples above
   - Headers: `Content-Type: application/json`

### Test Coordinates

| Location | Latitude | Longitude | Notes |
|----------|----------|-----------|-------|
| Kyiv, Ukraine | 50.4501 | 30.5234 | Good coverage |
| Lviv, Ukraine | 49.8397 | 24.0297 | Good coverage |
| San Francisco, USA | 37.7749 | -122.4194 | High density |
| Remote area | 68.0000 | 33.0000 | Few/no results |

---

## 2. Geolocation Flow Testing

### Browser Testing (Desktop)

1. Open `http://localhost:3000` in Chrome/Firefox
2. Navigate to "Места" tab
3. Browser should prompt for location permission

**Test scenarios:**

| Action | Expected Result |
|--------|-----------------|
| Allow permission | Map centers on user location, places load |
| Block permission | Error message with "Попробовать снова" button |
| Dismiss prompt | Stays in pending state |

### Chrome DevTools Location Override

1. Open DevTools (F12)
2. Press `Ctrl+Shift+P` → "Show Sensors"
3. Under "Location", select preset or enter custom coordinates
4. Refresh page and grant permission

### iOS Simulator Testing

1. Open Xcode → Simulator
2. Menu: Features → Location → Custom Location
3. Enter coordinates (e.g., 50.4501, 30.5234)
4. Open Safari and navigate to your app
5. Grant location permission when prompted

### Android Emulator Testing

1. Open Android Studio → AVD Manager → Start emulator
2. Click "..." (Extended controls) → Location
3. Enter coordinates and click "Set Location"
4. Open Chrome and navigate to your app
5. Grant location permission

### Real Device Testing

**iOS:**
1. Deploy to TestFlight or use Expo Go
2. Settings → Privacy → Location Services → Safari → "While Using"
3. Navigate to app and allow permission

**Android:**
1. Deploy APK or use Expo Go
2. Settings → Apps → Chrome → Permissions → Location → Allow
3. Navigate to app and allow permission

### Location Cache Testing

1. Grant permission → places load
2. Close tab, reopen within 5 minutes
3. **Expected:** Uses cached location, doesn't prompt again
4. Wait 5+ minutes or clear localStorage
5. **Expected:** Prompts for permission again

---

## 3. Map & Markers Testing

### Visual Verification Checklist

| Element | Check |
|---------|-------|
| Map loads | ✓ No gray/blank area |
| User marker | ✓ Orange dot at user location |
| Car repair markers | ✓ Teal pin with wrench icon |
| Parking markers | ✓ Gray pin with "P" |
| Marker click | ✓ Info window opens |
| Info window content | ✓ Name, rating, address, "Маршрут" button |
| "Маршрут" button | ✓ Opens Google Maps in new tab |
| Map zoom | ✓ Zoom controls work |
| Map pan | ✓ Drag to move map |
| Fullscreen | ✓ Fullscreen button works |

### Marker Interaction Testing

1. Click on a car repair marker
   - Info window should show name, rating (with star), review count, address
   - "Маршрут" button should open directions

2. Click on a parking marker
   - Info window should show name and address (no rating)
   - "Маршрут" button should work

3. Click on list item
   - Map should pan to that location
   - Marker info window should open
   - List item should highlight

### Tab Switching Testing

1. Load places with both filters enabled
2. Switch to "СТО" tab → only car repair list shown
3. Switch to "Парковки" tab → only parking list shown
4. Both tabs should show correct counts in badges

### Radius Slider Testing

1. Open radius slider (settings icon)
2. Change radius from 5km to 10km
3. **Expected:** New API request, more results
4. Change radius to 1km
5. **Expected:** Fewer results or empty state

---

## 4. Error States Testing

### Geolocation Errors

| Scenario | How to Test | Expected UI |
|----------|-------------|-------------|
| Permission denied | Block location in browser | "Геолокация недоступна" + retry button |
| Position unavailable | Disable GPS in device settings | Error message |
| Timeout | Slow network + GPS off | "Время ожидания истекло" |
| Not supported | IE11 or disable geolocation API | "Геолокация не поддерживается" |

### API Errors

| Scenario | How to Test | Expected UI |
|----------|-------------|-------------|
| Invalid API key | Set wrong key in .env.local | "Invalid or unauthorized API key" (401) |
| Missing API key | Remove GOOGLE_PLACES_API_KEY | "Google Places API key not configured" |
| Places API disabled | Disable in Google Cloud Console | Permission denied error |
| Network error | Disconnect internet | "Failed to fetch nearby places" (503) |
| No results | Use remote coordinates | "СТО поблизости не найдены" |

### Test Invalid API Key

```bash
# Temporarily set invalid key
echo "GOOGLE_PLACES_API_KEY=invalid_key" >> .env.local

# Restart server and test
pnpm dev
```

### Test Network Error

1. Open app, grant location
2. Open DevTools → Network → Offline
3. Change radius to trigger new request
4. **Expected:** Error state with retry button

---

## 5. QA Deployment Checklist

### Pre-Deployment Checks

#### Environment Variables

- [ ] `GOOGLE_PLACES_API_KEY` set in Vercel
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in Vercel
- [ ] API keys have correct restrictions for production domain

#### API Testing

- [ ] `/api/nearby-places` returns 200 with valid data
- [ ] `/api/nearby-places` returns 400 for invalid requests
- [ ] Rate limiting is acceptable (monitor in Google Cloud Console)

#### UI/UX Testing

- [ ] "Места" tab appears in navigation
- [ ] Tab icon and label correct
- [ ] Geolocation permission prompt works
- [ ] Map loads without errors
- [ ] Markers display with correct icons
- [ ] Info windows show correct content
- [ ] "Маршрут" button opens Google Maps
- [ ] List items are clickable and highlight
- [ ] Tabs (СТО/Парковки) switch correctly
- [ ] Radius slider works
- [ ] Filter chips toggle places correctly

#### Mobile Testing

- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Touch interactions work (tap markers, scroll list)
- [ ] Map height appropriate (40vh)
- [ ] No horizontal scroll issues
- [ ] Safe area insets respected

#### Error Handling

- [ ] Permission denied shows error + retry
- [ ] No results shows empty state message
- [ ] API error shows error state with retry
- [ ] Loading states display correctly

#### Performance

- [ ] Map loads within 3 seconds
- [ ] Places load within 2 seconds
- [ ] No memory leaks on tab switching
- [ ] Cache works (check localStorage)

#### Accessibility

- [ ] Tab navigation has aria-current
- [ ] Buttons are keyboard accessible
- [ ] Error messages are screen-reader friendly

### Post-Deployment Verification

1. Open production URL
2. Navigate to "Места" tab
3. Grant location permission
4. Verify map and places load
5. Test marker click and "Маршрут" button
6. Test on mobile device
7. Check Google Cloud Console for API usage

### Rollback Plan

If issues occur:

1. Check Vercel deployment logs
2. Verify environment variables are set
3. Check Google Cloud Console for API errors
4. If critical, redeploy previous version from Vercel dashboard

---

## Troubleshooting

### Map Not Loading

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
3. Check API key restrictions in Google Cloud Console
4. Ensure Maps JavaScript API is enabled

### Places Not Loading

1. Check Network tab for `/api/nearby-places` request
2. Verify `GOOGLE_PLACES_API_KEY` is set (server-side)
3. Check server logs for errors
4. Ensure Places API (New) is enabled in Google Cloud

### Markers Not Displaying

1. Check that SVG files exist in `/public/markers/`
2. Verify marker paths in `NearbyPlacesMap` component
3. Check browser console for 404 errors on marker images

### Geolocation Not Working

1. Ensure HTTPS (required for geolocation)
2. Check browser permissions
3. Try different browser/device
4. Check `useGeolocation` hook errors in console
