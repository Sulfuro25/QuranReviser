# Security Documentation

## Security Measures Implemented

### 1. XSS (Cross-Site Scripting) Prevention

#### HTML Sanitization (`utils.js`)
- **`sanitizeHTML()`**: Escapes all HTML entities to prevent XSS attacks
- **`sanitizeTajweedHTML()`**: Whitelists only Tajweed-specific tags and classes for Quranic text
- **`escapeHTML()`**: Escapes dangerous characters in user input

#### Protected Areas
- ✅ API data (verse text, translations) sanitized before rendering
- ✅ User input (notes, bookmarks) escaped before storage/display
- ✅ Word-by-word tooltips sanitized
- ✅ Test mode answers and prompts sanitized

### 2. Input Validation

#### Validation Functions (`utils.js`)
- **`validateVerseKey()`**: Ensures verse keys match pattern `1-114:1-286`
- **`validatePageNumber()`**: Validates Mushaf page numbers (1-604)
- **`validateConfidenceLevel()`**: Whitelists only 'weak', 'ok', 'strong'

#### Protected Modules
- ✅ `confidence.js`: Validates verse keys and confidence levels
- ✅ `review.js`: Validates verse keys before marking seen
- ✅ `page-data.js`: Validates page numbers and sanitizes notes

### 3. OAuth Token Security (`auth.js`)

#### Token Management
- ✅ Token expiration tracking (1-hour validity)
- ✅ Automatic token expiration checks
- ✅ Auto-cleanup of near-expired tokens on page unload
- ✅ Proper token revocation on sign-out

#### Storage Security
- Tokens stored in `localStorage` (acceptable for OAuth tokens)
- Expiry time tracked to prevent stale token usage
- Tokens cleared if expired when checking auth status

### 4. Security Headers (`_headers`)

Applied to all pages:
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Browser-level XSS protection
- **Content-Security-Policy**: Restricts resource loading to trusted sources
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts browser features (geolocation, camera, etc.)
- **Strict-Transport-Security**: Enforces HTTPS connections

### 5. Content Security Policy (CSP)

Allows only:
- Scripts: Self, Google OAuth, APIs (quran.com)
- Styles: Self, Google Fonts (inline styles allowed for dynamic UI)
- Fonts: Self, Google Fonts
- Images: Self, data URIs, HTTPS sources
- Connect: Quran API, Google APIs
- Media: Quran audio sources
- Frames: Google OAuth only

## Potential Risks & Mitigations

### Low Risk
1. **localStorage for tokens**: Acceptable for OAuth 2.0 implicit flow (industry standard)
   - Mitigation: Token expiration, auto-cleanup
   
2. **Inline styles in CSP**: Required for dynamic UI generation
   - Mitigation: HTML sanitization, no user-controlled inline styles

### Handled Risks
1. ✅ **XSS via API data**: Sanitized with `sanitizeTajweedHTML()`
2. ✅ **XSS via user input**: All inputs escaped with `sanitizeHTML()`
3. ✅ **Clickjacking**: Blocked with `X-Frame-Options: DENY`
4. ✅ **Token theft**: Tokens expire and auto-cleanup implemented
5. ✅ **CSRF**: Not applicable (no state-changing operations without auth)

## Deployment Checklist

- [x] Security headers configured in `_headers` file
- [x] All user input sanitized before rendering
- [x] All API data sanitized before rendering
- [x] Input validation on critical functions
- [x] Token expiration tracking
- [x] CSP policy allows only necessary resources
- [x] HTTPS enforced (GitHub Pages default)

## Reporting Security Issues

If you discover a security vulnerability, please email the repository owner directly rather than opening a public issue.

## Security Best Practices for Users

1. **Sign out** when using shared computers
2. **Use HTTPS** - the site enforces this automatically
3. **Keep browser updated** for latest security patches
4. **Review Google OAuth permissions** before signing in

## Compliance

- ✅ OWASP Top 10 protections implemented
- ✅ Google OAuth 2.0 security guidelines followed
- ✅ Modern browser security features enabled
- ✅ Input validation on all user-facing inputs
