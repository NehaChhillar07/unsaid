import { useQuery } from '@tanstack/react-query';
import { fetchIdentities } from '@unsaid/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export function useIdentities() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['identities'],
    queryFn: () => fetchIdentities(supabase),
    enabled: !!session,
  });
}
