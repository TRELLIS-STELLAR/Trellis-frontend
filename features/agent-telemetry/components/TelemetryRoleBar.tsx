'use client';

import type { TelemetryRole } from '@/lib/telemetry/roles';
import { getTelemetryCapabilities } from '@/lib/telemetry/roles';
import clsx from 'clsx';

const ROLES: TelemetryRole[] = ['viewer', 'operator', 'admin'];

interface Props {
  role: TelemetryRole;
  onRoleChange: (r: TelemetryRole) => void;
}

export function TelemetryRoleBar({ role, onRoleChange }: Props) {
  const caps = getTelemetryCapabilities(role);

  return (
    <div className="rounded-lg border border-trellis-vine/30 bg-trellis-deep/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-400 w-full sm:w-auto">Access role</span>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRoleChange(r)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm capitalize transition-smooth border',
                role === r
                  ? 'bg-trellis-vine/30 border-trellis-vine text-white'
                  : 'border-trellis-vine/20 text-gray-300 hover:border-trellis-vine/50'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        In production, roles come from your identity provider — this demo stores the selection in{' '}
        <code className="text-trellis-amber/80">sessionStorage</code>. Capabilities:{' '}
        {caps.canFilterByAgent ? 'per-agent filter · ' : ''}
        {caps.canViewErrorDetails ? 'error detail · ' : ''}
        {caps.canExport ? 'export · ' : ''}
        {caps.canUseDebugSeverity ? 'debug severity' : 'no debug severity'}
      </p>
    </div>
  );
}
