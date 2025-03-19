import { Component, OnInit } from '@angular/core';
import { SearchRequest } from '../../interfaces/search-request.interface';
import { SearchCriteria } from '../../interfaces/search-criteria.interface';// Update with your actual service path
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-testing-saved-saerch-acc',
  standalone: false,
  templateUrl: './testing-saved-saerch-acc.component.html',
  styleUrl: './testing-saved-saerch-acc.component.scss'
})
export class TestingSavedSaerchAccComponent implements OnInit {
  public savedGroupFields: any[] = [];
  public isLoading = true;
  public errorMessage = '';

  constructor(private searchService: SearchService) { } // Replace with your actual service

  ngOnInit(): void {
    this.loadSavedSearches();
  }

  loadSavedSearches(): void {
    this.isLoading = true;
    this.searchService.getAllSavedSearches().subscribe({
      next: (response: any) => {
        if (response && response.groupFields) {
          console.log('Saved group fields:', response);
          this.savedGroupFields = response;  // This is correct - passing the JSON directly
        } else {
          this.savedGroupFields = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading saved searches:', error);
        this.errorMessage = 'Failed to load saved searches. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  // Handle saved field selection
  onSavedFieldSelected(field: SearchCriteria): void {
    if (!field) return;
    console.log('Saved field selected:', field);
  }

  // Handle saved group field title clicked
  onSavedGroupFieldTitleClicked(groupField: SearchRequest): void {
    if (!groupField) return;
    console.log('Saved group field title clicked:', groupField);
  }
}
