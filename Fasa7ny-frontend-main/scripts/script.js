function showResults() {
  const value = document.getElementById("searchInput").value;

  if (value.trim() === "") {
    alert("Please type a place name first.");
  } else {
    alert("Searching for: " + value);
  }
}
