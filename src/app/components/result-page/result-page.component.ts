import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ColDef, GridApi } from 'ag-grid-community';
import { ResultPageService } from '../../common/services/result-page.service';
import { ActivatedRoute, Router } from '@angular/router';
import { faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-result-page',
  standalone: false,
  templateUrl: './result-page.component.html',
  styleUrl: './result-page.component.scss'
})
export class ResultPageComponent implements OnInit {

  //Ag-Grid Fields
  public columnDefs: ColDef[] = [];
  public rowData: any;
  public gridApi!: GridApi;
  public paginationPageSize = 10;
  public paginatinonSizeSelector: number[] | boolean = [5, 10, 20, 50, 100];
  public selectedRows: any[] = [];
  // Control container state
  isControlCollapsed: boolean = false;

  // Icons
  faArrowLeft = faArrowLeft;
  faArrowRight = faArrowRight;

  // Dropdown related fields
  selectedMatch: any;
  selectedLanguage: string = 'de';
  selectedComponent: string = ''; // Default to empty

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private resultPageService: ResultPageService, // Inject the service
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.http
      .get('/assets/json/orders-list.json')
      .subscribe((data: any) => {
        this.rowData = data;
      });

    this.resultPageService.data$.subscribe(data => {
      console.log('Received data:', data);
      // Handle the received data here
    });
  }

  ngOnInit(): void {
    // Determine the initial component based on the URL snapshot.
    const urlSegments = this.route.snapshot.url;
    let newComponent = '';
    if (urlSegments.length > 1) {
      const secondSegment = urlSegments[1].path;
      if (secondSegment === 'TextSurvey') {
        newComponent = 'TextSurvey';
      } else if (secondSegment === 'SimpleSearch') {
        newComponent = 'SimpleSearch';
      } else if (secondSegment === 'Test') {
        newComponent = 'Test';
      } else if (secondSegment === 'TestDD') {
        newComponent = 'TestDD';
      } else if (secondSegment === 'TestACC') {
        newComponent = 'TestACC';
      }
    }
    // This call now restores collapse state on refresh if needed.
    this.displayComponent(newComponent);

    // Subscribe to further route changes.
    this.route.url.subscribe(url => {
      const pathSegment = url[1]?.path || '';
      let updatedComponent = '';
      if (pathSegment === 'TextSurvey') {
        updatedComponent = 'TextSurvey';
      } else if (pathSegment === 'SelectSearch') {
        updatedComponent = 'SelectSearch';
      }
      if (updatedComponent !== this.selectedComponent) {
        this.displayComponent(updatedComponent);
      }
    });
  }

  /**
   * Display the given component and update the collapse state.
   *
   * - If switching to a new component (i.e. the new component is different from what’s stored),
   *   the control container is forced open (isControlCollapsed = false).
   *
   * - If it’s a page refresh (the stored selected component is the same as the current one),
   *   then the collapse state is restored from localStorage.
   */
  displayComponent(component: string): void {
    const storedComponent = localStorage.getItem('selectedComponent');

    if (component && storedComponent && component !== storedComponent) {
      // Switching components → force open the container.
      this.isControlCollapsed = false;
      localStorage.setItem('isControlCollapsed', 'false');
    } else if (component && (!storedComponent || component === storedComponent)) {
      // On refresh, restore the collapse state if saved.
      const savedCollapse = localStorage.getItem('isControlCollapsed');
      if (savedCollapse !== null) {
        this.isControlCollapsed = savedCollapse === 'true';
      } else {
        this.isControlCollapsed = false;
        localStorage.setItem('isControlCollapsed', 'false');
      }
    }
    this.selectedComponent = component;
    localStorage.setItem('selectedComponent', component);
  }

  /**
   * Toggle the collapse state and persist it.
   */
  toggleControlContainer(): void {
    this.isControlCollapsed = !this.isControlCollapsed;
    localStorage.setItem('isControlCollapsed', this.isControlCollapsed.toString());
    this.cdr.detectChanges();
  }


  ngOnChanges(): void {
    localStorage.setItem('selectedComponent', this.selectedComponent);
  }

  onGridReady(params: any): void {
    this.gridApi = params.api;
  }

  onSelectionChanged(): void {
    const selectedNodes = this.gridApi.getSelectedNodes();
    this.selectedRows = selectedNodes.map(node => ({
      orderno: node.data.orderno,
      ordertrackno: node.data.ordertrackno,
      perid: node.data.perid
    }));
  }

  checkAll(): void {
    this.gridApi.forEachNode(node => node.setSelected(true));
    this.onSelectionChanged();
  }

  downloadPdf(): void {
    if (this.selectedRows.length > 0) {
      console.log(this.selectedRows);
      // Implement the logic to download the selected rows as a PDF
    }
  }

  clearSelection(): void {
    this.gridApi.deselectAll();
    this.selectedRows = [];
  }
}
