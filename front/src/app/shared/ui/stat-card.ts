import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ml-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="link()"
      [queryParams]="queryParams()"
      class="surface-card group flex h-full flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-raised"
    >
      <div class="flex items-start justify-between gap-3">
        <span class="text-sm font-medium text-bone-600">{{ label() }}</span>
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl"
          [class]="tone() === 'coral' ? 'bg-coral-50 text-coral-700' : tone() === 'ok' ? 'bg-ok-50 text-ok-700' : 'bg-ink-50 text-ink-700'"
          aria-hidden="true"
        >
          <i [class]="icon()"></i>
        </span>
      </div>
      <div>
        <p class="text-4xl font-semibold tabular-nums tracking-tight text-ink-950">{{ value() }}</p>
        @if (hint()) {
          <p class="mt-1 text-sm text-bone-500">{{ hint() }}</p>
        }
      </div>
      <span class="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-ink-700 group-hover:text-ink-900">
        Ver lista <i class="pi pi-arrow-right text-xs transition group-hover:translate-x-0.5" aria-hidden="true"></i>
      </span>
    </a>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input('pi pi-chart-bar');
  readonly hint = input<string>();
  readonly link = input<string | unknown[]>('.');
  readonly queryParams = input<Record<string, string>>({});
  readonly tone = input<'ink' | 'coral' | 'ok'>('ink');
}
