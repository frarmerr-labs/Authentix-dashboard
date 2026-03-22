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
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
`;

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    id: "predefined_completion",
    name: "Certificate of Completion",
    description: "Clean, professional email for course/program completion certificates",
    category: "Education",
    email_subject: "🎓 Your Certificate of Completion — {{course_name}}",
    variables: ["recipient_name", "course_name", "organization_name", "issue_date"],
    body: `<div style="${BASE_STYLE}">
  <div style="background: linear-gradient(135deg, #3ECF8E 0%, #1a9f6a 100%); padding: 40px 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
      Certificate of Completion
    </h1>
    <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">{{organization_name}}</p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Hi <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Congratulations! You have successfully completed <strong>{{course_name}}</strong>.
      Your certificate is attached to this email.
    </p>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Issued on</p>
      <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0;">{{issue_date}}</p>
    </div>

    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 32px;">
      Your certificate is attached as a PDF. You can also share or verify it using the
      unique verification link embedded in the QR code.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />

    <p style="font-size: 13px; color: #9ca3af; margin: 0; text-align: center;">
      © {{organization_name}} · All rights reserved
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_participation",
    name: "Certificate of Participation",
    description: "Warm, friendly email for event or workshop participation",
    category: "Events",
    email_subject: "Your Participation Certificate — {{event_name}}",
    variables: ["recipient_name", "event_name", "event_date", "organization_name"],
    body: `<div style="${BASE_STYLE}">
  <div style="background: #1e293b; padding: 40px 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #f8fafc; font-size: 26px; font-weight: 700; margin: 0;">Thank you for participating!</h1>
    <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">{{event_name}}</p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Dear <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      It was a pleasure having you at <strong>{{event_name}}</strong> on <strong>{{event_date}}</strong>.
      We hope you found it valuable and look forward to seeing you at future events.
    </p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Please find your Certificate of Participation attached to this email.
    </p>

    <div style="border-left: 3px solid #3ECF8E; padding: 12px 16px; background: #f0fdf4; border-radius: 0 6px 6px 0; margin: 0 0 32px;">
      <p style="font-size: 14px; color: #166534; margin: 0; font-style: italic;">
        "Your engagement makes the difference."
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />
    <p style="font-size: 13px; color: #9ca3af; margin: 0; text-align: center;">
      {{organization_name}}
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_achievement",
    name: "Achievement Award",
    description: "Bold, celebratory email for achievement or excellence awards",
    category: "Awards",
    email_subject: "🏆 Congratulations {{recipient_name}} — You've earned an award!",
    variables: ["recipient_name", "award_name", "organization_name", "issue_date"],
    body: `<div style="${BASE_STYLE}">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 48px 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="font-size: 48px; margin-bottom: 12px;">🏆</div>
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">You did it!</h1>
    <p style="color: rgba(255,255,255,0.9); font-size: 15px; margin: 8px 0 0;">{{award_name}}</p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; color: #374151; font-weight: 600; margin: 0 0 16px;">
      Congratulations, <span style="color: #d97706;">{{recipient_name}}</span>!
    </p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      We are thrilled to present you with the <strong>{{award_name}}</strong>.
      This recognition is a testament to your hard work and dedication.
    </p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Your certificate is attached — wear it with pride and share your achievement!
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />
    <p style="font-size: 13px; color: #9ca3af; margin: 0; text-align: center;">
      Issued {{issue_date}} · {{organization_name}}
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_training",
    name: "Training Completion",
    description: "Professional email for corporate training and certification programs",
    category: "Corporate",
    email_subject: "Training Completion — {{training_name}}",
    variables: ["recipient_name", "training_name", "organization_name", "completion_date"],
    body: `<div style="${BASE_STYLE}">
  <div style="background: #0f172a; padding: 32px; border-radius: 8px 8px 0 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td>
          <p style="color: #3ECF8E; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;">{{organization_name}}</p>
        </td>
        <td style="text-align: right;">
          <p style="color: #475569; font-size: 13px; margin: 0;">Training Certificate</p>
        </td>
      </tr>
    </table>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">Dear <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
      This is to confirm that you have successfully completed the following training program:
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 6px;">Program</p>
      <p style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">{{training_name}}</p>
      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 6px;">Completed on</p>
      <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">{{completion_date}}</p>
    </div>

    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 32px;">
      Your certificate of training completion is attached to this email as a PDF document.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 20px;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      This is an automated message from {{organization_name}}. Please do not reply to this email.
    </p>
  </div>
</div>`,
  },

  {
    id: "predefined_membership",
    name: "Membership Certificate",
    description: "Elegant email for membership or accreditation certificates",
    category: "Membership",
    email_subject: "Welcome — Your Membership Certificate",
    variables: ["recipient_name", "membership_type", "organization_name", "valid_until"],
    body: `<div style="${BASE_STYLE}">
  <div style="background: linear-gradient(180deg, #4f46e5 0%, #6366f1 100%); padding: 40px 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; font-size: 26px; font-weight: 700; margin: 0;">Welcome to {{organization_name}}</h1>
    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">Membership Confirmed</p>
  </div>

  <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Dear <strong>{{recipient_name}}</strong>,</p>

    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      We are pleased to confirm your <strong>{{membership_type}}</strong> membership with
      <strong>{{organization_name}}</strong>. Your certificate is attached to this email.
    </p>

    <div style="display: flex; gap: 16px; margin: 0 0 24px;">
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px;">
        <p style="font-size: 12px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Membership Type</p>
        <p style="font-size: 15px; font-weight: 700; color: #1e1b4b; margin: 0;">{{membership_type}}</p>
      </div>
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px;">
        <p style="font-size: 12px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Valid Until</p>
        <p style="font-size: 15px; font-weight: 700; color: #1e1b4b; margin: 0;">{{valid_until}}</p>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />
    <p style="font-size: 13px; color: #9ca3af; margin: 0; text-align: center;">{{organization_name}}</p>
  </div>
</div>`,
  },

  {
    id: "predefined_minimal",
    name: "Minimal Clean",
    description: "Ultra-minimal, distraction-free certificate delivery email",
    category: "General",
    email_subject: "Your Certificate from {{organization_name}}",
    variables: ["recipient_name", "organization_name"],
    body: `<div style="${BASE_STYLE} padding: 48px 32px;">
  <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">Hi <strong>{{recipient_name}}</strong>,</p>

  <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
    Please find your certificate from <strong>{{organization_name}}</strong> attached to this email.
  </p>

  <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 32px;">
    The certificate includes a QR code that can be used to verify its authenticity.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />
  <p style="font-size: 13px; color: #9ca3af; margin: 0;">
    — {{organization_name}}
  </p>
</div>`,
  },
];
