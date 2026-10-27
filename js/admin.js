
/*
  DevCoders Admin Dashboard
  Uses the existing Supabase client from supabase-config.js.
*/

// IMPORTANT: Use the same email as in the SQL policies.
const ADMIN_EMAIL = "officialprogamer889@gmail.com";

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const bookingTableBody = document.getElementById("bookingTableBody");
const bookingCount = document.getElementById("bookingCount");

const bookingDetails = document.getElementById("bookingDetails");
const detailsContent = document.getElementById("detailsContent");

const statuses = ["New", "In Progress", "Completed", "Cancelled"];

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#ff9a9a" : "#a7f3d0";
}

function showLogin() {
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent =
    text === null || text === undefined || text === ""
      ? "—"
      : String(text);
  return cell;
}

function makeDetailLine(label, value) {
  const paragraph = document.createElement("p");
  const strong = document.createElement("strong");

  strong.textContent = label + ": ";
  paragraph.appendChild(strong);
  paragraph.appendChild(
    document.createTextNode(
      value === null || value === undefined || value === ""
        ? "—"
        : String(value)
    )
  );

  return paragraph;
}

// Load bookings from Supabase
async function loadBookings() {
  bookingTableBody.replaceChildren();
  bookingCount.textContent = "Loading bookings...";

  try {
    const { data, error } = await db
      .from("project_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    bookingCount.textContent =
      `${data.length} booking(s) found.`;

    if (data.length === 0) {
      const row = document.createElement("tr");
      const cell = makeCell("No project bookings yet.");
      cell.colSpan = 6;
      row.appendChild(cell);
      bookingTableBody.appendChild(row);
      return;
    }

    data.forEach((booking) => {
      const row = document.createElement("tr");

      // Customer name and details button
      const customerCell = makeCell(booking.full_name);
      const detailsButton = document.createElement("button");
      detailsButton.type = "button";
      detailsButton.textContent = "View Details";
      detailsButton.addEventListener("click", () => {
        showBookingDetails(booking);
      });
      customerCell.appendChild(document.createElement("br"));
      customerCell.appendChild(detailsButton);
      row.appendChild(customerCell);

      // Contact information
      row.appendChild(
        makeCell(
          [booking.email, booking.phone]
            .filter(Boolean)
            .join("\n")
        )
      );

      row.appendChild(
        makeCell(
          [booking.project_type, booking.purpose]
            .filter(Boolean)
            .join(" — ")
        )
      );

      row.appendChild(makeCell(booking.budget));
      row.appendChild(makeCell(booking.deadline));

      // Status selector
      const statusCell = document.createElement("td");
      const statusSelect = document.createElement("select");

      statuses.forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        statusSelect.appendChild(option);
      });

      const currentStatus = statuses.includes(booking.status)
        ? booking.status
        : "New";

      statusSelect.value = currentStatus;

      statusSelect.addEventListener("change", async () => {
        const newStatus = statusSelect.value;
        statusSelect.disabled = true;

        const { error: updateError } = await db
          .from("project_bookings")
          .update({ status: newStatus })
          .eq("id", booking.id);

        statusSelect.disabled = false;

        if (updateError) {
          console.error("Status update failed:", updateError);
          showMessage(
            "Could not update booking status. Check your database status column and RLS policies.",
            true
          );
          statusSelect.value = currentStatus;
          return;
        }

        booking.status = newStatus;
        showMessage("Booking status updated.");
      });

      statusCell.appendChild(statusSelect);
      row.appendChild(statusCell);

      bookingTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Could not load bookings:", error);
    bookingCount.textContent = "Bookings could not be loaded.";
    showMessage(
      "Unable to load bookings. Check your admin email, database permissions, and browser console.",
      true
    );
  }
}

// Show the full information for one booking
function showBookingDetails(booking) {
  detailsContent.replaceChildren();

  const fields = [
    ["Customer", booking.full_name],
    ["Email", booking.email],
    ["Phone", booking.phone],
    ["Company", booking.company],
    ["Project Type", booking.project_type],
    ["Purpose", booking.purpose],
    ["Page Count", booking.page_count],
    ["Features", booking.features],
    ["Description", booking.description],
    ["Reference Links", booking.references_text],
    ["Budget", booking.budget],
    ["Start Date", booking.start_date],
    ["Deadline", booking.deadline],
    ["Urgency", booking.urgency],
    ["Additional Notes", booking.notes],
    ["Status", booking.status],
    ["Submitted At", booking.created_at]
  ];

  fields.forEach(([label, value]) => {
    detailsContent.appendChild(makeDetailLine(label, value));
  });

  bookingDetails.hidden = false;
  bookingDetails.scrollIntoView({ behavior: "smooth" });
}

// Sign in
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (typeof db === "undefined") {
    showMessage(
      "Supabase is not configured. Check supabase-config.js.",
      true
    );
    return;
  }

  const email = document
    .getElementById("adminEmail")
    .value.trim();

  const password = document.getElementById("adminPassword").value;

  loginButton.disabled = true;
  showMessage("Signing in...");

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Convenience check for the dashboard UI.
    // Database RLS policies are the actual security boundary.
    if (
      !data.user ||
      data.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
      await db.auth.signOut();
      throw new Error(
        "This account is not the designated admin account. Check ADMIN_EMAIL in admin.js."
      );
    }

    loginForm.reset();
    showDashboard();
    showMessage("Signed in successfully.");
    await loadBookings();
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    showLogin();
    showMessage(error.message || "Sign-in failed.", true);
  } finally {
    loginButton.disabled = false;
  }
});

// Refresh the booking list
document
  .getElementById("refreshButton")
  .addEventListener("click", loadBookings);

// Sign out
document
  .getElementById("logoutButton")
  .addEventListener("click", async () => {
    const { error } = await db.auth.signOut();

    if (error) {
      showMessage("Could not sign out. Please try again.", true);
      return;
    }

    showLogin();
    bookingTableBody.replaceChildren();
    bookingCount.textContent = "Sign in to load bookings.";
    bookingDetails.hidden = true;
    showMessage("You have signed out.");
  });

// Close booking details
document
  .getElementById("closeDetailsButton")
  .addEventListener("click", () => {
    bookingDetails.hidden = true;
  });

// Restore a valid existing admin session after refreshing the page
async function restoreSession() {
  if (typeof db === "undefined") {
    showMessage(
      "Supabase is not configured. Check supabase-config.js.",
      true
    );
    return;
  }

  const { data, error } = await db.auth.getSession();

  if (error) {
    showMessage("Could not check your login session.", true);
    return;
  }

  const user = data.session?.user;

  if (!user) {
    showLogin();
    return;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await db.auth.signOut();
    showLogin();
    showMessage("This account is not the designated admin account.", true);
    return;
  }

  showDashboard();
  await loadBookings();
}

restoreSession();
