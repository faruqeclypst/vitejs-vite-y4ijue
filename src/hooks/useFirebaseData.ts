import { useState, useEffect } from 'react';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { db } from '../firebase';

interface UseFirebaseDataOptions<T> {
  path: string;
  transform?: (data: any) => T;
  dependencies?: any[];
}

export const useFirebaseData = <T>({ 
  path, 
  transform, 
  dependencies = [] 
}: UseFirebaseDataOptions<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout;
    let unsubscribe: Unsubscribe | undefined;

    const loadData = () => {
      try {
        setIsLoading(true);
        setError(null);

        const dbRef = ref(db, path);
        
        unsubscribe = onValue(dbRef, 
          (snapshot) => {
            if (isMounted) {
              const rawData = snapshot.val();
              const transformedData = transform ? transform(rawData) : rawData;
              setData(transformedData);
              setIsLoading(false);
              retryCount = 0;
            }
          },
          (error) => {
            console.error(`Firebase error for ${path}:`, error);
            if (isMounted) {
              setError(error as Error);
              setIsLoading(false);
              
              if (retryCount < maxRetries) {
                retryCount++;
                retryTimeout = setTimeout(loadData, 1000 * retryCount);
              }
            }
          }
        );
      } catch (error) {
        console.error(`Error loading ${path}:`, error);
        if (isMounted) {
          setError(error as Error);
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, [path, transform, ...dependencies]);

  return { data, isLoading, error };
}; 