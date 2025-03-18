import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LanguageService } from '../../common/services/language.service';
import { SearchService } from '../../common/services/search.service';
import { FormControl, FormGroup } from '@angular/forms';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  searchForm!: FormGroup;
  searchQuery: string = '';
  languages = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'German' } // Corrected label to 'German'
  ];
  selectedLanguage: string;
  isLoading: boolean = false;
  showSearchBox: boolean = true;

  constructor(
    private router: Router,
    private languageService: LanguageService,
    private searchService: SearchService, private changeDtr: ChangeDetectorRef
  ) {
    // Initialize selected language (default is 'DE' if not set)
    this.selectedLanguage = this.languageService.getCurrentLang();
  }

  ngOnInit(): void {
    this.initialForm();
    this.searchService.searchEnabled$.subscribe(enabled => {
      this.showSearchBox = enabled;
      this.changeDtr.detectChanges();
    });
    this.searchService.searchQuery$.subscribe(query => {
      this.searchForm.get('searchKey')?.setValue(query);
      this.changeDtr.detectChanges();
    });
    this.updateVisibilitySearchBox();
    // Check the current route and show/hide the search box on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateVisibilitySearchBox();
    });
  }

  updateVisibilitySearchBox() {
    this.showSearchBox = this.router.url !== '/home';
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'de';
    }, 100);
  }

  initialForm() {
    this.searchForm = new FormGroup({
      searchKey: new FormControl('', {}),
    });
  }

  onSearch(): void {
    const searchQuery = this.searchForm.get('searchKey')?.value;
    if (searchQuery) {
      this.searchService.enableSearch(searchQuery);
    }
  }

  onClear(): void {
    this.searchService.clearSearch();
  }

  onLanguageChange(event: Event): void {
    // Cast event.target to HTMLSelectElement
    const target = event.target as HTMLSelectElement;
    this.selectedLanguage = target.value;
    this.languageService.setLanguage(target.value);
  }
}
