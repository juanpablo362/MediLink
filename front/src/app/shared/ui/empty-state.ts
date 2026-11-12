import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ml-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center px-6 py-14 text-center">
      <span class="mb-4 grid size-14 place-items-center rounded-2xl bg-bone-100 text-xl text-bone-500" aria-hidden="true">
        <i [class]="icon()"></i>
      </span>
      <p class="text-base font-semibold text-ink-950">{{ title() }}</p>
      @if (description()) {
        <p class="mt-1 max-w-sm text-sm text-bone-600">{{ description() }}</p>
      }
      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly icon = input('pi pi-inbox');
}
