import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing/components/landing-page/landing-page.component';
import { BookingListComponent } from './bookings/components/booking-list/booking-list.component';
import { BookingDetailComponent } from './bookings/components/booking-detail/booking-detail.component';
import { BookingFormComponent } from './bookings/components/booking-form/booking-form.component';
import { RoomListComponent } from './rooms/components/room-list/room-list.component';
import { RoomFormComponent } from './rooms/components/room-form/room-form.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'bookings', component: BookingListComponent },
  { path: 'bookings/new', component: BookingFormComponent },
  { path: 'bookings/:id', component: BookingDetailComponent },
  { path: 'rooms', component: RoomListComponent },
  { path: 'rooms/new', component: RoomFormComponent },
  { path: 'rooms/:id/edit', component: RoomFormComponent },
];
