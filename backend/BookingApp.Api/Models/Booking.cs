using System.ComponentModel.DataAnnotations;

namespace BookingApp.Api.Models;

public enum BookingStatus
{
    Booked,
    CheckedIn,
    CheckedOut,
    Canceled
}

public class Booking : IValidatableObject
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string GuestFirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string GuestLastName { get; set; } = string.Empty;

    [Required]
    public DateOnly CheckInDate { get; set; }

    [Required]
    public DateOnly CheckOutDate { get; set; }

    [Range(1, 20)]
    public int NumberOfAdults { get; set; }

    [Range(0, 20)]
    public int NumberOfChildren { get; set; }

    [Required]
    public int RoomId { get; set; }

    public Room? Room { get; set; }

    [Required]
    public BookingStatus Status { get; set; } = BookingStatus.Booked;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CheckOutDate <= CheckInDate)
        {
            yield return new ValidationResult(
                "Check-out date must be after check-in date.",
                new[] { nameof(CheckOutDate) });
        }
    }
}
