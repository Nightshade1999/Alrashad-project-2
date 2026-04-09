"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { PowerSyncDatabase } from '@powersync/web';
import { SupabaseConnector } from './SupabaseConnector';
import { createClient } from '@/lib/supabase';
import { getPowerSync, initPowerSync } from './db';
import { SCHEMA_VERSION } from './schema';
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt';

const PowerSyncContext = createContext<PowerSyncDatabase | null>(null);

export const usePowerSync = () => {
  return useContext(PowerSyncContext);
};

export const PowerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
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
          recordEvent(`Schema Mismatch: ${storedVersion} -> ${SCHEMA_VERSION}`);
          console.log(`Schema mismatch (Local: ${storedVersion}, Code: ${SCHEMA_VERSION}). Update required.`);
          // STOP! No more automated reloads.
          setNeedsUpdate(true);
          return;
        }

        // Initializing via singleton helper (prevents duplicate init)
        await initPowerSync();
        
        // Initial connection check
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !powerSync.currentStatus?.connected && !connectingRef.current) {
          try {
            connectingRef.current = true;
            recordEvent('PowerSync: Connecting...');
            await powerSync.connect(connector);
            recordEvent('PowerSync: Connected Successfully');
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
                recordEvent('PowerSync: Auth Reconnect...');
                await powerSync.connect(connector);
                recordEvent('PowerSync: Reconnected');
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
      {needsUpdate && <UpdatePrompt onUpdate={() => window.location.reload()} />}
      {children}
    </PowerSyncContext.Provider>
  );
};
