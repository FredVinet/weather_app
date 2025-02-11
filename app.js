document.getElementById('createAccountButton').addEventListener('click', createAccount);
document.getElementById('createLocationsButton').addEventListener('click', createLocations);
document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('logoutButton').addEventListener('click', logout);

function login() {
    const username = document.getElementById('usernameInputLog').value.trim();
    const password = document.getElementById('passwordInputLog').value.trim();
    
    if (!username || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Username ou mot de passe incorrect.');
        }
        return response.json();
    })
    .then(data => {
        alert('Vous êtes connecté !');
        
        localStorage.setItem('token', data.token);
        location.reload()
        usernameInputLog.value = '';
        passwordInputLog.value = '';
    })
    .catch(error => {
        showError(error.message);
    });
}

function logout() {
    localStorage.removeItem('token');
    alert('Déconnexion réussie');
}

function createAccount() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    
    if (!username || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de l\'inscription.');
        }
        return response.json();
    })
    .then(data => {
        alert('Compte créé avec succès !');
        usernameInput.value = '';
        passwordInput.value = '';
    })
    .catch(error => {
        showError(error.message);
    });
}

function createLocations() {
    const city = document.getElementById('cityInput').value.trim();
    const country = document.getElementById('countryInput').value.trim();
    
    if (!city || !country) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
        alert('Vous devez être connecté pour ajouter une location');
        return;
    }

    fetch('http://localhost:3001/createLocations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, city, country }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la création de la location.');
        }
        return response.json();
    })
    .then(data => {
        alert('Locations créé avec succès !');
        location.reload()
        cityInput.value = '';
        countryInput.value = '';
    })
    .catch(error => {
        showError(error.message);
    });
}

function fetchWeather() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Vous devez être connecté pour voir la météo');
        return;
    }

    fetch('http://localhost:3001/getLocations', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${token}`
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des villes');
        }
        return response.json();
    })
    .then(locations => {
        if (locations.length === 0) {
            alert("Vous n'avez enregistré aucune ville.");
            return;
        }

        locations.forEach(location => {
            let url = `http://localhost:3001/weather?city=${encodeURIComponent(location.city)}&id=${encodeURIComponent(location.id)}`;
            
            if (location.country) {
                url += `&country=${encodeURIComponent(location.country)}`;
            }

            console.log(url);

            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ville ${location.city}, ${location.country || "??"} non trouvée !`);
                }
                return response.json();
            })
            .then(data => {
                displayCityWeather(data);
            })
            .catch(error => {
                console.error(`Erreur pour ${location.city}, ${location.country || "??"}:`, error.message);
            });
        });
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des locations:', error.message);
    });
}

function displayCityWeather(city) {
    console.log(city)
    const citiesContainer = document.getElementById('citiesContainer');

    const cityDiv = document.createElement('div');
    cityDiv.classList.add('p-5', 'border', 'rounded-xl', 'bg-gradient-to-r', 'from-blue-100', 'to-pink-100', 'shadow-md');

    const cityName = document.createElement('h2');
    cityName.classList.add('text-xl', 'font-semibold');
    cityName.textContent = `${city.city} (${city.country})`;

    const temperature = document.createElement('p');
    temperature.classList.add('text-2xl', 'font-bold');
    temperature.textContent = `${city.temperature}°C`;

    const windSpeed = document.createElement('p');
    windSpeed.textContent = `${city.wind_speed} km/h de vent`;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = "Supprimer";
    deleteButton.classList.add('bg-red-500', 'text-white', 'px-3', 'py-1', 'rounded', 'mt-2', 'block');
    deleteButton.setAttribute("data-id", city.id);
    deleteButton.addEventListener('click', () => deleteCity(city.id));


    cityDiv.appendChild(cityName);
    cityDiv.appendChild(temperature);
    cityDiv.appendChild(windSpeed);
    cityDiv.appendChild(deleteButton);
    
    citiesContainer.appendChild(cityDiv);
}

function deleteCity(cityId) {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Vous devez être connecté pour supprimer une ville.');
        return;
    }

    fetch(`http://localhost:3001/deleteLocation`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${token}`
        },
        body: JSON.stringify({ cityId }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la suppression de la ville.');
        }
        return response.json();
    })
    .then(() => {
        alert('Ville supprimée avec succès.');
        location.reload();
    })
    .catch(error => {
        console.error('Erreur lors de la suppression:', error.message);
    });
}


function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function hideError() {
    const errorElement = document.getElementById('error');
    errorElement.classList.add('hidden');
}

document.addEventListener("DOMContentLoaded", fetchWeather);

