// js for life log

// default to today's date
document.getElementById('date').valueAsDate = new Date();

document.getElementById('change-text-button').addEventListener('click', function() {
    document.getElementById('welcome-message').textContent = 'You clicked the button!';
});

// display number of mindful moments after submitting
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
