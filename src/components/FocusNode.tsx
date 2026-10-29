import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FocusNodeData } from '../types/focus';
import { Check, Lock } from 'lucide-react';
import { GoalIcon } from './GoalIcon';

interface FocusNodeProps {
  data: FocusNodeData;
  selected?: boolean;
}

export const FocusNode: React.FC<FocusNodeProps> = memo(({ data, selected }) => {
  const days = Math.round(data.cost * 7);
  const status = data.status || 'available';

  // Selection & Status styles
  let containerClass = 'border-transparent hover:border-[#576147] hover:bg-[#a8bc7910]';
  if (selected) {
    containerClass = 'border-[#d6b878] bg-[#a8bc7914] shadow-[0_0_0_2px_rgba(214,184,120,0.4)]';
  } else if (status === 'completed') {
    containerClass = 'border-[#a6bd87] bg-[#a6bd8720] shadow-[0_0_12px_rgba(166,189,135,0.4)]';
  } else if (status === 'locked') {
    containerClass = 'border-transparent opacity-50 grayscale';
  }

  const displayName = data.name || data.id.replace(/^[A-Z0-9]{2,4}_/, '').replace(/_/g, ' ');
  const emblem = data.symbol || '★';

  return (
    <div
      className={`relative flex w-[156px] min-h-[114px] flex-col items-center justify-center rounded-md border p-2 transition-all duration-150 cursor-grab select-none ${containerClass}`}
    >
      {/* Top Handle: Incoming Prerequisites */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !rounded-full !bg-[#d6b878] !border !border-[#181e19]"
      />

      {/* Bottom Handle: Outgoing Prerequisites */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !rounded-full !bg-[#a6bd87] !border !border-[#181e19]"
      />

      {/* Left Handle: Mutual Exclusion */}
      <Handle
        type="target"
        id="mut-left"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-sm !bg-[#bd785c] !border !border-[#181e19]"
      />

      {/* Right Handle: Mutual Exclusion */}
      <Handle
        type="source"
        id="mut-right"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-sm !bg-[#bd785c] !border !border-[#181e19]"
      />

      {/* Days Badge (Top-Right) */}
      <span className="absolute top-1 right-1.5 font-mono text-[9px] text-[#909b88]">
        {days}d
      </span>

      {/* Focus badge: the real icon first, then backup icons, then the shield emblem */}
      <div className="relative my-1 flex h-[58px] w-[64px] items-center justify-center">
        <GoalIcon
          sprite={data.icon}
          className="h-full w-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] pointer-events-none transition-transform hover:scale-105"
          fallback={
            <div className="hoi4-badge">
              <span>{emblem}</span>
            </div>
          }
        />

        {status === 'completed' && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#a6bd87] text-[#101512] shadow">
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        )}
        {status === 'locked' && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#bd785c] text-white shadow">
            <Lock className="h-2.5 w-2.5 stroke-[2.5]" />
          </div>
        )}
      </div>

      {/* Display Name */}
      <div
        className="mt-1 text-center font-medium text-[12px] leading-tight text-[#e3e5d9] max-w-[144px] line-clamp-2"
        style={{ textShadow: '0 2px 3px #000' }}
        title={displayName}
      >
        {displayName}
      </div>

      {/* Micro ID Badge */}
      <div className="mt-0.5 truncate text-center font-mono text-[8px] text-[#909b88] max-w-[140px] opacity-75">
        {data.id}
      </div>
    </div>
  );
});
