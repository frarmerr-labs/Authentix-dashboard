/**
 * Predefined email templates shipped with Authentix.
 * Users can select one of these as a starting point when creating a new template.
 */

export interface PredefinedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  email_subject: string;
  body: string;
  variables: string[];
  previewImage: string;
  accentColor: string;
  layout: string;
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    id: "predefined_showcase",
    name: "Course Completion",
    description: "Clean white design with Authentix green header — certificate takes center stage",
    category: "Education",
    email_subject: "🎓 Your Certificate — {{course_name}}",
    previewImage: "/email-templates/certificate-modern.avif",
    accentColor: "#3ECF8E",
    layout: "Header + Certificate + CTA",
    variables: ["recipient_name", "course_name", "organization_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #3ECF8E 0%, #1a9f6a 100%); padding: 44px 32px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; font-size: 30px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.5px;">
      Congratulations, {{recipient_name}}!
    </h1>
    <p style="color: rgba(255,255,255,0.88); font-size: 16px; margin: 0;">You've successfully completed <strong>{{course_name}}</strong></p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Hi <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 12px;">
      We are delighted to inform you that you have successfully completed <strong>{{course_name}}</strong>
      with <strong>{{organization_name}}</strong>. Your dedication and hard work throughout this program
      have been truly commendable.
    </p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 28px;">
      Your official certificate is ready — download it, share it, and wear it with pride.
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Course</p>
            <p style="font-size: 15px; font-weight: 600; color: #166534; margin: 0;">{{course_name}}</p>
          </td>
          <td style="padding: 4px 0; text-align: right;">
            <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Date Issued</p>
            <p style="font-size: 15px; font-weight: 600; color: #166534; margin: 0;">{{issue_date}}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: #3ECF8E; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px;">
      🎓 Share your achievement on LinkedIn and inspire others!
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_dark_premium",
    name: "Award & Recognition",
    description: "Bold dark navy design — glowing certificate, high-contrast typography",
    category: "Awards",
    email_subject: "🏆 Your Award Certificate — {{award_name}}",
    previewImage: "/email-templates/certificate-premium.avif",
    accentColor: "#0f172a",
    layout: "Dark full-bleed + Certificate glow",
    variables: ["recipient_name", "award_name", "organization_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 10px; overflow: hidden;">
  <div style="padding: 52px 32px 32px; text-align: center;">
    <p style="color: #3ECF8E; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px;">{{organization_name}}</p>
    <h1 style="color: #f8fafc; font-size: 34px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px; line-height: 1.2;">
      You've earned it,<br />{{recipient_name}}.
    </h1>
    <p style="color: #94a3b8; font-size: 16px; margin: 0;">{{award_name}}</p>
  </div>

  <div style="padding: 0 32px 48px;">
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.7; margin: 0 0 12px; text-align: center;">
      This certificate recognizes your outstanding performance, dedication, and the remarkable
      impact you have made within <strong style="color:#e2e8f0;">{{organization_name}}</strong>.
    </p>
    <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin: 0 0 28px; text-align: center;">
      We are truly proud to honor your achievement with the <strong style="color:#e2e8f0;">{{award_name}}</strong>.
    </p>

    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Award</p>
            <p style="font-size: 15px; font-weight: 600; color: #e2e8f0; margin: 0;">{{award_name}}</p>
          </td>
          <td style="padding: 4px 0; text-align: right;">
            <p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Issued On</p>
            <p style="font-size: 15px; font-weight: 600; color: #e2e8f0; margin: 0;">{{issue_date}}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 0 0 2px #3ECF8E, 0 8px 32px rgba(62,207,142,0.15);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=3ECF8E&amp;bgcolor=1e293b&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: #3ECF8E; color: #0f172a; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0 0 28px;">
      🎓 Share your achievement on LinkedIn and inspire your network!
    </p>

    <hr style="border: none; border-top: 1px solid #1e293b; margin: 0 0 20px;" />
    <p style="font-size: 12px; color: #475569; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_minimal_focus",
    name: "Simple & Clean",
    description: "Ultra clean, near-chromeless — the certificate is the entire hero",
    category: "General",
    email_subject: "Your Certificate from {{organization_name}}",
    previewImage: "/email-templates/certificate-classic.avif",
    accentColor: "#f8fafc",
    layout: "Certificate centered",
    variables: ["recipient_name", "organization_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 24px;">
  <p style="font-size: 16px; color: #374151; margin: 0 0 10px;">Hi <strong>{{recipient_name}}</strong>,</p>
  <p style="font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 8px;">
    Your certificate from <strong>{{organization_name}}</strong> is ready. We're glad to have you
    as part of our community and hope this recognition means as much to you as your contribution
    has meant to us.
  </p>
  <p style="font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 28px;">
    Issued on <strong>{{issue_date}}</strong>.
  </p>

  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 8px 4px; margin: 0 0 28px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Issued by</p>
          <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">{{organization_name}}</p>
        </td>
        <td style="padding: 12px 16px; text-align: right;">
          <p style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Date</p>
          <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">{{issue_date}}</p>
        </td>
      </tr>
    </table>
  </div>

  <div style="margin: 32px 0; text-align: center;">
    <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
  </div>

  <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
    <a href="{{verification_url}}" style="display: inline-block;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
    </a>
    <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="{{verification_url}}" style="display: inline-block; background: #111827; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
      View &amp; Verify Certificate
    </a>
  </div>

  <p style="font-size: 14px; color: #9ca3af; text-align: center; margin: 0 0 24px;">
    🎓 Share your achievement on LinkedIn and inspire others!
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
  <p style="font-size: 12px; color: #d1d5db; margin: 0; text-align: center;">
    © {{organization_name}} · Powered by Authentix
  </p>
</div>`,
  },

  {
    id: "predefined_golden_celebration",
    name: "Event Attendance",
    description: "Amber/gold gradient header, celebratory tone, LinkedIn share CTA",
    category: "Events",
    email_subject: "🎉 Your Certificate — {{event_name}}",
    previewImage: "/email-templates/certificate-elegant.avif",
    accentColor: "#f59e0b",
    layout: "Gradient header + Certificate frame + Share CTA",
    variables: ["recipient_name", "event_name", "event_date", "organization_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 48px 32px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 44px; margin-bottom: 14px;">🎉</div>
    <h1 style="color: #ffffff; font-size: 30px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px;">
      Congratulations, {{recipient_name}}!
    </h1>
    <p style="color: rgba(255,255,255,0.9); font-size: 15px; margin: 0;">{{event_name}} · {{event_date}}</p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Dear <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 12px;">
      It was an absolute pleasure having you join us at <strong>{{event_name}}</strong> on <strong>{{event_date}}</strong>.
      Your presence and participation made the event truly special, and we hope it was
      as memorable for you as it was for us.
    </p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 28px;">
      As a token of appreciation, here is your official certificate of attendance from
      <strong>{{organization_name}}</strong>:
    </p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <p style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Event</p>
            <p style="font-size: 15px; font-weight: 600; color: #78350f; margin: 0;">{{event_name}}</p>
          </td>
          <td style="padding: 4px 0; text-align: right;">
            <p style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Date</p>
            <p style="font-size: 15px; font-weight: 600; color: #78350f; margin: 0;">{{event_date}}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;border:3px solid #f59e0b;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: #f59e0b; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <div style="text-align: center; margin: 12px 0 24px;">
      <a href="https://www.linkedin.com/shareArticle" style="display: inline-block; background: #0077b5; color: #ffffff; font-size: 14px; font-weight: 600; padding: 11px 24px; border-radius: 8px; text-decoration: none;">
        🎓 Share your achievement on LinkedIn
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #fde68a; margin: 24px 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_corporate_blue",
    name: "Corporate Training",
    description: "Navy header, formal tone, org name top-right — built for enterprise",
    category: "Corporate",
    email_subject: "Training Completion Certificate — {{training_name}}",
    previewImage: "/email-templates/certificate-classic.avif",
    accentColor: "#1e3a5f",
    layout: "Navy header + Certificate card + Formal footer",
    variables: ["recipient_name", "training_name", "completion_date", "organization_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1e3a5f; padding: 28px 32px; border-radius: 10px 10px 0 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td>
          <p style="color: #7dd3fc; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;">Training Certificate</p>
        </td>
        <td style="text-align: right;">
          <p style="color: #93c5fd; font-size: 13px; font-weight: 600; margin: 0;">{{organization_name}}</p>
        </td>
      </tr>
    </table>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">Dear <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 12px;">
      This is to formally confirm that you have successfully completed the training program
      administered by <strong>{{organization_name}}</strong>. Your commitment to professional
      development is an asset to your team and organization.
    </p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 28px;">
      Please find your official certificate of completion below. This certificate may be used
      to demonstrate your competency and dedication.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 2px;">Training Program</p>
            <p style="font-size: 16px; font-weight: 700; color: #1e3a5f; margin: 0;">{{training_name}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 2px;">Completed On</p>
                  <p style="font-size: 14px; font-weight: 600; color: #1e3a5f; margin: 0;">{{completion_date}}</p>
                </td>
                <td style="text-align: right;">
                  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 2px;">Certificate Issued</p>
                  <p style="font-size: 14px; font-weight: 600; color: #1e3a5f; margin: 0;">{{issue_date}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center; background: #f8fafc; padding: 24px; border-radius: 8px;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: #1e3a5f; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px;">
      🎓 Share your achievement on LinkedIn and let your network know!
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_gradient_modern",
    name: "Membership Welcome",
    description: "Purple-to-indigo gradient bg, floating white card — sleek membership email",
    category: "Membership",
    email_subject: "Welcome — Your {{membership_type}} Certificate",
    previewImage: "/email-templates/certificate-premium.avif",
    accentColor: "#7c3aed",
    layout: "Gradient bg + Floating white card + Verify CTA",
    variables: ["recipient_name", "membership_type", "organization_name", "valid_until", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(160deg, #6d28d9 0%, #4f46e5 100%); padding: 40px 24px; border-radius: 12px;">
  <div style="background: #ffffff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);">
    <p style="font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #7c3aed; margin: 0 0 12px;">{{organization_name}}</p>
    <h1 style="font-size: 28px; font-weight: 700; color: #1e1b4b; margin: 0 0 10px; letter-spacing: -0.5px;">
      Welcome, {{recipient_name}}!
    </h1>
    <p style="font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 10px;">
      Your <strong style="color: #4f46e5;">{{membership_type}}</strong> membership with
      <strong style="color: #4f46e5;">{{organization_name}}</strong> has been confirmed.
      We're thrilled to have you as a valued member of our community.
    </p>
    <p style="font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 28px;">
      Your membership certificate is ready below — keep it as proof of your status
      and enjoy all the benefits that come with it through <strong>{{valid_until}}</strong>.
    </p>

    <div style="display: flex; gap: 16px; margin: 0 0 28px;">
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px 16px;">
        <p style="font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Membership</p>
        <p style="font-size: 14px; font-weight: 700; color: #1e1b4b; margin: 0;">{{membership_type}}</p>
      </div>
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px 16px;">
        <p style="font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Valid Until</p>
        <p style="font-size: 14px; font-weight: 700; color: #1e1b4b; margin: 0;">{{valid_until}}</p>
      </div>
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px 16px;">
        <p style="font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Issued On</p>
        <p style="font-size: 14px; font-weight: 700; color: #1e1b4b; margin: 0;">{{issue_date}}</p>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: linear-gradient(135deg, #6d28d9, #4f46e5); color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px;">
      🎓 Share your achievement on LinkedIn and let your network know!
    </p>

    <hr style="border: none; border-top: 1px solid #ede9fe; margin: 0 0 16px;" />
    <p style="font-size: 12px; color: #a78bfa; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  // ── 6 new templates ──────────────────────────────────────────────────────────

  {
    id: "predefined_name_only",
    name: "Name Only (Minimal)",
    description: "Bare-bones template — just the recipient name and org. Perfect for simple acknowledgements",
    category: "General",
    email_subject: "Your Certificate from {{organization_name}}",
    previewImage: "/email-templates/certificate-classic.avif",
    accentColor: "#6b7280",
    layout: "Single column minimal",
    variables: ["recipient_name", "organization_name", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="padding: 48px 40px 32px; text-align: center;">
    <p style="font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af; margin: 0 0 20px;">{{organization_name}}</p>
    <h1 style="font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px; letter-spacing: -0.5px;">
      {{recipient_name}}
    </h1>
    <p style="font-size: 15px; color: #6b7280; margin: 0 0 36px;">Your certificate is ready.</p>

    <div style="margin: 0 0 32px; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.08);" />
    </div>

    <a href="{{verification_url}}" style="display: inline-block; background: #111827; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin: 0 0 32px;">
      View &amp; Verify
    </a>
  </div>

  <div style="padding: 16px 40px; border-top: 1px solid #f3f4f6; text-align: center;">
    <p style="font-size: 11px; color: #d1d5db; margin: 0;">© {{organization_name}} · Powered by Authentix</p>
  </div>
</div>`,
  },

  {
    id: "predefined_qr_focus",
    name: "QR Verify Focus",
    description: "QR code front and center — designed for recipients who verify on mobile",
    category: "General",
    email_subject: "Verify Your Certificate — {{organization_name}}",
    previewImage: "/email-templates/certificate-modern.avif",
    accentColor: "#3ECF8E",
    layout: "QR centered + minimal text",
    variables: ["recipient_name", "organization_name", "issue_date", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="background: #f0fdf4; padding: 36px 40px 28px; text-align: center;">
    <p style="font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #3ECF8E; margin: 0 0 12px;">{{organization_name}}</p>
    <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 6px;">Hi {{recipient_name}},</h1>
    <p style="font-size: 15px; color: #4b5563; margin: 0;">Your certificate has been issued on <strong>{{issue_date}}</strong>.</p>
  </div>

  <div style="padding: 40px; text-align: center;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Scan the QR code below to instantly verify your certificate on any device.</p>

    <div style="display: inline-block; background: #f9fafb; border: 2px solid #3ECF8E; border-radius: 16px; padding: 24px;">
      <a href="{{verification_url}}" style="display: block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 180px; height: 180px; display: block; border-radius: 4px;" />
      </a>
    </div>

    <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 32px;">or click the button below</p>

    <a href="{{verification_url}}" style="display: inline-block; background: #3ECF8E; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 36px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
      Open Certificate
    </a>
  </div>

  <div style="padding: 16px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
    <p style="font-size: 11px; color: #d1d5db; margin: 0;">© {{organization_name}} · Powered by Authentix</p>
  </div>
</div>`,
  },

  {
    id: "predefined_all_fields",
    name: "All Fields",
    description: "Uses every available variable — great starting point when you need full control",
    category: "General",
    email_subject: "🎓 Your Certificate — {{course_name}} · {{organization_name}}",
    previewImage: "/email-templates/certificate-modern.avif",
    accentColor: "#3ECF8E",
    layout: "Full details + Certificate + QR + CTA",
    variables: [
      "recipient_name", "organization_name", "course_name", "issue_date",
      "event_name", "event_date", "award_name", "training_name",
      "membership_type", "valid_until", "completion_date",
      "certificate_image_url", "verification_url",
    ],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #3ECF8E 0%, #1a9f6a 100%); padding: 44px 32px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px;">
      Congratulations, {{recipient_name}}!
    </h1>
    <p style="color: rgba(255,255,255,0.88); font-size: 15px; margin: 0;">{{organization_name}}</p>
  </div>

  <div style="padding: 40px 32px 32px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Hi <strong>{{recipient_name}}</strong>,</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 28px;">
      This certificate captures the full record of your achievement. All relevant details are included below for your reference.
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 12px 6px 0; vertical-align: top; width: 50%;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Course</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{course_name}}</p>
          </td>
          <td style="padding: 6px 0 6px 12px; vertical-align: top; width: 50%;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Issue Date</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{issue_date}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Event</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{event_name}}</p>
          </td>
          <td style="padding: 6px 0 6px 12px; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Event Date</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{event_date}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Award</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{award_name}}</p>
          </td>
          <td style="padding: 6px 0 6px 12px; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Training</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{training_name}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Membership</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{membership_type}}</p>
          </td>
          <td style="padding: 6px 0 6px 12px; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Valid Until</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{valid_until}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; vertical-align: top;">
            <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Completed On</p>
            <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">{{completion_date}}</p>
          </td>
          <td style="padding: 6px 0 6px 12px; vertical-align: top;"></td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="display: inline-block; background: #3ECF8E; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px;">
      🎓 Share your achievement on LinkedIn and inspire others!
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_dark_slate",
    name: "Dark Slate",
    description: "Full dark slate background throughout — modern, sleek, high contrast",
    category: "General",
    email_subject: "Your Certificate is Ready — {{organization_name}}",
    previewImage: "/email-templates/certificate-premium.avif",
    accentColor: "#1e293b",
    layout: "Dark full-bleed + Certificate + CTA",
    variables: ["recipient_name", "organization_name", "course_name", "issue_date", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 10px; overflow: hidden;">
  <div style="padding: 48px 32px 24px; text-align: center; border-bottom: 1px solid #1e293b;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #3ECF8E; margin: 0 0 20px;">{{organization_name}}</p>
    <h1 style="color: #f1f5f9; font-size: 32px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px; line-height: 1.2;">
      {{recipient_name}}
    </h1>
    <p style="color: #94a3b8; font-size: 15px; margin: 0;">has completed <strong style="color: #e2e8f0;">{{course_name}}</strong></p>
  </div>

  <div style="padding: 32px 32px 0;">
    <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin: 0 0 28px; text-align: center;">
      Your certificate was issued on <strong style="color: #e2e8f0;">{{issue_date}}</strong>. Download it, share it, and keep it as a record of your achievement.
    </p>

    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px 20px; margin: 0 0 28px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Course</p>
        <p style="font-size: 15px; font-weight: 600; color: #e2e8f0; margin: 0;">{{course_name}}</p>
      </div>
      <div style="text-align: right;">
        <p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Issued</p>
        <p style="font-size: 15px; font-weight: 600; color: #e2e8f0; margin: 0;">{{issue_date}}</p>
      </div>
    </div>
  </div>

  <div style="padding: 0 32px 32px; text-align: center;">
    <div style="margin: 0 0 32px;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 0 0 1px #334155, 0 8px 32px rgba(0,0,0,0.4);" />
    </div>

    <div style="margin: 0 0 24px; padding: 20px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; text-align: center;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=e2e8f0&amp;bgcolor=1e293b&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #475569; margin: 8px 0 0;">Scan to verify authenticity</p>
    </div>

    <a href="{{verification_url}}" style="display: inline-block; background: #3ECF8E; color: #0f172a; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px; margin: 0 0 28px;">
      View &amp; Verify Certificate
    </a>

    <p style="font-size: 14px; color: #475569; text-align: center; margin: 0 0 28px;">
      🎓 Share your achievement on LinkedIn!
    </p>

    <hr style="border: none; border-top: 1px solid #1e293b; margin: 0 0 20px;" />
    <p style="font-size: 12px; color: #334155; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_event_attendance_v2",
    name: "Event Certificate",
    description: "Clean event-focused layout with event name and date as primary fields",
    category: "Events",
    email_subject: "Certificate of Attendance — {{event_name}}",
    previewImage: "/email-templates/certificate-elegant.avif",
    accentColor: "#0ea5e9",
    layout: "Sky blue header + Event details + Certificate",
    variables: ["recipient_name", "event_name", "event_date", "organization_name", "certificate_image_url", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 44px 32px; text-align: center;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,0.75); margin: 0 0 16px;">Certificate of Attendance</p>
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.5px;">
      {{recipient_name}}
    </h1>
    <p style="color: rgba(255,255,255,0.88); font-size: 15px; margin: 0;">attended <strong>{{event_name}}</strong></p>
  </div>

  <div style="padding: 36px 32px;">
    <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">
      Dear <strong>{{recipient_name}}</strong>, thank you for attending <strong>{{event_name}}</strong>. Please find your official certificate of attendance below.
    </p>

    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <p style="font-size: 12px; color: #075985; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Event</p>
            <p style="font-size: 15px; font-weight: 600; color: #0c4a6e; margin: 0;">{{event_name}}</p>
          </td>
          <td style="padding: 4px 0; text-align: right;">
            <p style="font-size: 12px; color: #075985; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Date</p>
            <p style="font-size: 15px; font-weight: 600; color: #0c4a6e; margin: 0;">{{event_date}}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px 0 0;">
            <p style="font-size: 12px; color: #075985; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">Organized by</p>
            <p style="font-size: 15px; font-weight: 600; color: #0c4a6e; margin: 0;">{{organization_name}}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 0 0 28px; text-align: center;">
      <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.10);" />
    </div>

    <div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to verify certificate authenticity</p>
    </div>

    <div style="text-align: center; margin: 0 0 28px;">
      <a href="{{verification_url}}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View &amp; Verify Certificate
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_welcome_member",
    name: "Welcome Member",
    description: "Warm, minimal welcome email for new members — no certificate image, just membership confirmation",
    category: "Membership",
    email_subject: "Welcome to {{organization_name}}, {{recipient_name}}!",
    previewImage: "/email-templates/certificate-premium.avif",
    accentColor: "#10b981",
    layout: "Warm welcome + Membership badge + Verify CTA",
    variables: ["recipient_name", "organization_name", "membership_type", "valid_until", "verification_url"],
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="background: #ecfdf5; padding: 48px 40px 36px; text-align: center; border-bottom: 1px solid #d1fae5;">
    <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 28px; line-height: 1;">✓</span>
    </div>
    <h1 style="font-size: 28px; font-weight: 700; color: #064e3b; margin: 0 0 8px; letter-spacing: -0.5px;">
      Welcome, {{recipient_name}}!
    </h1>
    <p style="font-size: 15px; color: #065f46; margin: 0;">You are now a member of <strong>{{organization_name}}</strong>.</p>
  </div>

  <div style="padding: 36px 40px;">
    <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin: 0 0 28px;">
      We're thrilled to welcome you as a <strong>{{membership_type}}</strong> member. Your membership is active and valid through <strong>{{valid_until}}</strong>. Your official membership certificate has been issued and is accessible via the link below.
    </p>

    <div style="background: #f0fdf4; border: 2px solid #6ee7b7; border-radius: 12px; padding: 24px; margin: 0 0 28px; text-align: center;">
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Your Membership</p>
      <p style="font-size: 24px; font-weight: 800; color: #064e3b; margin: 0 0 4px;">{{membership_type}}</p>
      <p style="font-size: 13px; color: #6b7280; margin: 0;">Valid through <strong style="color: #065f46;">{{valid_until}}</strong></p>
    </div>

    <div style="text-align: center; margin: 0 0 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <a href="{{verification_url}}" style="display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; display: inline-block; border-radius: 4px;" />
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Scan QR to view your membership certificate</p>
    </div>

    <div style="text-align: center; margin: 0 0 28px;">
      <a href="{{verification_url}}" style="display: inline-block; background: #10b981; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;">
        View My Certificate
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · Powered by Authentix
    </p>
  </div>
</div>`,
  },
];
