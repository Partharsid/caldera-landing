import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import * as crypto from 'crypto';
import {
  appendRowToSheet,
  getServiceNamesFromItems,
  createCalendarEvent,
  type SlotData,
  type CustomerData
} from '@/lib/google';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Razorpay-Signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const { event, payload: razorpayPayload } = payload;

    // Handle payment captured event
    if (event === 'payment.captured') {
      const payment = razorpayPayload.payment.entity;

      // Find transaction by razorpay_order_id (we should store this when creating order)
      const { data: transactions, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('razorpay_order_id', payment.order_id);

      if (error) {
        console.error('Error finding transaction:', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }

      let transaction: any = null;

      if (transactions && transactions.length > 0) {
        transaction = transactions[0];
        
        // If already paid (processed by client action), just return success
        if (transaction.status === 'paid') {
          return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
        }

        // Update transaction with payment ID and mark as paid
        const { error: updateError } = await supabaseAdmin
          .from('transactions')
          .update({
            razorpay_payment_id: payment.id,
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        if (updateError) {
          console.error('Error updating transaction:', updateError);
          return NextResponse.json(
            { error: 'Database update error' },
            { status: 500 }
          );
        }
      } else {
        // Create transaction from webhook if it doesn't exist
        const notes = payment.notes || {};
        if (notes.source === 'rr-downtown-arcade-championship') {
          // Championship registration payment
          const participantId = notes.participantId;
          const championshipId = notes.championshipId;
          
          if (participantId) {
            const { error: updateErr } = await supabaseAdmin
              .from('championship_participants')
              .update({
                payment_status: 'paid',
                razorpay_payment_id: payment.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', participantId);

            if (!updateErr) {
              // Increment participant count
              const { data: champ } = await supabaseAdmin
                .from('championships')
                .select('current_participants')
                .eq('id', championshipId)
                .single();

              if (champ) {
                await supabaseAdmin
                  .from('championships')
                  .update({ current_participants: (champ.current_participants || 0) + 1 })
                  .eq('id', championshipId);
              }
            }

            return NextResponse.json({ success: true, message: 'Championship payment processed' }, { status: 200 });
          }
        } else if (notes.source === 'rr-downtown-arcade-booking' && notes.slotId) {
          const { data: slot } = await supabaseAdmin
            .from('slots')
            .select('*, service:services(*)')
            .eq('id', notes.slotId)
            .single();

          if (slot) {
            const service = Array.isArray(slot.service) ? slot.service[0] : slot.service;
            const amountInRupees = payment.amount / 100;

            const transactionData = {
              amount: amountInRupees,
              payment_method: "razorpay",
              status: "paid",
              customer_name: notes.customerName || '',
              customer_phone: notes.customerPhone || '',
              razorpay_payment_id: payment.id,
              razorpay_order_id: payment.order_id,
              items_json: [
                {
                  type: "service",
                  id: slot.id,
                  name: service?.name || 'Unknown Service',
                  quantity: 1,
                  price: amountInRupees,
                  metadata: {
                    service,
                    slot: { start_time: slot.start_time, end_time: slot.end_time },
                    ...(notes.couponCode && {
                      coupon: { code: notes.couponCode }
                    })
                  },
                },
              ],
            };

            const { data: newTx, error: txError } = await supabaseAdmin
              .from('transactions')
              .insert([transactionData])
              .select()
              .single();

            if (!txError && newTx) {
              transaction = newTx;
            } else {
              console.error('Failed to create transaction from webhook:', txError);
            }
          }
        } else {
          console.log('Payment captured but notes missing slot info, ignoring');
          return NextResponse.json({ success: true }, { status: 200 });
        }
      }

      if (transaction) {
        // Update slot status if service booking exists
        const itemsJson = transaction.items_json;
        if (itemsJson && Array.isArray(itemsJson)) {
          const serviceItems = itemsJson.filter((item: any) => item.type === 'service');
          for (const item of serviceItems) {
            if (item.metadata?.slot) {
              await supabaseAdmin
                .from('slots')
                .update({ status: 'booked', updated_at: new Date().toISOString() })
                .eq('id', item.id);
            }
          }
        }

        // Log booking to Google Sheet (async, failures don't block response)
        try {
          const serviceBooked = getServiceNamesFromItems(itemsJson);
          const bookingData = {
            dateTime: new Date(transaction.created_at).toLocaleString('en-IN'),
            customerName: transaction.customer_name || '—',
            phoneNumber: transaction.customer_phone || '—',
            serviceBooked,
            amountPaid: Number(transaction.amount),
            paymentMethod: transaction.payment_method,
          };
          await appendRowToSheet(bookingData);
          console.log('Booking logged to Google Sheet successfully');
        } catch (error) {
          console.error('Failed to log booking to Google Sheet:', error);
          // Continue - don't fail the webhook if Google Sheets fails
        }

        // Create calendar events for each service booking
        if (itemsJson && Array.isArray(itemsJson)) {
          const serviceItems = itemsJson.filter(item => item.type === 'service');
          for (const item of serviceItems) {
            if (item.metadata?.slot) {
              try {
                const slotData: SlotData = {
                  serviceName: item.name,
                  startTime: item.metadata.slot.start_time,
                  endTime: item.metadata.slot.end_time,
                  slotId: item.id,
                };
                const customerData: CustomerData = {
                  customerName: transaction.customer_name || '—',
                  phoneNumber: transaction.customer_phone || '—',
                  amountPaid: Number(transaction.amount),
                  transactionId: transaction.id,
                };
                await createCalendarEvent(slotData, customerData);
                console.log(`Calendar event created for ${item.name}`);
              } catch (error) {
                console.error(`Failed to create calendar event for ${item.name}:`, error);
                // Continue - don't fail the webhook if calendar creation fails
              }
            }
          }
        }

        return NextResponse.json(
          { success: true, message: 'Transaction updated successfully' },
          { status: 200 }
        );
      } else {
        // Transaction not found - could be a new booking
        // In this case, we might need to create a transaction based on order metadata
        // For now, log and return success
        console.log('Transaction not found for order:', payment.order_id);
        return NextResponse.json(
          { success: true, message: 'Payment captured but transaction not found' },
          { status: 200 }
        );
      }
    }

    // Handle other events
    return NextResponse.json(
      { success: true, message: 'Event received', event },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
