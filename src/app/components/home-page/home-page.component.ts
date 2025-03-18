import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { SearchService } from '../../common/services/search.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {

  globelSearchForm!: FormGroup;
  isLoading: boolean = false;

  constructor(private searchService: SearchService, private router: Router) { }

  ngOnInit(): void {
    this.initialForm();
    this.searchService.searchQuery$.subscribe(query => {
      this.globelSearchForm.get('searchKey')?.setValue(query);
    });
  }

  initialForm() {
    this.globelSearchForm = new FormGroup({
      searchKey: new FormControl('', {}),
    });
  }

  onSearch(): void {
    const searchQuery = this.globelSearchForm.get('searchKey')?.value;
    if (searchQuery) {
      this.isLoading = true;
      this.router.navigate(['/resultpage']);
      this.searchService.enableSearch(searchQuery);
    }
  }

  onClear(): void {
    this.searchService.clearSearch();
  }
}
