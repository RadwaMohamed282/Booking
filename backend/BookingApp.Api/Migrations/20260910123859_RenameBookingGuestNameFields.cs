using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameBookingGuestNameFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestEmail",
                table: "Bookings");

            migrationBuilder.RenameColumn(
                name: "GuestName",
                table: "Bookings",
                newName: "GuestLastName");

            migrationBuilder.AddColumn<string>(
                name: "GuestFirstName",
                table: "Bookings",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestFirstName",
                table: "Bookings");

            migrationBuilder.RenameColumn(
                name: "GuestLastName",
                table: "Bookings",
                newName: "GuestName");

            migrationBuilder.AddColumn<string>(
                name: "GuestEmail",
                table: "Bookings",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}
