import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { Logo } from '@shared/ui/logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, Logo],
  templateUrl: './not-found-page.html',
})
export default class NotFoundPage {}
