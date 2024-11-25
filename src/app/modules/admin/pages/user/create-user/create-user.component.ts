import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserFormComponent } from '@app/modules/admin/components/user/user-form/user-form.component';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
})
export class CreateUserComponent {
  loading: boolean = false;

  handleActions(event: any): any {
    console.log(event);
  }
}
