import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { authenticateApiUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await authenticateApiUser(request);
    if (authError || !userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      profile: {
        id: userId,
        email: userData.user.email,
        phone: profile?.phone || userData.user.phone || '',
        fullName: profile?.full_name || userData.user.user_metadata?.full_name || '',
      },
    });
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, error: authError } = await authenticateApiUser(request);
    if (authError || !userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, phone } = body;

    if (!fullName && !phone) {
      return NextResponse.json(
        { error: 'At least one field (fullName or phone) is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;

    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, ...updates });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Profile update error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
