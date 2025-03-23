import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-localized-dropdown',
  standalone: false,
  templateUrl: './localized-dropdown.component.html',
  styleUrl: './localized-dropdown.component.scss'
})
export class LocalizedDropdownComponent implements OnChanges {
  @Input() options: any[] = [];
  @Input() selectedLanguage: string = 'de';
  @Input() selectedValue: any;
  @Input() placeholder: string = 'DROPDOWN.PLACEHOLDER'; // translation key

  @Output() selectedValueChange: EventEmitter<any> = new EventEmitter<any>();

  private previousSelectedValue: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.options && this.options.length > 0) {
      if (!this.selectedValue || this.selectedValue === undefined || this.selectedValue === null) {
        this.selectedValue = 'select';
        this.selectedValueChange.emit(this.selectedValue);
      }
    }
  }

  onValueChange(newValue: any): void {
    this.previousSelectedValue = newValue;
    this.selectedValue = newValue;
    this.selectedValueChange.emit(newValue);
  }
}
