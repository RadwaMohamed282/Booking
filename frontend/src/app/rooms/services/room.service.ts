import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Room } from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.baseUrl}/api/Rooms/GetAllRooms`);
  }

  getById(id: number): Observable<Room | undefined> {
    return this.http.get<Room>(`${this.baseUrl}/api/Rooms/GetRoomById/${id}`).pipe(
      catchError((err) => (err.status === 404 ? of(undefined) : throwError(() => err)))
    );
  }

  create(room: Room): Observable<Room> {
    return this.http.post<Room>(`${this.baseUrl}/api/Rooms/CreateRoom`, room);
  }

  update(id: number, room: Room): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/Rooms/UpdateRoomById/${id}`, room);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/Rooms/DeleteRoomById/${id}`);
  }
}
