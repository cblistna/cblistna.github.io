// Create visual indicator element
const indicator = document.createElement("div");
indicator.style.position = "fixed";
indicator.style.bottom = "20px"; // Bottom position
indicator.style.right = "20px"; // Right position
indicator.style.width = "50px"; // Adjust width for text
indicator.style.height = "50px"; // Adjust height for text
indicator.style.borderRadius = "5px"; // Square with rounded corners
indicator.style.backgroundColor = "rgba(96, 165, 250, 0.2)"; // Blue-400 with low opacity
indicator.style.color = "#ffffff"; // White text for better contrast on dark background
indicator.style.display = "none";
indicator.style.fontFamily = "Arial, sans-serif";
indicator.style.fontSize = "14px";
indicator.style.textAlign = "center";
indicator.style.lineHeight = "50px"; // Center text vertically
indicator.title = "Auto-scroll active (Enter to toggle)";
document.body.appendChild(indicator);

let isScrolling = false;
let scrollInterval;
let intervalSeconds = 5; // Initial interval in seconds
const minInterval = 1; // Minimum interval (1 second)
const maxInterval = 10; // Maximum interval (10 seconds)
const step = 1; // Adjustment step in seconds

function autoScroll() {
  const currentPosition = window.pageYOffset + 1; // Add 1 to ensure looping
  const maxPosition =
    document.documentElement.scrollHeight - window.innerHeight;

  if (currentPosition >= maxPosition) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  }
}

function toggleScroll() {
  if (isScrolling) {
    clearInterval(scrollInterval);
    indicator.style.display = "none";
  } else {
    scrollInterval = setInterval(autoScroll, intervalSeconds * 1000);
    indicator.textContent = `${intervalSeconds}s`; // Update indicator text
    indicator.style.display = "block";
  }
  isScrolling = !isScrolling;
}

function adjustInterval(direction) {
  const newInterval =
    direction === "-" ? intervalSeconds - step : intervalSeconds + step;

  intervalSeconds = Math.min(Math.max(newInterval, minInterval), maxInterval);

  if (isScrolling) {
    clearInterval(scrollInterval);
    scrollInterval = setInterval(autoScroll, intervalSeconds * 1000);
  }

  // Update the displayed interval value in the indicator
  indicator.textContent = `${intervalSeconds}s`;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Use Enter key for toggling
    e.preventDefault();
    toggleScroll();
  }

  if (["+", "-"].includes(e.key)) {
    e.preventDefault();
    adjustInterval(e.key);
  }
});
