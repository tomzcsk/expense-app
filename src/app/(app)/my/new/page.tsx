import { createClient } from '@/lib/supabase/server';
import { NewClaimForm } from './NewClaimForm';
import { createClaim } from '../actions';

export default async function NewClaimPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories').select('id, name').eq('active', true).order('name');
  return <NewClaimForm categories={categories ?? []} action={createClaim} />;
}
