'use client';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function ToggleSwitch({ enabled, onChange, disabled = false, label }: Props) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex h-[40px] w-[280px] items-center rounded-lg px-4
        transition-colors border
        ${enabled
          ? 'bg-[#5df0c0]/10 border-[#5df0c0]/30'
          : 'bg-[#252936] border-white/10'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[#2d3142] cursor-pointer'
        }
      `}
      disabled={disabled}
    >
      <span className="flex-1 text-left text-sm text-white">
        {label || (enabled ? 'Enabled' : 'Disabled')}
      </span>
      <div
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${enabled ? 'bg-[#5df0c0]' : 'bg-white/20'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  );
}
