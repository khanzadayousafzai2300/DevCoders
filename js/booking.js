
/*
  DevCoders - Project Booking Form
  Sends project requests to the Supabase project_bookings table.
*/

// Find the booking form in project-booking.html
const bookingForm = document.getElementById("projectBookingForm");

// Find the message area used to show success or errors
const formMessage = document.getElementById("formMessage");

// Show a message on the page
function showMessage(message, type) {
  if (!formMessage) {
    alert(message);
    return;
  }

  formMessage.textContent = message;
  formMessage.style.display = "block";

  if (type === "success") {
    formMessage.style.color = "green";
  } else {
    formMessage.style.color = "red";
  }
}

// Check that the form exists
if (!bookingForm) {
  console.error(
    'Booking form not found. Check for id="projectBookingForm" in your HTML.'
  );
} else {
  bookingForm.addEventListener("submit", async function (event) {
    // Stop the page from refreshing when the form is submitted
    event.preventDefault();

    // Check that Supabase is connected
    if (typeof db === "undefined") {
      showMessage(
        "Connection setup is missing. Please check supabase-config.js.",
        "error"
      );
      return;
    }

    // Read a single field from the form
    function getFieldValue(fieldName) {
      const value = new FormData(bookingForm).get(fieldName);

      if (value === null || String(value).trim() === "") {
        return null;
      }

      return String(value).trim();
    }

    // Read checkbox values, such as selected project features
    function getCheckboxValues(fieldName) {
      const formData = new FormData(bookingForm);
      return formData
        .getAll(fieldName)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(", ");
    }

    // Read the page count as a number, if provided
    const pageCountValue = getFieldValue("page_count");
    const pageCount = pageCountValue
      ? Number(pageCountValue)
      : null;

    // Prepare the information to save in Supabase.
    // The field names must match your HTML form and database columns.
    const bookingData = {
      full_name: getFieldValue("full_name"),
      email: getFieldValue("email"),
      phone: getFieldValue("phone"),
      company: getFieldValue("company"),
      project_type: getFieldValue("project_type"),
      purpose: getFieldValue("purpose"),
      page_count: pageCount,
      features: getCheckboxValues("features"),
      description: getFieldValue("description"),
      references_text: getFieldValue("references_text"),
      budget: getFieldValue("budget"),
      start_date: getFieldValue("start_date"),
      deadline: getFieldValue("deadline"),
      urgency: getFieldValue("urgency"),
      notes: getFieldValue("notes")
    };

    // Basic browser-side validation
    if (!bookingData.full_name || !bookingData.email) {
      showMessage(
        "Please enter your name and email address.",
        "error"
      );
      return;
    }

    if (
      pageCount !== null &&
      (!Number.isInteger(pageCount) || pageCount < 1)
    ) {
      showMessage(
        "Page count must be a whole number greater than zero.",
        "error"
      );
      return;
    }

    // Find the submit button so we can prevent duplicate submissions
    const submitButton = bookingForm.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    const originalButtonText = submitButton
      ? submitButton.textContent
      : "";

    if (submitButton) {
      submitButton.disabled = true;

      if (submitButton.tagName === "BUTTON") {
        submitButton.textContent = "Submitting...";
      } else {
        submitButton.value = "Submitting...";
      }
    }

    showMessage("Submitting your project request...", "success");

    try {
      // Save the booking in your Supabase database
      const { error } = await db
        .from("project_bookings")
        .insert([bookingData]);

      if (error) {
        console.error("Supabase booking error:", error);
        throw error;
      }

      // Tell the customer that the request was saved
      showMessage(
        "Thank you! Your project request has been submitted successfully.",
        "success"
      );

      // Clear the form after a successful submission
      bookingForm.reset();
    } catch (error) {
      console.error("Could not submit booking:", error);

      showMessage(
        "Sorry, your request could not be submitted. Please check your connection and try again.",
        "error"
      );
    } finally {
      // Restore the submit button
      if (submitButton) {
        submitButton.disabled = false;

        if (submitButton.tagName === "BUTTON") {
          submitButton.textContent =
            originalButtonText || "Submit Project Request";
        } else {
          submitButton.value =
            originalButtonText || "Submit Project Request";
        }
      }
    }
  });
}
