import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  const cases: [string, string][] = [
    ['/', 'Luxury Boutique Stays'],
    ['/bookings', 'Bookings'],
    ['/bookings/new', 'Booking Form'],
    ['/bookings/1', 'Booking Detail'],
    ['/rooms', 'Rooms'],
    ['/rooms/new', 'Add Room'],
    ['/rooms/1/edit', 'Loading room'],
  ];

  for (const [path, expectedText] of cases) {
    it(`renders "${expectedText}" for ${path}`, async () => {
      const harness = await RouterTestingHarness.create(path);
      expect(harness.routeNativeElement?.textContent).toContain(expectedText);
    });
  }
});
