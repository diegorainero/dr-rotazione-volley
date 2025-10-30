// src/components/CloudStatus.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAutoSync } from '../hooks/useAutoSync';

interface CloudStatusProps {
  onOpenMigration: () => void;
}

export const CloudStatus: React.FC<CloudStatusProps> = ({
  onOpenMigration,
}) => {
  const { user, isAuthenticated, isAnonymous } = useAuth();
  const { isEnabled, isRunning, lastSync, nextSync } = useAutoSync();

  const getStatusInfo = () => {
    if (!isAuthenticated) {
      return {
        icon: '☁️',
        text: 'Offline',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        pulse: false,
      };
    }

    if (isRunning) {
      return {
        icon: '🔄',
        text: 'Sync...',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        pulse: true,
      };
    }

    if (isEnabled && isAuthenticated) {
      return {
        icon: '🔄',
        text: 'Auto-Sync',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        pulse: false,
      };
    }

    if (isAnonymous) {
      return {
        icon: '🔒',
        text: 'Anonimo',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        pulse: false,
      };
    }

    return {
      icon: '✅',
      text: 'Connesso',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      pulse: false,
    };
  };

  const status = getStatusInfo();

  // Tooltip con informazioni dettagliate
  const getDetailedTooltip = () => {
    let tooltip = `Stato cloud: ${status.text}`;

    if (user?.email) {
      tooltip += ` (${user.email})`;
    }

    if (isEnabled && nextSync) {
      const nextSyncTime = new Date(nextSync);
      const now = new Date();
      const diffMin = Math.round(
        (nextSyncTime.getTime() - now.getTime()) / 60000
      );

      if (diffMin > 0) {
        tooltip += `\nProssimo sync: ${diffMin} min`;
      } else {
        tooltip += '\nProssimo sync: imminente';
      }
    }

    if (lastSync) {
      const lastSyncTime = new Date(lastSync);
      const diffMin = Math.round((Date.now() - lastSyncTime.getTime()) / 60000);
      tooltip += `\nUltimo sync: ${diffMin} min fa`;
    }

    return tooltip;
  };

  return (
    <button
      onClick={onOpenMigration}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all
        ${status.color} ${status.bgColor} ${status.borderColor}
        hover:scale-105 hover:shadow-sm
        ${status.pulse ? 'animate-pulse' : ''}
      `}
      title={getDetailedTooltip()}
    >
      <span className='text-base'>{status.icon}</span>
      <span className='font-medium'>{status.text}</span>
      {user?.email && (
        <span className='text-xs opacity-75 max-w-20 truncate'>
          {user.email}
        </span>
      )}
      {isEnabled && !isRunning && (
        <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
      )}
    </button>
  );
};
