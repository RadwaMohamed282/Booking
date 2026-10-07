using System.ComponentModel.DataAnnotations;

namespace BookingApp.Api.Models;

public class Amenity
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    public List<Room> Rooms { get; set; } = new();
}
