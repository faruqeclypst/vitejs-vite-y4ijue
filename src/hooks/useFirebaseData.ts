import { useState, useEffect, useRef } from 'react';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { db } from '../firebase';
import { unstable_batchedUpdates } from 'react-dom';

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
  
  // Ref untuk tracking initial load
  const initialLoadRef = useRef(true);
  
  // Ref untuk latest data
  const latestDataRef = useRef<T | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: Unsubscribe | undefined;

    const loadData = () => {
      try {
        const dbRef = ref(db, path);
        
        // Selalu set loading true pada initial load
        if (initialLoadRef.current) {
          setIsLoading(true);
        }

        unsubscribe = onValue(dbRef, 
          (snapshot) => {
            if (isMounted) {
              const rawData = snapshot.val();
              const transformedData = transform ? transform(rawData) : rawData;
              
              // Update latest data ref
              latestDataRef.current = transformedData;

              // Batch updates
              unstable_batchedUpdates(() => {
                setData(transformedData);
                setIsLoading(false);
                setError(null);
                initialLoadRef.current = false;
              });
            }
          },
          (error) => {
            console.error(`Firebase error for ${path}:`, error);
            if (isMounted) {
              unstable_batchedUpdates(() => {
                setError(error as Error);
                setIsLoading(false);
                initialLoadRef.current = false;
              });
            }
          }
        );
      } catch (error) {
        console.error(`Error loading ${path}:`, error);
        if (isMounted) {
          unstable_batchedUpdates(() => {
            setError(error as Error);
            setIsLoading(false);
            initialLoadRef.current = false;
          });
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [path, transform, ...dependencies]);

  // Jika masih loading tapi sudah ada data sebelumnya, gunakan data terakhir
  if (isLoading && latestDataRef.current) {
    return { 
      data: latestDataRef.current, 
      isLoading: true, 
      error: null 
    };
  }

  // Error handling
  if (error) {
    console.error(`Error loading data from ${path}:`, error);
    return { 
      data: latestDataRef.current, // Tetap return latest data jika ada error
      isLoading: false, 
      error 
    };
  }

  return { 
    data, 
    isLoading: isLoading && initialLoadRef.current, // Hanya loading pada initial load
    error: null 
  };
}; 