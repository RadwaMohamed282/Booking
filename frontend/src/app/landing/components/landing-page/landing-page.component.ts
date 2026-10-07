import { Component } from '@angular/core';

interface GuestRow {
  name: string;
  subtitle: string;
}

// Placeholder guest activity matching the Figma mock. Not wired to
// BookingService yet — this page is presentational for now.
const CHECKING_IN_TODAY: GuestRow[] = [
  { name: 'Julianne Moore', subtitle: 'Room 101 • Jan 15' },
  { name: 'Robert Downey Jr.', subtitle: 'Room 204 • Jan 15' },
];

const CHECKING_OUT_TODAY: GuestRow[] = [
  { name: 'Scarlett Johansson', subtitle: 'Room 103 • Jan 15' },
  { name: 'Chris Evans', subtitle: 'Room 302 • Jan 15' },
];

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  readonly checkingIn = CHECKING_IN_TODAY;
  readonly checkingOut = CHECKING_OUT_TODAY;
}
