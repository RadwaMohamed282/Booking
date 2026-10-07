using BookingApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Amenity> Amenities => Set<Amenity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Room>()
            .Property(r => r.Price)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Room>()
            .HasIndex(r => r.RoomNumber)
            .IsUnique();

        modelBuilder.Entity<Booking>()
            .Property(b => b.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Room)
            .WithMany(r => r.Bookings)
            .HasForeignKey(b => b.RoomId);

        modelBuilder.Entity<Room>()
            .HasMany(r => r.Amenities)
            .WithMany(a => a.Rooms)
            .UsingEntity(j => j.ToTable("RoomAmenities"));

        modelBuilder.Entity<Amenity>().HasData(
            new Amenity { Id = 1, Name = "Television" },
            new Amenity { Id = 2, Name = "Internet Access" },
            new Amenity { Id = 3, Name = "Hair dryer" },
            new Amenity { Id = 4, Name = "Premium Towels" },
            new Amenity { Id = 5, Name = "Crib" },
            new Amenity { Id = 6, Name = "Safe" }
        );

        // Placeholder rooms — Room.xls was unavailable; replace with real data once found.
        modelBuilder.Entity<Room>().HasData(
            new Room { Id = 1, RoomNumber = "101", AdultsCapacity = 2, ChildrenCapacity = 1, Price = 100m },
            new Room { Id = 2, RoomNumber = "102", AdultsCapacity = 2, ChildrenCapacity = 0, Price = 90m },
            new Room { Id = 3, RoomNumber = "201", AdultsCapacity = 4, ChildrenCapacity = 2, Price = 150m }
        );
    }
}
