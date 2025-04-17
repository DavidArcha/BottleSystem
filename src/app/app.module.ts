import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HeaderComponent } from './components/header/header.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ResultPageComponent } from './components/result-page/result-page.component';
import { SideNavbarComponent } from './common/componets/side-navbar/side-navbar.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LanguageService } from './common/services/language.service';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { SelectSearchComponent } from './common/componets/select-search/select-search.component';
import { AccordionSectionComponent } from './common/custom/accordion/accordion-section/accordion-section.component';
import { TableDropdownComponent } from './common/custom/dropdowns/table-dropdown/table-dropdown.component';
import { SavedGroupAccordionComponent } from './common/custom/accordion/saved-group-accordion/saved-group-accordion.component';
import { TestingSavedSaerchAccComponent } from './common/testingcomponents/testing-saved-saerch-acc/testing-saved-saerch-acc.component';
import { RelationTableComponent } from './common/custom/table/relation-table/relation-table.component';
import { LocalizedDropdownComponent } from './common/custom/dropdowns/localized-dropdown/localized-dropdown.component';
import { MultilevelAccordionComponent } from './common/custom/accordion/multilevel-accordion/multilevel-accordion.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    HeaderComponent,
    HomePageComponent,
    ResultPageComponent,
    SideNavbarComponent,
    SelectSearchComponent,
    AccordionSectionComponent,
    TableDropdownComponent,
    SavedGroupAccordionComponent,
    TestingSavedSaerchAccComponent,
    RelationTableComponent,
    LocalizedDropdownComponent,
    MultilevelAccordionComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    CommonModule,
    RouterOutlet,
    AgGridModule,
    FontAwesomeModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [LanguageService],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}