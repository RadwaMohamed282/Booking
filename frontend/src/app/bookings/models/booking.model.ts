export enum BookingStatus {
  Booked = 'Booked',
  CheckedIn = 'CheckedIn',
  CheckedOut = 'CheckedOut',
  Canceled = 'Canceled',
}

export interface Booking {
  id: number;
  guestFirstName: string;
  guestLastName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfAdults: number;
  numberOfChildren: number;
  roomId: number;
  status: BookingStatus;
}
