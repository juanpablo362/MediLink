import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ml-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-14">
      <span class="mb-3 grid size-11 place-items-center rounded-2xl bg-bone-100 text-lg text-bone-500 sm:mb-4 sm:size-14 sm:text-xl" aria-hidden="true">
        <i [class]="icon()"></i>
      </span>
      <p class="text-base font-semibold text-ink-950">{{ title() }}</p>
      @if (description()) {
        <p class="mt-1 max-w-sm text-sm text-bone-600">{{ description() }}</p>
      }
      <div class="mt-4 flex flex-wrap justify-center gap-2 sm:mt-5">
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