import { Component } from '@angular/core';
import { Router } from '@angular/router';


interface MenuItem {
  icon: string;      // Icon name (for example, using Material Icons)
  route: string;     // Route to navigate to
  tooltip: string;   // Accessible tooltip text
}


@Component({
  selector: 'app-side-navbar',
  standalone: false,
  templateUrl: './side-navbar.component.html',
  styleUrl: './side-navbar.component.scss'
})
export class SideNavbarComponent {
  menuItems: MenuItem[] = [
    { icon: 'home', route: '/home', tooltip: 'Homepage' },
    { icon: 'resultpage', route: '/resultpage', tooltip: 'Results' },
    { icon: 'Select Search', route: '/resultpage/SelectSearch', tooltip: 'Select Search' },
  ];

  activeRoute: string = '';

  constructor(private router: Router) {
    // Subscribe to route changes to set the active state
    this.router.events.subscribe(() => {
      this.activeRoute = this.router.url;
    });
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}

