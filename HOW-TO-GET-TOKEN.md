# How to Get Your Access Token

## Method 1: Browser Local Storage (Easiest)

1. Open your web app in the browser (e.g., `http://localhost:3000` or production URL)
2. Make sure you're logged in
3. Open Browser DevTools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Safari**: Enable Developer menu first, then `Cmd+Option+I`

4. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
5. In the left sidebar, expand **Local Storage**
6. Click on your domain (e.g., `http://localhost:3000`)
7. Look for the key named `accessToken` or `token`
8. Copy the value

![Local Storage Screenshot](https://via.placeholder.com/600x300/1a1d29/5df0c0?text=Application+>+Local+Storage+>+accessToken)

## Method 2: Browser Cookies

1. Open DevTools (F12)
2. Go to **Application** tab > **Cookies**
3. Click on your domain
4. Look for a cookie named `accessToken`, `token`, or `auth_token`
5. Copy the value

## Method 3: Network Tab (More Technical)

1. Open DevTools (F12)
2. Go to **Network** tab
3. Reload the page or trigger an API request (e.g., click on a product)
4. Click on any API request in the list (look for requests to `/api/v1/...`)
5. In the **Headers** section, scroll down to **Request Headers**
6. Look for the `Authorization` header
7. Copy the value after `Bearer ` (without the "Bearer " part)

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy only: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Testing the Token

Once you have the token, run:

```bash
# Using the curl script:
./test-material-curl.sh YOUR_TOKEN_HERE

# Using the Node.js script:
ACCESS_TOKEN="YOUR_TOKEN_HERE" SHOP_ID="cmja4s0x50001jw2lyqbqoj2g" node test-material-simple.js
```

## Token Format

The token should be a long string that looks like:
- JWT format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`
- UUID format: `550e8400-e29b-41d4-a716-446655440000`
- Random string: `abc123def456ghi789`

If the token is empty or missing, you may need to log in again.
