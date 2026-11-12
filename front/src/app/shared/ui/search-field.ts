import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'ml-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconFieldModule, InputIconModule, InputTextModule],
  host: { class: 'block' },
  template: `
    <p-iconfield iconPosition="left" class="w-full">
      <p-inputicon class="pi pi-search" />
      <input
        pInputText
        type="search"
        class="w-full"
        [placeholder]="placeholder()"
        [attr.aria-label]="label()"
        [(ngModel)]="value"
      />
    </p-iconfield>
  `,
})
export class SearchField {
  readonly value = model('');
  readonly placeholder = input('Buscar…');
  readonly label = input('Buscar');
}
