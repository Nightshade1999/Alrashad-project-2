"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { PowerSyncDatabase } from '@powersync/web';
import { SupabaseConnector } from './SupabaseConnector';
import { createClient } from '@/lib/supabase';
import { getPowerSync, initPowerSync } from './db';
import { SCHEMA_VERSION } from './schema';

const PowerSyncContext = createContext<PowerSyncDatabase | null>(null);

export const usePowerSync = () => {
  return useContext(PowerSyncContext);
};

export const PowerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const connectingRef = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Standardize across HMR and Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();
    const connector = new SupabaseConnector(supabase);
    const powerSync = getPowerSync();
    
    let authSubscription: any = null;

    const init = async () => {
      try {
        // 1. Check for Schema Version Mismatch (Force Refresh if update pushed)
        const storedVersion = localStorage.getItem('powersync_schema_version');
        if (storedVersion !== SCHEMA_VERSION) {
          console.log(`Schema mismatch (Local: ${storedVersion}, Code: ${SCHEMA_VERSION}). Clearing database...`);
          await powerSync.disconnectAndClear();
          localStorage.setItem('powersync_schema_version', SCHEMA_VERSION);
          // Small delay to ensure clear is committed
          await new Promise(r => setTimeout(r, 500));
        }

        // Initializing via singleton helper (prevents duplicate init)
        await initPowerSync();
        
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
          if (session) {
            try {
              if (!powerSync.currentStatus?.connected && !connectingRef.current) {
                connectingRef.current = true;
                await powerSync.connect(connector);
                console.log('PowerSync: Connected');
              }
            } catch (e) {
              console.error('PowerSync: Connection Failed:', e);
            } finally {
              connectingRef.current = false;
            }
          } else {
            await powerSync.disconnect();
          }
        });
        
        authSubscription = subscription;
        setDb(powerSync);
        console.log('PowerSync: System Ready');
      } catch (error) {
        console.error('PowerSync: Initialization Failed:', error);
      }
    };

    init();
    
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
};
