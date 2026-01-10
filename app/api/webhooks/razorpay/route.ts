/**
 * RAZORPAY WEBHOOK HANDLER
 *
 * Production-grade webhook endpoint that:
 * 1. Verifies Razorpay webhook signatures (HMAC SHA256)
 * 2. Stores ALL events immutably in razorpay_events table
 * 3. Processes only billing-critical events
 * 4. Enforces environment isolation (test vs prod)
 * 5. Idempotent and replay-safe
 *
 * CRITICAL: This runs server-side only. Never expose secrets to browser.
 *
 * Reference: https://razorpay.com/docs/webhooks/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  verifyWebhookSignature,
  getWebhookSecret,
  validateWebhookPayload,
  extractEntityDetails,
  resolveCompanyId,
  resolveInvoiceId,
  isBillingCriticalEvent,
  extractAmountDetails,
} from '@/lib/razorpay/webhook-verification';
import {
  assertProductionOnly,
  getSafetyFlags,
  warnUnsafeOperation,
  logEnvironmentAction,
  EnvironmentGuardError,
} from '@/lib/utils/guards';
import { getRuntimeEnvironment } from '@/lib/utils/environment';

/**
 * POST /api/webhooks/razorpay
 *
 * Accepts webhook events from Razorpay.
 * Returns 200 OK for all validly signed events.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Step 1: Environment guard - Only allow in production
    assertProductionOnly('webhook:razorpay');

    // Step 2: Check safety flag
    const flags = getSafetyFlags();
    if (!flags.ALLOW_EXTERNAL_WEBHOOKS) {
      warnUnsafeOperation(
        'webhook:razorpay',
        'Webhook received but ALLOW_EXTERNAL_WEBHOOKS is disabled'
      );

      return NextResponse.json(
        {
          received: false,
          reason: 'webhooks_disabled',
          message: 'ALLOW_EXTERNAL_WEBHOOKS flag must be enabled',
        },
        { status: 503 }
      );
    }

    // Step 3: Extract raw payload and signature
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('[Razorpay Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 401 }
      );
    }

    // Step 4: Determine environment and get webhook secret
    const currentEnv = getRuntimeEnvironment();
    const webhookSecret = getWebhookSecret(
      currentEnv === 'prod' ? 'prod' : 'test'
    );

    if (!webhookSecret) {
      console.error(
        `[Razorpay Webhook] Webhook secret not configured for environment: ${currentEnv}`
      );
      return NextResponse.json(
        {
          error: 'Webhook secret not configured',
          environment: currentEnv,
        },
        { status: 500 }
      );
    }

    // Step 5: Verify webhook signature
    const isValidSignature = verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      console.error('[Razorpay Webhook] Invalid signature');
      warnUnsafeOperation(
        'webhook:razorpay:signature_failed',
        'Received webhook with invalid signature',
        { signatureLength: signature.length }
      );

      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Step 6: Parse and validate payload structure
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('[Razorpay Webhook] Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const validation = validateWebhookPayload(payload);
    if (!validation.valid) {
      console.error('[Razorpay Webhook] Invalid payload structure:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Step 7: Extract event details
    const eventType = payload.event;
    const razorpayEventId = payload.payload?.payment?.entity?.id ||
                            payload.payload?.invoice?.entity?.id ||
                            payload.payload?.refund?.entity?.id ||
                            payload.payload?.order?.entity?.id ||
                            null;

    const { entityType, entityId, entity } = extractEntityDetails(payload);
    const companyId = resolveCompanyId(payload);
    const invoiceId = resolveInvoiceId(payload);

    // Step 8: Log the webhook receipt
    logEnvironmentAction('webhook:razorpay:received', {
      eventType,
      razorpayEventId,
      entityType,
      entityId,
      companyId,
      invoiceId,
      environment: currentEnv,
    });

    // Step 9: Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 10: Check for idempotency (has this event been stored before?)
    if (razorpayEventId) {
      const { data: existingEvent, error: checkError } = await supabase
        .from('razorpay_events')
        .select('id, processed')
        .eq('razorpay_event_id', razorpayEventId)
        .single();

      if (existingEvent) {
        // Event already stored - this is a replay/retry
        console.log(
          `[Razorpay Webhook] Duplicate event detected (idempotency): ${razorpayEventId}`
        );

        return NextResponse.json({
          received: true,
          duplicate: true,
          razorpay_event_id: razorpayEventId,
          previously_processed: existingEvent.processed,
        });
      }
    }

    // Step 11: Store event in razorpay_events table (ALL events stored immutably)
    const { data: storedEvent, error: storeError } = await supabase
      .from('razorpay_events')
      .insert({
        event_type: eventType,
        razorpay_event_id: razorpayEventId,
        payload: payload,
        entity_type: entityType,
        entity_id: entityId,
        company_id: companyId,
        invoice_id: invoiceId,
        processed: false,
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (storeError) {
      console.error('[Razorpay Webhook] Failed to store event:', storeError);
      return NextResponse.json(
        {
          error: 'Failed to store event',
          details: storeError.message,
        },
        { status: 500 }
      );
    }

    const eventDbId = storedEvent.id;

    console.log(
      `[Razorpay Webhook] Event stored successfully: ${eventType} (DB ID: ${eventDbId})`
    );

    // Step 12: Determine if this event requires processing
    const isCritical = isBillingCriticalEvent(eventType);

    if (!isCritical) {
      // Non-critical event - just store and acknowledge
      console.log(
        `[Razorpay Webhook] Non-critical event, stored only: ${eventType}`
      );

      return NextResponse.json({
        received: true,
        stored: true,
        event_db_id: eventDbId,
        processed: false,
        reason: 'non_critical_event',
      });
    }

    // Step 13: Process billing-critical events
    console.log(
      `[Razorpay Webhook] Processing critical event: ${eventType}`
    );

    let processingResult: any = null;

    try {
      processingResult = await processBillingCriticalEvent(
        supabase,
        eventType,
        entity,
        companyId,
        invoiceId
      );

      // Step 14: Mark event as processed
      const { error: updateError } = await supabase
        .from('razorpay_events')
        .update({ processed: true })
        .eq('id', eventDbId);

      if (updateError) {
        console.error(
          '[Razorpay Webhook] Failed to mark event as processed:',
          updateError
        );
        // Don't fail the request - event was processed successfully
      }

      const duration = Date.now() - startTime;

      console.log(
        `[Razorpay Webhook] Event processed successfully in ${duration}ms: ${eventType}`
      );

      return NextResponse.json({
        received: true,
        stored: true,
        processed: true,
        event_db_id: eventDbId,
        event_type: eventType,
        processing_result: processingResult,
        duration_ms: duration,
      });
    } catch (processingError: any) {
      console.error(
        '[Razorpay Webhook] Event processing failed:',
        processingError
      );

      // Store the error but still return 200 (Razorpay should not retry on our processing failures)
      await supabase
        .from('razorpay_events')
        .update({
          processed: false,
          // Note: If you add an errors column later, store the error here
        })
        .eq('id', eventDbId);

      return NextResponse.json({
        received: true,
        stored: true,
        processed: false,
        event_db_id: eventDbId,
        error: 'Processing failed',
        details: processingError.message,
      });
    }
  } catch (error: any) {
    console.error('[Razorpay Webhook] Unexpected error:', error);

    // Handle environment guard errors
    if (error instanceof EnvironmentGuardError) {
      return NextResponse.json(
        {
          error: 'Environment guard violation',
          message: error.message,
        },
        { status: 403 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Process billing-critical events
 *
 * Updates invoice state based on Razorpay event type.
 *
 * @param supabase - Supabase client
 * @param eventType - Razorpay event type (e.g., "invoice.paid")
 * @param entity - Razorpay entity (invoice, payment, refund)
 * @param companyId - Company UUID
 * @param invoiceId - Invoice UUID
 * @returns Processing result
 */
