# ANAF OAuth Authentication Tests

This directory contains comprehensive Jest tests for the ANAF e-Factura OAuth authentication flow.

## Setup

1. **Environment Variables**

Create a `.env` file in the project root with your ANAF OAuth credentials:

```env
ANAF_CLIENT_ID=your_oauth_client_id_here
ANAF_CLIENT_SECRET=your_oauth_client_secret_here
```

2. **Get OAuth Credentials**

To get your OAuth credentials:
1. Go to [ANAF Portal](https://anaf.ro)
2. Navigate to: Servicii Online → Înregistrare utilizatori → DEZVOLTATORI APLICAȚII
3. Register your application with callback URL: `http://localhost:4040/callback`
4. Note your `client_id` and `client_secret`

## Running Tests

### Automated Jest Tests

```bash
# Run all authentication tests with integrated callback server
pnpm test:auth

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### OAuth Flow Testing

The Jest tests include an integrated callback server that automatically:
- ✅ Starts a local Express server on port 4040
- 🔗 Provides OAuth authorization URLs for manual testing
- 📥 Captures authorization codes from ANAF redirects
- 🔄 Exchanges codes for tokens automatically
- 💾 Saves tokens for subsequent test runs

## Test Structure

### 1. Client Configuration Tests
- ✅ Validates OAuth client creation
- ✅ Tests required parameter validation
- ✅ Ensures proper error handling

### 2. Authorization URL Generation Tests
- 🔗 Validates OAuth URL generation
- ✅ Tests state and scope parameters
- ✅ Ensures proper URL encoding

### 3. Token Exchange Validation Tests
- ✅ Validates input parameters
- ✅ Tests error handling for invalid inputs
- ✅ Ensures proper error types are thrown

### 4. Manual OAuth Flow Test
- 🌐 Starts callback server on `localhost:4040`
- 🔗 Generates real OAuth URL for browser testing
- ⏳ Waits for user to complete OAuth flow
- 📥 Automatically captures authorization code
- 🔄 Exchanges code for tokens
- 💾 Saves tokens to `token.secret` file

### 5. Token Refresh Tests
- 🔄 Tests token refresh functionality
- 💾 Updates saved tokens
- ⚠️ Handles expired refresh tokens

### 6. Token Information Tests
- 📊 Displays current token status
- 🕐 Shows expiration information
- 📜 Decodes JWT payload for inspection

## OAuth Flow Process

When you run `pnpm test:auth`, the test will:

1. **Start Callback Server**: 
   - Express server starts on `http://localhost:4040`
   - Listens for `/callback` endpoint

2. **Generate OAuth URL**:
   - Creates authorization URL with proper parameters
   - Displays instructions in console

3. **Manual Authentication**:
   - Copy the displayed URL to your browser
   - Insert USB token when prompted
   - Enter PIN and authorize application
   - Browser redirects to `localhost:4040/callback`

4. **Automatic Token Exchange**:
   - Callback server captures authorization code
   - Test automatically exchanges code for tokens
   - Tokens saved to `token.secret` file

5. **Token Refresh Testing**:
   - Uses saved refresh token to get new access token
   - Validates token refresh functionality

## Callback Server Features

The integrated Express server provides:

- **`/callback`** - OAuth callback endpoint that captures authorization codes
- **`/health`** - Health check endpoint
- **Success Page** - Shows success message after OAuth completion
- **Error Handling** - Displays errors if OAuth fails
- **Auto-close** - Browser window closes automatically after 3 seconds

## Token Storage

- Tokens are saved to `token.secret` (automatically added to `.gitignore`)
- File contains access token, refresh token, and expiration info
- Used for subsequent test runs and API testing
- Includes timestamps for expiration tracking

## Test Environment

- All tests use ANAF test environment (`testMode: true`)
- OAuth endpoints: `logincert.anaf.ro`
- API endpoints: `api.anaf.ro/test`
- Callback URL: `http://localhost:4040/callback`

## Security Notes

- Never commit real tokens to version control
- Tokens are saved locally in `token.secret`
- Test with development/staging VAT numbers only
- Real USB tokens required for authentication
- Callback server only runs during tests

## Smart Test Behavior

The tests are designed to be efficient:

- **Skip OAuth if valid tokens exist**: If you already have valid tokens, the manual OAuth flow is skipped
- **Automatic token refresh**: Tests will refresh tokens if they're expired but refresh token is valid
- **Graceful timeouts**: OAuth flow has a 2-minute timeout to prevent hanging tests
- **Clean error handling**: Invalid tokens are automatically cleaned up

## Troubleshooting

### Missing Environment Variables
```
❌ Missing ANAF_CLIENT_ID or ANAF_CLIENT_SECRET environment variables
```
**Solution**: Create `.env` file with your OAuth credentials

### Port Already in Use
```
❌ Error: listen EADDRINUSE: address already in use :::4040
```
**Solution**: Kill any process using port 4040 or wait for previous tests to complete

### OAuth Timeout
```
⏰ OAuth flow timed out (2 minutes)
💡 You can run this test again to retry
```
**Solution**: Re-run the test and complete OAuth flow faster

### Invalid Authorization Code
```
❌ Token exchange failed: invalid_grant
```
**Solution**: Get a new authorization code (they expire quickly)

### Expired Refresh Token
```
❌ Token refresh failed: invalid_grant
💡 Refresh token may be expired. Run OAuth flow again.
```
**Solution**: Complete full OAuth flow again (invalid tokens are auto-deleted)

### USB Token Issues
- Ensure USB token is properly inserted
- Install manufacturer drivers if needed
- Try different browsers if certificate selection fails

## Example Test Output

```
🌐 OAuth callback server running on http://localhost:4040

🔗 MANUAL OAUTH AUTHENTICATION REQUIRED
=============================================

📋 Instructions:
1. Make sure your USB token is connected
2. Copy the URL below and open it in your browser
3. Insert USB token and enter PIN when prompted
4. Authorize the application
5. The browser will redirect to localhost:4040/callback
6. The test will automatically capture the authorization code

🌐 OAuth Authorization URL:
https://logincert.anaf.ro/anaf-oauth2/v1/authorize?client_id=...

⏳ Waiting for OAuth authorization...
💡 Complete the OAuth flow in your browser to continue this test

✅ Authorization code captured: AbCdEf123...
🔄 Exchanging authorization code for tokens...
✅ Token exchange successful!
🔑 Access token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
🔄 Refresh token: def50200...
⏰ Expires in: 3600 seconds (60 minutes)
💾 Tokens saved to: token.secret

🛑 OAuth callback server stopped
``` 