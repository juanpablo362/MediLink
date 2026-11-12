import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ml-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <svg viewBox="0 0 32 32" class="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" [attr.fill]="inverse() ? '#fbf8f3' : '#1c3c42'" />
      <path
        d="M9 21.5V10.5l7 7 7-7v11"
        fill="none"
        [attr.stroke]="inverse() ? '#1c3c42' : '#fbf8f3'"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="23" cy="10.5" r="2.4" fill="#e0603a" />
    </svg>
    @if (!compact()) {
      <span class="text-lg font-semibold tracking-tight" [class]="inverse() ? 'text-bone-50' : 'text-ink-950'">
        Medi<span [class]="inverse() ? 'text-coral-300' : 'text-coral-700'">Link</span>
      </span>
    }
  `,
})
export class Logo {
  readonly inverse = input(false);
  readonly compact = input(false);
}
