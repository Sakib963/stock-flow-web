import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
  selector: 'view-toggle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgZorroCustomModule],
  templateUrl: './view-toggle.component.html',
  styleUrls: ['./view-toggle.component.scss'],
})
export class ViewToggleComponent implements OnInit {
  @Input() isListView: boolean = true;
  @Output() readonly actionEmitter: EventEmitter<{ action: string; value: boolean }> = new EventEmitter();
  
  toggle: FormControl = new FormControl(false);

  ngOnInit(): void {
    this.toggle.setValue(this.isListView); // Initialize toggle state
  }

  handleToggleChange(): void {
    this.actionEmitter.emit({ action: 'toggle', value: this.toggle.value });
  }
}
