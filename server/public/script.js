// Script js
// Contains all javascript logic to gather data from UI, display data as it changes, and make api calls to the server

// Constants
const dateInput = document.getElementById('date');
const drinksInput = document.getElementById('number-of-drinks');
const mindfulnessInput = document.getElementById('number-of-mindful-moments');
const sleepInput = document.getElementById('number-of-sleep');
const feelingInput = document.getElementById('text-of-feeling');
const energySlider = document.getElementById('rating-of-energy');
const energyRating = document.getElementById('energyRating');

// Default to today's date
dateInput.valueAsDate = new Date();

// Helper Functions
function displayMessage(elementId, message) {
  document.getElementById(elementId).textContent = message;
}

function clearInputFields() {
  drinksInput.value = drinksInput.defaultValue;
  mindfulnessInput.value = mindfulnessInput.defaultValue;
  sleepInput.value = sleepInput.defaultValue;
  feelingInput.value = feelingInput.defaultValue;
  energySlider.value = energySlider.defaultValue;
  energyRating.innerHTML = energySlider.value;
  document.querySelectorAll('input[name="answer-of-satisfaction"]').forEach(option => option.checked = false);
  //let satisfactionOptions = document.getElementsByName("answer-of-satisfaction");
  //satisfactionOptions.forEach((option) => option.checked = false);
}

function populateInputFieldsWithData(data) {
  console.log(data);
  drinksInput.value = data.drinks;
  mindfulnessInput.value = data.mindfulness;
  sleepInput.value = data.sleep;
  feelingInput.value = data.feeling;
  energySlider.value = data.energy;
  energyRating.innerHTML = data.energy;
  document.getElementById(`satisfaction-${data.satisfaction}`).checked = true;
}

// Fetch and display entries
function fetchEntries() {
  fetch('/entries')
    .then(response => response.json())
    .then(entries => {
      const entriesList = document.getElementById('entriesList');
      entriesList.innerHTML = ''; // Clear existing entries

      entries.forEach(entry => {
        const entryItem = document.createElement('li');
        entryItem.textContent = `${entry.date}: ${entry.sleep}`;
        entriesList.appendChild(entryItem);
      });
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Failed to load entries.');
    });
}

function fetchEntryForDate(date) {
  fetch('/get-entry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({date})
  })
  .then(response => response.text())
  .then(entry => {
    // if no row was found for the date, clear the input fields for that date
    if (!entry) {
      console.log('not entry found for date.');
      clearInputFields();
      return;
    }

    // Try to parse the response as JSON
    try {
      const data = JSON.parse(entry);
      console.log(data);
      // display data for date in input fields
      populateInputFieldsWithData(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  })
  .catch(error => {
    clearInputFields();
    console.error('Error:', error);
    alert(`Failed to get entry for date: ${date}`);
  });
}

// Event Listeners
document.getElementById('change-text-button').addEventListener('click', () => {
    displayMessage('welcome-message', 'You clicked the button!');
});

// display number of drinks after submitting
document.getElementById('drink-form').addEventListener('submit', event => {
    event.preventDefault(); // Prevents form from submitting the traditional way
    displayMessage('drinksResult', `You have consumed ${drinksInput.value} drinks today.`);
});

// display number of mindful moments after submitting
document.getElementById('mindfulness-form').addEventListener('submit', function(event) {
    event.preventDefault();
    displayMessage('mindfulResult', `You had ${mindfulnessInput.value} mindful moments today.`);
});

// display number of hours of sleep after submitting
document.getElementById('sleep-form').addEventListener('submit', function(event) {
    event.preventDefault();
    displayMessage('sleepResult', `You slept for ${sleepInput.value} hours last night.`);
});

// display overall feeling text after submitting
document.getElementById('overall-feeling-form').addEventListener('submit', function(event) {
    event.preventDefault();
    displayMessage('feelingResult', `You entered: ${feelingInput.value}`);
});

/*
// update energy rating bar value text on input change
energyRating.innerHTML = energySlider.value;

// Update the current slider value (each time you drag the slider handle)
energySlider.oninput = function() {
    energyRating.innerHTML = this.value;
}*/

// update energy rating bar value text on input change
energyRating.innerHTML = energySlider.value;
energySlider.addEventListener('input', () => {
  energyRating.textContent = energySlider.value;
});

// display energy rating after submitting
document.getElementById('energy-form').addEventListener('submit', function(event) {
    event.preventDefault();
    displayMessage('energyResult', `You rated today's energy as a ${energySlider.value}.`);
})

// display satisfaction with today after submitting
document.getElementById('satisfaction-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const satisfaction = document.querySelector('input[name="answer-of-satisfaction"]:checked').value;
    displayMessage('satisfactionResult', `Your answer to if you were satisfied with today: ${satisfaction}.`);
})

dateInput.addEventListener('change', () => {
  const date = dateInput.valueAsDate.toISOString();
  // get data for date
  fetchEntryForDate(date);
});

// Handle button click to add entry data to database
document.getElementById('addEntryButton').addEventListener('click', () => {
  //const data = "Sample data"; // Replace this with actual data if needed
  //const date = new Date().toISOString(); // Get today's date in ISO format
  const date = dateInput.valueAsDate.toISOString();
  const drinks = drinksInput.value;
  const mindfulness = mindfulnessInput.value;
  const sleep = sleepInput.value;
  const feeling = feelingInput.value;
  const energy = energySlider.value;
  const satisfaction = document.querySelector('input[name="answer-of-satisfaction"]:checked').value;
  //const data = {drinks, mindfulness, sleep, feeling, energy, satisfaction};

  fetch('/add-entry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, drinks, mindfulness, sleep, feeling, energy, satisfaction })
  })
  .then(response => response.json())
  .then(result => {
    console.log('Success:', result);
    alert('Entry added successfully!');
    fetchEntries(); // Reload entries to include the new entry
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Failed to add entry.');
  });
});

// on page loaded -> display db contents at bottom
document.addEventListener('DOMContentLoaded', () => {
  // Load entries when the page is loaded
  //fetchEntries();
  const date = dateInput.valueAsDate.toISOString();
  // get data for date
  fetchEntryForDate(date);
});
