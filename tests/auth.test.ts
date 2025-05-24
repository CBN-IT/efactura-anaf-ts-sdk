import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import open from 'open';
import { Server } from 'http';
import { AnafClient } from '../src/AnafClient';
import { TokenResponse } from '../src/types';
import { AnafAuthenticationError, AnafValidationError } from '../src/errors';

// Load environment variables
dotenv.config();

describe('ANAF OAuth Authentication', () => {
  let client: AnafClient;
  let server: Server;
  let app: express.Application;
  const tokenFilePath = path.join(process.cwd(), 'token.secret');
  const PORT = 4040;
  
  // Store captured auth data
  let capturedAuthCode: string | null = null;
  let authCodePromise: Promise<string> | null = null;
  let authCodeResolve: ((code: string) => void) | null = null;

  beforeAll(async () => {
    // Validate environment variables
    if (!process.env.ANAF_CLIENT_ID || !process.env.ANAF_CLIENT_SECRET) {
      throw new Error('Missing ANAF_CLIENT_ID or ANAF_CLIENT_SECRET environment variables');
    }

    client = new AnafClient({
      clientId: process.env.ANAF_CLIENT_ID!,
      clientSecret: process.env.ANAF_CLIENT_SECRET!,
      redirectUri: process.env.ANAF_CALLBACK_URL!,
      vatNumber: 'RO12345678', // Test VAT number
      testMode: true // Use test environment
    });

    // Setup Express server for OAuth callback
    app = express();
    
    // Callback endpoint
    app.get('/callback', (req, res) => {
      const { code, state, error } = req.query;
      
      if (error) {
        console.log(`❌ OAuth error: ${error}`);
        res.status(400).send(`
          <html>
            <body>
              <h2>❌ OAuth Error</h2>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        return;
      }

      if (code) {
        capturedAuthCode = code as string;
        
        console.log(`✅ Authorization code captured: ${code.toString().substring(0, 20)}...`);
        
        // Resolve the promise if waiting
        if (authCodeResolve) {
          authCodeResolve(code as string);
          authCodeResolve = null;
        }

        res.send(`
          <html>
            <body>
              <h2>✅ Authorization Successful!</h2>
              <p>Authorization code captured successfully.</p>
              <p>You can close this window and check the test results.</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(400).send(`
          <html>
            <body>
              <h2>❌ Missing Authorization Code</h2>
              <p>No authorization code received.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', message: 'OAuth callback server is running' });
    });

    // Start server
    server = app.listen(PORT, () => {
      console.log(`🌐 OAuth callback server running on ${process.env.ANAF_CALLBACK_URL}`);
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
      console.log('🛑 OAuth callback server stopped');
    }
  });

  describe('Client Configuration', () => {
    test('should create client with valid configuration', () => {
      expect(client).toBeDefined();
      expect(() => {
        new AnafClient({
          clientId: process.env.ANAF_CLIENT_ID!,
          clientSecret: process.env.ANAF_CLIENT_SECRET!,
          redirectUri: process.env.ANAF_CALLBACK_URL!,
          vatNumber: 'RO12345678',
          testMode: true
        });
      }).not.toThrow();
    });

    test('should throw error for missing client ID', () => {
      expect(() => {
        new AnafClient({
          clientId: '',
          clientSecret: 'secret',
          redirectUri: process.env.ANAF_CALLBACK_URL!,
          vatNumber: 'RO12345678'
        });
      }).toThrow(AnafValidationError);
    });

    test('should throw error for missing client secret', () => {
      expect(() => {
        new AnafClient({
          clientId: 'client-id',
          clientSecret: '',
          redirectUri: process.env.ANAF_CALLBACK_URL!,
          vatNumber: 'RO12345678'
        });
      }).toThrow(AnafValidationError);
    });

    test('should throw error for missing redirect URI', () => {
      expect(() => {
        new AnafClient({
          clientId: 'client-id',
          clientSecret: 'secret',
          redirectUri: '',
          vatNumber: 'RO12345678'
        });
      }).toThrow(AnafValidationError);
    });
  });

  describe('Authorization URL Generation', () => {
    test('should generate valid authorization URL', () => {
      const authUrl = client.getAuthorizationUrl();
      
      expect(authUrl).toContain('https://logincert.anaf.ro/anaf-oauth2/v1/authorize');
      expect(authUrl).toContain(`client_id=${process.env.ANAF_CLIENT_ID}`);
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain(`redirect_uri=http%3A//localhost%3A${PORT}/callback`);
      expect(authUrl).toContain('token_content_type=jwt');
      expect(authUrl).not.toContain('state='); // State should not be present
    });

    test('should generate authorization URL with scope parameter', () => {
      const scope = 'test-scope';
      const authUrl = client.getAuthorizationUrl(scope);
      
      expect(authUrl).toContain(`scope=${scope}`);
    });
  });

  describe('Token Exchange Validation', () => {
    test('should throw error for empty authorization code', async () => {
      await expect(client.exchangeCodeForToken('')).rejects.toThrow(AnafValidationError);
      await expect(client.exchangeCodeForToken('   ')).rejects.toThrow(AnafValidationError);
    });

    test('should throw error for null/undefined authorization code', async () => {
      await expect(client.exchangeCodeForToken(null as any)).rejects.toThrow(AnafValidationError);
      await expect(client.exchangeCodeForToken(undefined as any)).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Token Refresh Validation', () => {
    test('should throw error for empty refresh token', async () => {
      await expect(client.refreshAccessToken('')).rejects.toThrow(AnafValidationError);
      await expect(client.refreshAccessToken('   ')).rejects.toThrow(AnafValidationError);
    });

    test('should throw error for null/undefined refresh token', async () => {
      await expect(client.refreshAccessToken(null as any)).rejects.toThrow(AnafValidationError);
      await expect(client.refreshAccessToken(undefined as any)).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Manual OAuth Flow', () => {
    test('should provide OAuth URL for manual authentication', async () => {
      console.log('\n🔗 MANUAL OAUTH AUTHENTICATION REQUIRED');
      console.log('=============================================');
      console.log('');
      console.log('📋 Instructions:');
      console.log('1. Make sure your USB token is connected');
      console.log('2. Browser will open automatically');
      console.log('3. Insert USB token and enter PIN when prompted');
      console.log('4. Authorize the application');
      console.log('5. The browser will redirect to localhost:4040/callback');
      console.log('6. The test will automatically capture the authorization code');
      console.log('');
      
      const authUrl = client.getAuthorizationUrl();
      
      console.log('🌐 OAuth Authorization URL:');
      console.log(authUrl);
      console.log('');
      console.log(`🔐 Callback server running on: http://localhost:${PORT}/callback`);
      console.log('');
      
      // Automatically open browser
      console.log('🌐 Opening browser automatically...');
      try {
        await open(authUrl);
        console.log('✅ Browser opened successfully');
      } catch (error) {
        console.log('⚠️ Failed to open browser automatically. Please copy the URL above.');
      }
      
      expect(authUrl).toBeTruthy();
      expect(authUrl).not.toContain('state='); // State should not be present
      expect(authUrl).toContain(`redirect_uri=http%3A//localhost%3A${PORT}/callback`);
    });

    test('should wait for and exchange authorization code', async () => {
      // Skip if we already have valid tokens
      const existingTokens = await loadTokens();
      if (existingTokens && existingTokens.refresh_token && !isTokenExpired(existingTokens)) {
        console.log('✅ Valid tokens already exist, skipping manual OAuth flow');
        return;
      }

      console.log('\n⏳ Waiting for OAuth authorization...');
      console.log('💡 Complete the OAuth flow in your browser to continue this test');
      
      // Create a promise that resolves when auth code is captured
      authCodePromise = new Promise<string>((resolve) => {
        authCodeResolve = resolve;
      });

      // Wait for auth code with timeout
      const timeoutMs = 120000; // 2 minutes
      let authCode: string;
      
      try {
        authCode = await Promise.race([
          authCodePromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('OAuth timeout')), timeoutMs)
          )
        ]);
      } catch (error) {
        console.log(error);
        throw error;
      }

      console.log('\n🔄 Exchanging authorization code for tokens...');
      
      try {
        const tokens = await client.exchangeCodeForToken(authCode);
        
        expect(tokens).toBeDefined();
        expect(tokens.access_token).toBeTruthy();
        expect(tokens.refresh_token).toBeTruthy();
        expect(tokens.expires_in).toBeGreaterThan(0);
        expect(tokens.token_type).toBe('Bearer');

        // Save tokens for future tests
        await saveTokens(tokens);
        
        console.log('✅ Token exchange successful!');
        console.log(`🔑 Access token: ${tokens.access_token.substring(0, 30)}...`);
        console.log(`🔄 Refresh token: ${tokens.refresh_token.substring(0, 30)}...`);
        console.log(`⏰ Expires in: ${tokens.expires_in} seconds (${Math.round(tokens.expires_in / 60)} minutes)`);
        console.log(`💾 Tokens saved to: ${tokenFilePath}`);
        
      } catch (error) {
        console.error(`❌ Token exchange failed: ${error}`);
        throw error;
      }
    }, 150000); // 2.5 minute timeout for Jest
  });

  describe('Token Refresh', () => {
    test('should refresh access token if tokens exist', async () => {
      const tokens = await loadTokens();
      
      if (!tokens || !tokens.refresh_token) {
        console.log('\n⚠️ SKIPPING: No refresh token found. Complete OAuth flow first.');
        return;
      }

      console.log('\n🔄 Testing token refresh...');
      
      try {
        const newTokens = await client.refreshAccessToken(tokens.refresh_token);
        
        expect(newTokens).toBeDefined();
        expect(newTokens.access_token).toBeTruthy();
        expect(newTokens.refresh_token).toBeTruthy();
        expect(newTokens.expires_in).toBeGreaterThan(0);
        expect(newTokens.token_type).toBe('Bearer');
        
        // Should be different from original
        expect(newTokens.access_token).not.toBe(tokens.access_token);
        
        // Save updated tokens
        await saveTokens(newTokens);
        
        console.log('✅ Token refresh successful!');
        console.log(`🔑 New access token: ${newTokens.access_token.substring(0, 30)}...`);
        console.log(`🔄 New refresh token: ${newTokens.refresh_token.substring(0, 30)}...`);
        console.log(`⏰ Expires in: ${newTokens.expires_in} seconds`);
        console.log(`💾 Updated tokens saved to: ${tokenFilePath}`);
        
      } catch (error) {
        console.error(`❌ Token refresh failed: ${error}`);
        
        throw error;
      }
    });
  });

  describe('Token Information', () => {
    test('should display token information if tokens exist', async () => {
      const tokens = await loadTokens();
      
      if (!tokens) {
        console.log('\n⚠️ No tokens found. Complete OAuth flow first.');
        return;
      }

      console.log('\n📊 Token Information:');
      console.log(`🔑 Access token: ${tokens.access_token.substring(0, 30)}...`);
      console.log(`🔄 Refresh token: ${tokens.refresh_token.substring(0, 30)}...`);
      console.log(`📊 Token type: ${tokens.token_type}`);
      console.log(`⏰ Expires in: ${tokens.expires_in} seconds`);
      
      if (tokens.obtained_at && tokens.expires_at) {
        const now = Date.now();
        const isExpired = now > tokens.expires_at;
        console.log(`🕐 Obtained at: ${new Date(tokens.obtained_at).toISOString()}`);
        console.log(`⏰ Expires at: ${new Date(tokens.expires_at).toISOString()}`);
        console.log(`📊 Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        
        if (!isExpired) {
          const timeLeft = Math.max(0, tokens.expires_at - now);
          console.log(`⏳ Time left: ${Math.round(timeLeft / 1000 / 60)} minutes`);
        }
      }

      // Try to decode JWT payload
      try {
        const payload = decodeJWT(tokens.access_token);
        console.log('\n📜 JWT Payload:');
        console.log(JSON.stringify(payload, null, 2));
      } catch (e) {
        console.log('\n⚠️ Could not decode JWT payload');
      }

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
    });
  });

  // Helper functions
  async function saveTokens(tokens: TokenResponse): Promise<void> {
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope,
      obtained_at: Date.now(),
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
    
    await fs.promises.writeFile(tokenFilePath, JSON.stringify(tokenData, null, 2));
  }

  async function loadTokens(): Promise<(TokenResponse & { obtained_at?: number; expires_at?: number }) | null> {
    try {
      const tokenData = await fs.promises.readFile(tokenFilePath, 'utf-8');
      return JSON.parse(tokenData);
    } catch (error) {
      return null;
    }
  }

  async function deleteTokens(): Promise<void> {
    try {
      await fs.promises.unlink(tokenFilePath);
      console.log('🗑️ Invalid tokens deleted');
    } catch (error) {
      // File doesn't exist, ignore
    }
  }

  function isTokenExpired(tokens: TokenResponse & { expires_at?: number }): boolean {
    if (!tokens.expires_at) return false;
    return Date.now() > tokens.expires_at;
  }

  function decodeJWT(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  }
}); 