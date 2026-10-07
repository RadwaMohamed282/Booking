using System.ComponentModel.DataAnnotations;

namespace BookingApp.Api.Models;

public class Room
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string RoomNumber { get; set; } = string.Empty;

    [Range(1, 20)]
    public int AdultsCapacity { get; set; }

    [Range(0, 20)]
    public int ChildrenCapacity { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    public List<Booking> Bookings { get; set; } = new();

    public List<Amenity> Amenities { get; set; } = new();
}
