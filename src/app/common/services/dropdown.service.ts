import { Injectable } from '@angular/core';
import { ListItem } from '../interfaces/table-dropdown.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DropdownService {
  private activeDropdown = new BehaviorSubject<string | null>(null);
  activeDropdown$ = this.activeDropdown.asObservable();

  setActiveDropdown(id: string | null) {
    this.activeDropdown.next(id);
  }
}