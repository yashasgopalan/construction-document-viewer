# Vercel Deployment Debug Guide

## PDF Viewing Issue on Vercel

If PDFs are not loading on Vercel but work locally, this is likely due to one of these issues:

### 1. **CORS Issues**
Vercel might have different CORS policies than localhost.

**Solution**: Check your Supabase storage bucket CORS settings:
- Go to Supabase Dashboard → Storage → Settings
- Ensure CORS is properly configured for your Vercel domain

### 2. **Environment Variables**
Make sure your Vercel environment variables are set correctly.

**Check in Vercel Dashboard**:
- Go to your project → Settings → Environment Variables
- Ensure these are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. **Signed URL Issues**
The signed URLs might not be working properly on Vercel.

**Debug Steps**:
1. Open browser console on Vercel deployment
2. Look for these log messages:
   - `PDF Viewer: Loading document: [path]`
   - `generateSignedUrl: Attempting to generate signed URL for:`
   - `PDF Viewer: Signed URL result:`
   - `PDF Viewer: Signed URL is accessible`

### 4. **Network Issues**
Check if the signed URLs are actually accessible.

**Test in Browser**:
1. Copy the signed URL from console logs
2. Open in new tab
3. Check if PDF loads directly

### 5. **React-PDF Issues**
React-PDF might have issues with certain URLs on Vercel.

**Fallback Solution**: Add this to your `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose'
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  }
}

export default nextConfig
```

### 6. **Supabase RLS Policies**
Make sure your RLS policies are correctly set up for production.

**Check in Supabase SQL Editor**:
```sql
-- Test if policies are working
SELECT * FROM storage.objects WHERE name LIKE '%your-file%';
```

### 7. **Debug Console Output**
When you test on Vercel, check the console for these specific error patterns:

**Expected Success Flow**:
```
PDF Viewer: Loading document: [user-id]/[file-path]
PDF Viewer: Environment: production
PDF Viewer: Detected Supabase path, generating signed URL...
generateSignedUrl: Attempting to generate signed URL for: {bucket: "user-files", path: "[user-id]/[file-path]", expiresIn: 3600}
generateSignedUrl: Environment: production
generateSignedUrl: Supabase URL: [your-supabase-url]
generateSignedUrl: Current user: [user-id]
PDF Viewer: Signed URL result: {signedUrl: "[url]", expiresAt: "[date]"}
PDF Viewer: Using signed URL: [url]...
PDF Viewer: Signed URL is accessible
PDF Viewer: Document loaded successfully, pages: [number]
```

**Common Error Patterns**:
- `User not authenticated` → Auth issue
- `File path does not match authenticated user` → RLS policy issue
- `PDF not accessible: CORS` → CORS configuration issue
- `Failed to load PDF: [error]` → React-PDF issue

### 8. **Quick Fixes to Try**

1. **Clear Vercel Cache**:
   - Go to Vercel Dashboard → Deployments
   - Click "Redeploy" on latest deployment

2. **Check Build Logs**:
   - Look for any build-time errors
   - Check if environment variables are loaded

3. **Test with Different File**:
   - Try uploading a new PDF file
   - Test with a smaller PDF file

4. **Check Network Tab**:
   - Open DevTools → Network
   - Look for failed requests to Supabase
   - Check response headers for CORS errors

### 9. **Emergency Fallback**
If nothing works, you can temporarily disable Supabase integration:

In `components/pdf-viewer.tsx`, comment out the Supabase loading logic and use a direct URL:

```typescript
// Temporarily disable Supabase loading
// if (document && document.includes('/') && !document.startsWith('/') && !document.startsWith('http')) {
//   // Supabase logic...
// } else {
  setPdfFile("/placeholder-construction-drawing.pdf")
// }
```

This will help isolate whether the issue is with Supabase or React-PDF itself.

### 10. **Contact Support**
If the issue persists, provide these details:
- Console logs from Vercel deployment
- Network tab screenshots
- Supabase project URL
- Vercel deployment URL
- Steps to reproduce the issue




