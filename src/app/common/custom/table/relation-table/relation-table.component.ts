import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { SelectedField } from '../../../interfaces/selectedFields.interface';

@Component({
  selector: 'app-relation-table',
  standalone: false,
  templateUrl: './relation-table.component.html',
  styleUrl: './relation-table.component.scss'
})
export class RelationTableComponent {
  // Add a destroy subject for subscription cleanup
  private destroy$ = new Subject<void>();
  @Input() selectedFields: SelectedField[] = [];
  @Input() selectedLanguage: string = 'de';

}
