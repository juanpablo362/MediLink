import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ml-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between' },
  template: `
    <div class="min-w-0">
      @if (eyebrow()) {
        <p class="eyebrow mb-1.5">{{ eyebrow() }}</p>
      }
      <h1 class="text-2xl font-semibold sm:text-[1.75rem]">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-1.5 max-w-2xl text-sm text-bone-600 sm:text-[0.9375rem]">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <ng-content />
    </div>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly eyebrow = input<string>();
}