async function processBillingCriticalEvent(
  supabase: any,
  eventType: string,
  entity: any,
  companyId: string | null,
  invoiceId: string | null
): Promise<any> {
  // Validate we have required IDs
  if (!companyId) {
    throw new Error('Cannot process event: company_id not found in metadata');
  }

  if (!invoiceId && eventType.startsWith('invoice.')) {
    throw new Error('Cannot process invoice event: invoice_id not found');
  }

  const { amount, currency, fee, tax } = extractAmountDetails(entity);

  switch (eventType) {
    case 'invoice.paid':
      // Update invoice to paid status
      console.log(`[Razorpay Webhook] Processing invoice.paid for invoice ${invoiceId}`);

      const { error: paidError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          razorpay_status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId); // Safety: ensure company owns this invoice

      if (paidError) {
        throw new Error(`Failed to update invoice: ${paidError.message}`);
      }

      return { action: 'invoice_marked_paid', invoice_id: invoiceId };

    case 'invoice.expired':
      // Mark invoice as overdue
      console.log(`[Razorpay Webhook] Processing invoice.expired for invoice ${invoiceId}`);

      const { error: expiredError } = await supabase
        .from('invoices')
        .update({
          status: 'overdue',
          razorpay_status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId);

      if (expiredError) {
        throw new Error(`Failed to update invoice: ${expiredError.message}`);
      }

      return { action: 'invoice_marked_overdue', invoice_id: invoiceId };

    case 'invoice.cancelled':
      // Cancel invoice
      console.log(`[Razorpay Webhook] Processing invoice.cancelled for invoice ${invoiceId}`);

      const { error: cancelError } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          razorpay_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId);

      if (cancelError) {
        throw new Error(`Failed to update invoice: ${cancelError.message}`);
      }

      return { action: 'invoice_cancelled', invoice_id: invoiceId };

    case 'invoice.partially_paid':
      // Update invoice to partially paid
      console.log(`[Razorpay Webhook] Processing invoice.partially_paid for invoice ${invoiceId}`);

      const { error: partialError } = await supabase
        .from('invoices')
        .update({
          razorpay_status: 'partially_paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId);

      if (partialError) {
        throw new Error(`Failed to update invoice: ${partialError.message}`);
      }

      return { action: 'invoice_marked_partially_paid', invoice_id: invoiceId };

    case 'payment.captured':
      // Link payment to invoice (if invoice_id present)
      console.log(`[Razorpay Webhook] Processing payment.captured`);

      if (invoiceId) {
        // Update invoice with payment reference
        const { error: paymentError } = await supabase
          .from('invoices')
          .update({
            razorpay_payment_id: entity.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId)
          .eq('company_id', companyId);

        if (paymentError) {
          throw new Error(`Failed to link payment: ${paymentError.message}`);
        }

        return {
          action: 'payment_linked_to_invoice',
          payment_id: entity.id,
          invoice_id: invoiceId,
          amount,
          currency,
        };
      } else {
        // Standalone payment (not linked to invoice)
        console.warn('[Razorpay Webhook] payment.captured without invoice_id');
        return {
          action: 'payment_captured_standalone',
          payment_id: entity.id,
          amount,
          currency,
        };
      }

    case 'payment.failed':
      // Log payment failure (no invoice update needed)
      console.log(`[Razorpay Webhook] Processing payment.failed`);

      return {
        action: 'payment_failed_logged',
        payment_id: entity.id,
        reason: entity.error_description || 'Unknown',
      };

    case 'refund.processed':
      // Mark invoice as refunded
      console.log(`[Razorpay Webhook] Processing refund.processed for invoice ${invoiceId}`);

      if (invoiceId) {
        const { error: refundError } = await supabase
          .from('invoices')
          .update({
            status: 'refunded',
            razorpay_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId)
          .eq('company_id', companyId);

        if (refundError) {
          throw new Error(`Failed to update invoice: ${refundError.message}`);
        }

        return {
          action: 'invoice_marked_refunded',
          invoice_id: invoiceId,
          refund_id: entity.id,
          amount,
          currency,
        };
      } else {
        return {
          action: 'refund_processed_standalone',
          refund_id: entity.id,
          amount,
          currency,
        };
      }

    case 'invoice.created':
    case 'invoice.issued':
      // Just log these - invoice already exists in our system
      console.log(`[Razorpay Webhook] Event ${eventType} logged (no action needed)`);
      return { action: 'logged_only', event_type: eventType };

    default:
      console.warn(`[Razorpay Webhook] Unknown critical event type: ${eventType}`);
      return { action: 'unknown_event_type', event_type: eventType };
  }
}
