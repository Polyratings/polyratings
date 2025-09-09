# Authentication Flow Test Plan

## Testing the New Cookie-Based Authentication

### Manual Testing Steps:

1. **Login Flow:**
   - Navigate to `/login`
   - Enter credentials (local dev: username: `local`, password: `password`)
   - Verify cookies are set in browser dev tools:
     - `accessToken` (expires in 15 minutes)
     - `refreshToken` (expires in 7 days)
   - Verify redirect to `/admin`

2. **Authentication State:**
   - Check that navbar shows "Admin" and "Sign Out" buttons
   - Navigate to protected routes (should work automatically)

3. **Token Refresh:**
   - Wait for access token to expire (or manually delete it from cookies)
   - Make an authenticated request
   - Verify new access token is automatically set

4. **Logout Flow:**
   - Click "Sign Out" button
   - Verify both cookies are cleared
   - Verify redirect and UI updates

### Development Testing:

```bash
# Start backend development server
cd packages/backend
npm run start:local

# Start frontend development server  
cd packages/frontend
npm run start:local
```

### Key Security Features Implemented:

- **HttpOnly:** Cookies cannot be accessed via JavaScript (prevents XSS)
- **Secure:** Cookies only sent over HTTPS in production
- **SameSite=Strict:** Prevents CSRF attacks
- **Short-lived access tokens:** 15-minute expiry reduces exposure
- **Long-lived refresh tokens:** 7-day expiry maintains user sessions
- **Automatic refresh:** Frontend automatically gets new access tokens
- **Secure logout:** Both tokens cleared on logout

### Backwards Compatibility:

The system maintains backwards compatibility by:
- Supporting both cookie and header-based authentication
- Existing JWT structure remains the same (with optional `type` field)
- Legacy endpoints continue to work during transition