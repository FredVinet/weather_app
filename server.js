require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();
const port = 3001;

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) console.error("Erreur de connexion à MySQL:", err);
    else console.log("✅ Connecté à MySQL");
});

app.use(cors());
app.use(bodyParser.json());

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Champs requis" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (username, password) VALUES (?, ?)", 
            [username, hashedPassword], 
            (err, result) => {
                if (err) return res.status(500).json({ error: "Erreur SQL" });
                res.status(201).json({ message: "Utilisateur inscrit !" });
            }
        );
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Champs requis" });

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: "Utilisateur non trouvé" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

            const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY_JWT, { expiresIn: "1h" });
            res.json({ message: "Connexion réussie", token, user: { id: user.id, username: user.username }});
    });
});

app.get("/weather", async (req, res) => {
    try {
        const { id, city, country } = req.query;

        if (!city) return res.status(400).json({ error: "Le paramètre 'city' est requis" });

        const geoResponse = await axios.get(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=fr&format=json`
        );
        const geoData = geoResponse.data;

        if (!geoData.results || geoData.results.length === 0) {
            return res.status(404).json({ error: `La ville '${city}' est introuvable.` });
        }

        let selectedLocation;

        if (country) {
            const filteredResults = geoData.results.filter(
                (item) =>
                    item.country.toLowerCase() === country.toLowerCase() ||
                    item.country_code.toLowerCase() === country.toLowerCase()
            );

            if (filteredResults.length > 0) {
                selectedLocation = filteredResults[0];
            } else {
                selectedLocation = geoData.results[0];
            }
        } else {
            selectedLocation = geoData.results[0];
        }

        if (!selectedLocation) {
            return res.status(404).json({
                error: `Impossible de trouver une localisation valide pour '${city}' avec le pays '${country || "?"}'.`
            });
        }

        const { latitude, longitude, country_code } = selectedLocation;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const weatherResponse = await axios.get(weatherUrl);
        const weatherData = weatherResponse.data;

        res.json({
            id: id,
            city: selectedLocation.name,
            country: country_code,
            temperature: weatherData.current_weather.temperature,
            wind_speed: weatherData.current_weather.windspeed,
        });

    } catch (error) {
        console.error("Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.delete("/deleteLocation", async (req, res) => {
    try {
        const { cityId } = req.body;
        
        if (!cityId) {
            return res.status(400).json({ error: "ID de la ville requis." });
        }

        db.query("DELETE FROM locations WHERE id = ?", [cityId], (err, result) => {
            if (err) {
                console.error("Erreur SQL :", err);
                return res.status(500).json({ error: "Erreur SQL" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Ville non trouvée." });
            }
            res.json({ message: "Ville supprimée avec succès." });
        });
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});


app.post("/createLocations", (req, res) => {
    const { token, city, country } = req.body;
    if (!token || !city || !country) return res.status(400).json({ error: "Données manquantes" });

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY_JWT);
        const userId = decoded.id;

        db.query("INSERT INTO locations (user_id, city, country) VALUES (?, ?, ?)", 
            [userId, city, country], 
            (err, result) => {
                if (err) return res.status(500).json({ error: "Erreur SQL" });
                res.status(201).json({ message: "Ville sauvegardée !" });
            }
        );
    } catch (error) {
        res.status(401).json({ error: "Token invalide" });
    }
});

app.get("/getLocations", (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Token requis" });

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY_JWT);
        const userId = decoded.id;

        db.query("SELECT id, city, country FROM locations WHERE user_id = ?", [userId], (err, results) => {
            if (err) return res.status(500).json({ error: "Erreur SQL" });
            res.json(results);
        });
    } catch (error) {
        res.status(401).json({ error: "Token invalide" });
    }
});

app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
