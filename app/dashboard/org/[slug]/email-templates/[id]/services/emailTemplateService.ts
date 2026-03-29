/**
 * EMAIL TEMPLATE EDITOR — SERVICE LAYER
 *
 * Wraps all API calls for the email template editor.
 * Centralises error handling and response normalisation.
 */

import { api } from "@/lib/api/client";
import { ok, fromThrown, type ApiResult } from "@/lib/api/result";
import { logger } from "@/lib/logger";

const svcLogger = logger.child({ service: "emailTemplate" });

export interface EmailTemplateData {
  id: string;
  name: string;
  email_subject?: string | null;
  body?: string | null;
  variables?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Load a single email template by id (from the full list, since no get-by-id endpoint exists).
 */
export async function loadEmailTemplate(templateId: string): Promise<ApiResult<EmailTemplateData>> {
  try {
    const list = await api.delivery.listTemplates();
    const template = list.find((t: EmailTemplateData) => t.id === templateId);
    if (!template) {
      return {
        ok: false,
        error: {
          category: "UPSTREAM",
          code: "UPSTREAM_NOT_FOUND",
          message: "Email template not found",
          context: { templateId },
        },
      };
    }
    return ok(template as EmailTemplateData);
  } catch (e) {
    return fromThrown(e, "Failed to load email template");
  }
}

/**
 * Save (update) an email template.
 */
export async function saveEmailTemplate(
  templateId: string,
  data: {
    name: string;
    email_subject?: string;
    body: string;
    variables: string[];
    is_default: boolean;
    is_active: boolean;
  },
): Promise<ApiResult<void>> {
  try {
    await api.delivery.updateTemplate(templateId, data);
    svcLogger.info("Email template saved", { templateId });
    return ok(undefined);
  } catch (e) {
    return fromThrown(e, "Failed to save email template");
  }
}

/**
 * Send a test email for the given template.
 */
export async function sendTestEmail(
  templateId: string,
  recipientEmail: string,
): Promise<ApiResult<void>> {
  try {
    await api.delivery.testSend({ test_email: recipientEmail, template_id: templateId });
    svcLogger.info("Test email sent", { templateId, to: recipientEmail });
    return ok(undefined);
  } catch (e) {
    return fromThrown(e, "Failed to send test email");
  }
}
