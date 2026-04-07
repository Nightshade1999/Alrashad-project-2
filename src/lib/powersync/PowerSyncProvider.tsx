"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
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
        await powerSync.connect(connector);
        setDb(powerSync);
        console.log('PowerSync initialized successfully');
      } catch (error) {
        console.error('Failed to initialize PowerSync:', error);
      }
    };

    init();
    
    // Cleanup on unmount
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
