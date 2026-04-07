"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const powerSyncRef = useRef<PowerSyncDatabase | null>(null);
  const connectingRef = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations in React 18+ Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();
    const connector = new SupabaseConnector(supabase);
    
    const powerSync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'powersync.db',
      }
    });
    powerSyncRef.current = powerSync;

    let authSubscription: any = null;

    const init = async () => {
      try {
        await powerSync.init();
        
        // Initial connection check
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !powerSync.currentStatus?.connected && !connectingRef.current) {
          try {
            connectingRef.current = true;
            await powerSync.connect(connector);
            console.log('PowerSync initial connection established');
          } catch (e) {
            console.warn('PowerSync initial connection failed (expected if offline):', e);
          } finally {
            connectingRef.current = false;
          }
        }

        // Watch for auth changes to connect/disconnect dynamically
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          console.log('PowerSync Auth Event:', event, !!session);
          
          if (session) {
            try {
              // Ensure we don't try to connect if already connected or connecting
              if (!powerSync.currentStatus?.connected && !connectingRef.current) {
                console.log('PowerSync: Session found, attempting connection...');
                connectingRef.current = true;
                await powerSync.connect(connector);
                console.log('PowerSync: Connected Successfully');
              }
            } catch (e) {
              console.error('PowerSync: Connection Failed:', e);
            } finally {
              connectingRef.current = false;
            }
          } else {
            console.warn('PowerSync: No session, disconnecting...');
            await powerSync.disconnect();
          }
        });
        
        authSubscription = subscription;
        setDb(powerSync);
        console.log('PowerSync: Local database initialized');
      } catch (error) {
        console.error('PowerSync: Initialization Failed:', error);
      }
    };

    init();
    
    return () => {
      console.log('PowerSync: Cleaning up provider...');
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (powerSyncRef.current) {
        powerSyncRef.current.disconnect();
      }
      initialized.current = false;
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
};
