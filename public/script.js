// js for life log

// default to today's date
document.getElementById('date').valueAsDate = new Date();

document.getElementById('change-text-button').addEventListener('click', function() {
    document.getElementById('welcome-message').textContent = 'You clicked the button!';
});

// display number of drinks after submitting
document.getElementById('drink-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents form from submitting the traditional way

    const numberOfDrinks = document.getElementById('number-of-drinks').value;
    document.getElementById('drinksResult').textContent = `You have consumed ${numberOfDrinks} drinks today.`;
});

// display number of mindful moments after submitting
document.getElementById('mindfulness-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const numberOfMindfulMoments = document.getElementById('number-of-mindful-moments').value;
    document.getElementById('mindfulResult').textContent = `You had ${numberOfMindfulMoments} mindful moments today.`;
});

// display number of hours of sleep after submitting
document.getElementById('sleep-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const numberOfHoursSleep = document.getElementById('number-of-sleep').value;
    document.getElementById('sleepResult').textContent = `You slept for ${numberOfHoursSleep} hours last night.`;
});

// display overall feeling text after submitting
document.getElementById('overall-feeling-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const textOverallFeeling = document.getElementById('text-of-feeling').value;
    document.getElementById('feelingResult').textContent = `You entered: ${textOverallFeeling}`;
});

// update energy rating bar value text on input change
var energySlider = document.getElementById('rating-of-energy');
var energyRating = document.getElementById('energyRating');

energyRating.innerHTML = energySlider.value;

// Update the current slider value (each time you drag the slider handle)
energySlider.oninput = function() {
    energyRating.innerHTML = this.value;
}

// display energy rating after submitting
document.getElementById('energy-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const ratingOfEnergy = document.getElementById('rating-of-energy').value;
    document.getElementById('energyResult').textContent = `You rated today's energy as a ${ratingOfEnergy}.`;
})

// display satisfaction with today after submitting
document.getElementById('satisfaction-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const satisfactionWithToday = document.querySelector('input[name="answer-of-satisfaction"]:checked').value;
    document.getElementById('satisfactionResult').textContent = `Your answer to if you were satisfied with today: ${satisfactionWithToday}.`;
})

// on page loaded -> display db contents at bottom
document.addEventListener('DOMContentLoaded', () => {
  // Function to fetch and display entries
  function loadEntries() {
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

  // Load entries when the page is loaded
  loadEntries();

  document.getElementById('date').addEventListener('change', () => {
    const date = document.getElementById('date').valueAsDate.toISOString();

    // get data for date
    fetch('/get-entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({date})
    })
    .then(response => response.json())
    .then(entry => {
      console.log(entry);
      populateInputFieldsWithData(entry);
    })
    .catch(error => {
      clearInputFields();
      console.error('Error:', error);
      alert(`Failed to get entry for date: ${date}`);
    });

  });

  function populateInputFieldsWithData(data) {
    console.log(data);
    console.log(data.value);
    console.log(data.drinks);
    document.getElementById('number-of-drinks').value = data.drinks;
    document.getElementById('number-of-mindful-moments').value = data.mindfulness;
    document.getElementById('number-of-sleep').value = data.sleep;
    document.getElementById('text-of-feeling').value = data.feeling;
    document.getElementById('rating-of-energy').value = data.energy;
    document.getElementById('energyRating').innerHTML = data.energy;
    document.getElementById(`satisfaction-${data.satisfaction}`).checked = true;
  }

  function clearInputFields() {
    console.log(document.getElementById('number-of-drinks').defaultValue);
    document.getElementById('number-of-drinks').value = document.getElementById('number-of-drinks').defaultValue;
    document.getElementById('number-of-mindful-moments').value = document.getElementById('number-of-mindful-moments').defaultValue;
    document.getElementById('number-of-sleep').value = document.getElementById('number-of-sleep').defaultValue;
    document.getElementById('text-of-feeling').value = document.getElementById('text-of-feeling').defaultValue;
    document.getElementById('rating-of-energy').value = document.getElementById('rating-of-energy').defaultValue;
    document.getElementById('energyRating').innerHTML = energySlider.value;
    //document.getElementById(`satisfaction-${data.satisfaction}`).checked = true;
    let satisfactionOptions = document.getElementsByName("answer-of-satisfaction");
    satisfactionOptions.forEach((option) => option.checked = false);
    /*for (let i = 0; i < satisfactionOptions.length; i++) {
      satisfactionOptions[i].checked = false;
    }*/
  }

  // Handle button click to add entry data to database
  document.getElementById('addEntryButton').addEventListener('click', () => {
    //const data = "Sample data"; // Replace this with actual data if needed
    //const date = new Date().toISOString(); // Get today's date in ISO format
    const date = document.getElementById('date').valueAsDate.toISOString();
    const drinks = document.getElementById('number-of-drinks').value;
    const mindfulness = document.getElementById('number-of-mindful-moments').value;
    const sleep = document.getElementById('number-of-sleep').value;
    const feeling = document.getElementById('text-of-feeling').value;
    const energy = document.getElementById('rating-of-energy').value;
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
      loadEntries(); // Reload entries to include the new entry
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Failed to add entry.');
    });
  });
});
