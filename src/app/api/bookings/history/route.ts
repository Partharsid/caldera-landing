import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { authenticateApiUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await authenticateApiUser(request);
    if (authError || !userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .single();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profile?.phone) {
      query = query.eq('customer_phone', profile.phone);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookings: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (err: any) {
    console.error('Bookings history error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
