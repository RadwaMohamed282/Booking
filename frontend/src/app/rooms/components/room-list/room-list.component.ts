import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Room } from '../../models/room.model';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-room-list',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './room-list.component.html',
  styleUrl: './room-list.component.css',
})
export class RoomListComponent implements OnInit {
  private readonly roomService = inject(RoomService);

  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading.set(true);
    this.error.set(false);
    this.roomService.getAll().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  adultsLabel(room: Room): string {
    return `${room.adultsCapacity} Adult${room.adultsCapacity === 1 ? '' : 's'}`;
  }

  childrenLabel(room: Room): string {
    return `${room.childrenCapacity} Child${room.childrenCapacity === 1 ? '' : 'ren'}`;
  }

  deleteRoom(room: Room): void {
    if (!confirm(`Delete Room ${room.roomNumber}?`)) {
      return;
    }
    this.roomService.delete(room.id).subscribe(() => this.loadRooms());
  }

  exportCsv(): void {
    const header = ['Room Number', 'Adults Capacity', 'Children Capacity', 'Price per Night'];
    const rows = this.rooms().map((room) => [
      room.roomNumber,
      String(room.adultsCapacity),
      String(room.childrenCapacity),
      String(room.price),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rooms.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvValue(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }
}
