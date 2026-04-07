"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';
import { SupabaseConnector } from './SupabaseConnector';
import { createClient } from '@/lib/supabase';

const PowerSyncContext = createContext<PowerSyncDatabase | null>(null);

export const usePowerSync = () => {
  return useContext(PowerSyncContext);
};

export const PowerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const connector = new SupabaseConnector(supabase);
    
    const powerSync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'powersync.db',
      }
    });

    const init = async () => {
      try {
        await powerSync.init();
        
        // Only connect if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await powerSync.connect(connector);
          console.log('PowerSync connected to backend');
        }

        // Watch for auth changes to connect/disconnect dynamically
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            try {
              await powerSync.connect(connector);
              console.log('PowerSync reconnected on auth change');
            } catch (e) {
              console.error('PowerSync reconnect failed:', e);
            }
          } else {
            await powerSync.disconnect();
            console.log('PowerSync disconnected on logout');
          }
        });

        setDb(powerSync);
        console.log('PowerSync initialized locally');
      } catch (error) {
        console.error('Failed to initialize PowerSync:', error);
      }
    };

    init();
    
    return () => {
      powerSync.disconnect();
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
};
