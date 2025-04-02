import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, retry, throwError } from 'rxjs';
import { AccordionItem } from '../interfaces/accordian-list.interface';
import { DropdownItem, ListItem } from '../interfaces/table-dropdown.interface';
import { RestAPICallUrl } from '../utils/apicalls';
import { DROPDOWN_DATA } from '../utils/dropdown-data.constant';


@Injectable({
  providedIn: 'root'
})
export class SearchService {

  apiUrl!: any;

  private searchEnabledSubject = new BehaviorSubject<boolean>(false);
  private searchQuerySubject = new BehaviorSubject<string>('');

  searchEnabled$ = this.searchEnabledSubject.asObservable();
  searchQuery$ = this.searchQuerySubject.asObservable();

  constructor(private http: HttpClient) {
    this.apiUrl = 'https://localhost:7156/';
    const savedQuery = localStorage.getItem('searchQuery');
    if (savedQuery) {
      this.searchQuerySubject.next(savedQuery);
      this.searchEnabledSubject.next(true);
    }
  }


  enableSearch(query: string) {
    this.searchQuerySubject.next(query);
    this.searchEnabledSubject.next(true);
    localStorage.setItem('searchQuery', query);
  }

  clearSearch() {
    this.searchQuerySubject.next('');
    localStorage.removeItem('searchQuery');
  }

  getSystemFields(lang: string): Observable<AccordionItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getSyatemFileds}/${lang}`;
    return this.http.get<AccordionItem[]>(url);
  }

  getSystemFieldsByLang(lang: string): Observable<DropdownItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getSyatemFileds}/${lang}`;
    return this.http.get<DropdownItem[]>(url);
  }

  getSystemTypeFieldsByLang(lang: string): Observable<DropdownItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getSystemTypeFields}/${lang}`;
    return this.http.get<DropdownItem[]>(url);
  }

  getSystemFieldsAccData(selectedSysType: any, lang: string): Observable<AccordionItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getSystemFieldsAccData}/${selectedSysType}/${lang}`;
    return this.http.get<AccordionItem[]>(url);
  }

  getDropdownData(): Observable<any> {
    // In a more complex scenario, you could load this data from an assets JSON file using HttpClient.
    return of(DROPDOWN_DATA);
  }

  saveSearchData(data: any): Observable<any> {
    let url = this.apiUrl + RestAPICallUrl.saveSearchData;
    return this.http.post(url, data);
  }

  getAccordionFields(lang: string): Observable<AccordionItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getAccordionData}/${lang}`;
    return this.http.get<AccordionItem[]>(url);
  }

  getStateData(lang: string): Observable<DropdownItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getStateData}/${lang}`;
    return this.http.get<DropdownItem[]>(url);
  }

  getBrandsData(lang: string): Observable<DropdownItem[]> {
    let url = `${this.apiUrl}${RestAPICallUrl.getBrandData}/${lang}`;
    return this.http.get<DropdownItem[]>(url);
  }

  // Sends the search request as FormData
  saveSearchRequest(searchRequest: any): Observable<any> {
    const formData = new FormData();
    formData.append('searchRequest', JSON.stringify(searchRequest));
    console.log('FormData:', formData); // Log the FormData object
    let url = `${this.apiUrl}${RestAPICallUrl.saveSearchData}`;
    console.log('URL:', url); // Log the URL
    return this.http.post(url, formData);
  }

  // saveSearchRequest(searchRequest: any): Observable<any> {
  //   // Convert the entire object to a JSON string
  //   const jsonString = JSON.stringify(searchRequest);

  //   // Create request options to send as plain text
  //   const options = {
  //     headers: { 'Content-Type': 'application/json' }
  //   };

  //   // Send directly as a JSON string in the body
  //   let url = `${this.apiUrl}${RestAPICallUrl.saveSearchData}`;
  //   return this.http.post(url, jsonString, options);
  // }

  // Retrieves the saved search request by gSearchId
  getSearch(gSearchId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetSearch/${gSearchId}`);
  }

  // getAllSavedSearches(): Observable<any> {
  //   let url = `${this.apiUrl}${RestAPICallUrl.getAllSavedSearches}`;
  //   return this.http.get(url);
  // }

  getAllSavedSearches(): Observable<any> {    
    // Get data from local JSON file
    return this.http.get('assets/json/SavedSearchSample.json');
  }
}