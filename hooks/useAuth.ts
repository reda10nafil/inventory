export { useAuth } from '../contexts/AuthContext';

import { useEffect, useState } from 'react';
import { supabase } from '../backend-auth/supabase/client';
import { useAuth as useAuthContext } from '../contexts/AuthContext';

export function useOperator() {
  const { user, operatorId } = useAuthContext;
  const [operator, setOperator] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operatorId) {
      setOperator(null);
      setLoading(false);
      return;
    }
    supabase.from('operators').select('*, users(*)').eq('id', operatorId).single().then(({ data, error }) => {
      if (error) setOperator(null);
      else setOperator(data);
      setLoading(false);
    });
  }, [operatorId]);

  return { operator, loading, user };
}
