import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-room-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-form.component.html',
  styleUrl: './room-form.component.css',
})
export class RoomFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roomService = inject(RoomService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private roomId: number | null = null;

  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly pageTitle = signal('Add Room');

  readonly form = this.fb.nonNullable.group({
    roomNumber: ['', [Validators.required, Validators.maxLength(20)]],
    adultsCapacity: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    childrenCapacity: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    this.roomId = Number(idParam);
    this.loading.set(true);
    this.roomService.getById(this.roomId).subscribe({
      next: (room) => {
        this.loading.set(false);
        if (!room) {
          this.notFound.set(true);
          return;
        }
        this.pageTitle.set(`Room ${room.roomNumber}`);
        this.form.patchValue(room);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const value = this.form.getRawValue();

    if (this.roomId) {
      this.roomService.update(this.roomId, { id: this.roomId, ...value }).subscribe({
        next: () => {
          this.router.navigate(['/rooms']);
        },
        error: (err: { status?: number }) => this.handleSaveError(err),
      });
    } else {
      this.roomService.create({ id: 0, ...value }).subscribe({
        next: () => {
          this.router.navigate(['/rooms']);
        },
        error: (err: { status?: number }) => this.handleSaveError(err),
      });
    }
  }

  private handleSaveError(err: { status?: number }): void {
    this.submitting.set(false);
    this.submitError.set(
      err?.status === 409 ? 'A room with this number already exists.' : 'Something went wrong. Please try again.'
    );
  }
}
