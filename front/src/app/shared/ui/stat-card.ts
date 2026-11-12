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
      class="surface-card group flex h-full flex-col gap-2 p-3.5 transition hover:-translate-y-0.5 hover:shadow-raised sm:gap-4 sm:p-5"
    >
      <div class="flex items-start justify-between gap-2 sm:gap-3">
        <span class="text-xs font-medium leading-tight text-bone-600 sm:text-sm">{{ label() }}</span>
        <span
          class="grid size-8 shrink-0 place-items-center rounded-xl sm:size-9"
          [class]="tone() === 'coral' ? 'bg-coral-50 text-coral-700' : tone() === 'ok' ? 'bg-ok-50 text-ok-700' : 'bg-ink-50 text-ink-700'"
          aria-hidden="true"
        >
          <i [class]="icon()"></i>
        </span>
      </div>
      <div>
        <p class="text-2xl font-semibold tabular-nums tracking-tight text-ink-950 sm:text-4xl">{{ value() }}</p>
        @if (hint()) {
          <p class="sr-only sm:not-sr-only sm:mt-1 sm:block sm:text-sm sm:text-bone-500">{{ hint() }}</p>
        }
      </div>
      <span class="mt-auto hidden items-center gap-1 text-sm font-semibold text-ink-700 group-hover:text-ink-900 sm:inline-flex">
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
