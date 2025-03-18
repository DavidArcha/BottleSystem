import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private languageSubject = new BehaviorSubject<string>(this.getDefaultLanguage());

  constructor(private translateService: TranslateService, private http: HttpClient) {
    // Set the default language to 'DE'
    this.translateService.setDefaultLang('de');
    this.translateService.use(this.getDefaultLanguage());
    this.setLanguage(this.getDefaultLanguage());
  }

  // Observable to allow other components to subscribe to language changes
  language$ = this.languageSubject.asObservable();

  // Get the default language from localStorage or fall back to 'DE'
  private getDefaultLanguage(): string {
    return localStorage.getItem('selectedLanguage') || 'de';
  }

  // Method to change language and persist in localStorage
  setLanguage(language: string) {
    this.languageSubject.next(language);
    localStorage.setItem('selectedLanguage', language);
    this.translateService.use(language);
  }

  public getCurrentLang(): string {
    return this.languageSubject.value;
  }

  // Load the data lazily based on the selected language
  getDropdownData(key: string): Observable<string[]> {
    const currentLang = this.getCurrentLang();
    const filePath = `assets/i18n/${currentLang}.json`;
    return this.http.get<Record<string, string[]>>(filePath).pipe(
      map((data) => data[key] || []),
      catchError((error) => {
        console.error(`Error loading language file: ${filePath}`, error);
        return of([]); // Return an empty array if the file is not found
      })
    );
  }

  // Method to get the translation of a specific value
  getTranslation(key: string, value: string, targetLang: string): Observable<string> {
    const filePath = `assets/i18n/${targetLang}.json`;
    return this.http.get<Record<string, string[]>>(filePath).pipe(
      map((data) => {
        const values = data[key] || [];
        const index = values.indexOf(value);
        return index !== -1 ? values[index] : value;
      }),
      catchError((error) => {
        console.error(`Error loading language file: ${filePath}`, error);
        return of(value); // Return the original value if the file is not found
      })
    );
  }
}
