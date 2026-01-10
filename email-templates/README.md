# Email Templates

This directory contains HTML email templates for MineCertificate.

## Verification Email Template

The `verification-email.html` file is a beautiful, responsive HTML email template for user email verification.

### How to Use in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **Email Templates**

2. **Customize the Confirmation Email**
   - Select "Confirm signup" template
   - Copy the contents of `verification-email.html`
   - Paste it into the email template editor
   - Replace `{{ .ConfirmationURL }}` with `{{ .ConfirmationURL }}` (Supabase uses Go template syntax)

3. **Supabase Template Variables**
   - `{{ .ConfirmationURL }}` - The verification link
   - `{{ .Token }}` - The verification token (if using OTP)
   - `{{ .Email }}` - User's email address
   - `{{ .SiteURL }}` - Your site URL

### Template Features

- ✅ Fully responsive design
- ✅ Modern gradient header
- ✅ Clear call-to-action button
- ✅ Step-by-step instructions
- ✅ Fallback link for button issues
- ✅ Security note
- ✅ Professional footer
- ✅ Mobile-friendly

### Customization

You can customize:
- Colors: Change `#ff5400` to your brand color
- Logo: Add your logo in the header
- Content: Modify the text to match your brand voice
- Styling: Adjust spacing, fonts, and layout

### Testing

Before deploying:
1. Test the email in different email clients (Gmail, Outlook, Apple Mail)
2. Test on mobile devices
3. Verify all links work correctly
4. Check that the template renders correctly in dark mode (if applicable)
