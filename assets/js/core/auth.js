/**
 * Google Authentication Module for Quran Reviser
 * Handles Google Sign-In and token management
 */

(function() {
  'use strict';

  // Your Google OAuth Client ID
  // To get one: https://console.cloud.google.com/apis/credentials
  const CLIENT_ID = '459121148063-mtbt0jt72pu2qghc0c4um2t6m2krnqmv.apps.googleusercontent.com';
  
  const SCOPES = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata';
  
  const TOKEN_EXPIRY_KEY = 'qr_google_token_expiry';
  const TOKEN_DURATION_MS = 3600000; // 1 hour (Google tokens typically expire after 1 hour)
  
  let tokenClient;
  let accessToken = null;
  let userInfo = null;

  // Check if token is expired
  function isTokenExpired() {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    return Date.now() > parseInt(expiryTime, 10);
  }

  // Clear expired tokens
  function clearExpiredToken() {
    if (isTokenExpired()) {
      accessToken = null;
      userInfo = null;
      localStorage.removeItem('qr_google_token');
      localStorage.removeItem('qr_google_user');
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return true;
    }
    return false;
  }

  // Initialize Google Identity Services
  function initGoogleAuth() {
    return new Promise((resolve, reject) => {
      // Wait for google to be available
      const checkGoogle = () => {
        if (typeof google === 'undefined' || !google.accounts) {
          setTimeout(checkGoogle, 100);
          return;
        }

        try {
          // Initialize token client
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
              if (response.error) {
                console.error('Google auth error:', response);
                reject(new Error(response.error));
                return;
              }
              accessToken = response.access_token;
              getUserInfo().then(resolve).catch(reject);
            },
          });
          
          // Check if we have a saved token
          const savedToken = localStorage.getItem('qr_google_token');
          const savedUser = localStorage.getItem('qr_google_user');
          
          if (savedToken && savedUser) {
            // Check if token is expired
            if (clearExpiredToken()) {
              resolve(null);
            } else {
              accessToken = savedToken;
              userInfo = JSON.parse(savedUser);
              resolve(userInfo);
            }
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkGoogle();
    });
  }

  // Request access token
  function requestAccessToken() {
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject(new Error('Google auth not initialized'));
        return;
      }

      tokenClient.callback = async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        
        accessToken = response.access_token;
        localStorage.setItem('qr_google_token', accessToken);
        // Set token expiry time
        const expiryTime = Date.now() + TOKEN_DURATION_MS;
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
        
        try {
          const user = await getUserInfo();
          resolve(user);
        } catch (error) {
          reject(error);
        }
      };

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  // Get user info from Google
  async function getUserInfo() {
    if (!accessToken) {
      throw new Error('No access token');
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      userInfo = await response.json();
      localStorage.setItem('qr_google_user', JSON.stringify(userInfo));
      
      return userInfo;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  // Sign in
  async function signIn() {
    try {
      // Initialize if not already done
      if (!tokenClient) {
        await initGoogleAuth();
      }
      
      // Request token
      const user = await requestAccessToken();
      
      // Notify listeners
      if (window.QR && window.QR.events) {
        window.QR.events.trigger('auth:signedIn', user);
      }
      
      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  // Sign out
  function signOut() {
    accessToken = null;
    userInfo = null;
    localStorage.removeItem('qr_google_token');
    localStorage.removeItem('qr_google_user');
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    
    if (window.google && google.accounts.oauth2 && accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked');
      });
    }
    
    if (window.QR && window.QR.events) {
      window.QR.events.trigger('auth:signedOut');
    }
  }

  // Check if signed in (and token not expired)
  function isSignedIn() {
    if (!accessToken || !userInfo) return false;
    if (clearExpiredToken()) return false;
    return true;
  }

  // Get current user
  function getCurrentUser() {
    return userInfo;
  }

  // Get access token
  function getAccessToken() {
    return accessToken;
  }

  // Upload data to Google Drive AppData
  async function uploadToGoogleDrive(fileName, data) {
    if (!accessToken) {
      throw new Error('Not signed in');
    }

    try {
      // Create file metadata
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: ['appDataFolder']
      };

      // Create multipart request body
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        throw new Error('Failed to upload to Google Drive');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  // Download data from Google Drive AppData
  async function downloadFromGoogleDrive(fileName) {
    if (!accessToken) {
      throw new Error('Not signed in');
    }

    try {
      // Search for file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and 'appDataFolder' in parents&spaces=appDataFolder`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error('Failed to search Google Drive');
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.files || searchData.files.length === 0) {
        return null; // File not found
      }

      const fileId = searchData.files[0].id;

      // Download file content
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!downloadResponse.ok) {
        throw new Error('Failed to download from Google Drive');
      }

      return await downloadResponse.json();
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      throw error;
    }
  }

  // Simple event system for auth events
  const events = {
    listeners: {},
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },
    trigger(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(data));
      }
    }
  };

  // Initialize on load
  window.addEventListener('load', () => {
    initGoogleAuth().catch(err => {
      console.log('Google auth init skipped:', err.message);
    });
  });

  // Auto-cleanup tokens on page unload for security
  window.addEventListener('beforeunload', () => {
    // Check if token will expire soon (within 5 minutes)
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiryTime) {
      const timeRemaining = parseInt(expiryTime, 10) - Date.now();
      if (timeRemaining < 300000) { // Less than 5 minutes
        // Clear token to force re-authentication next session
        localStorage.removeItem('qr_google_token');
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
      }
    }
  });

  // Export to global namespace
  window.QR = window.QR || {};
  window.QR.auth = {
    signIn,
    signOut,
    isSignedIn,
    getCurrentUser,
    getAccessToken,
    uploadToGoogleDrive,
    downloadFromGoogleDrive,
    CLIENT_ID // Expose for checking if configured
  };
  window.QR.events = events;

})();
