import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Booking } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  getAll(): Observable<Booking[]> {
    return of([]);
  }

  getById(id: number): Observable<Booking | undefined> {
    return of(undefined);
  }

  create(booking: Booking): Observable<Booking> {
    return of(booking);
  }

  update(id: number, booking: Booking): Observable<Booking> {
    return of(booking);
  }

  delete(id: number): Observable<void> {
    return of(undefined);
  }
}
